const express = require("express");
const Bag = require("../models/Bag");
const Order = require("../models/Order");
const router = express.Router();
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const auditService = require("../services/auditService");
const { emitOrderCreated, emitPaymentConfirmed, emitOrderShipped } = require("../services/notificationEvents");

function genrateRandomTracking() {
  const carriers = ["Delhivery", "Bluedart", "Ecom Express", "XpressBees"];
  const statusOptions = [
    "Shipped",
    "Out for Delivery",
    "Delivered",
    "In Transit",
  ];
  const locations = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune"];
  const randomcarrier = carriers[Math.floor(Math.random() * carriers.length)];
  const randomstatusOptions =
    statusOptions[Math.floor(Math.random() * statusOptions.length)];
  const randomlocations =
    locations[Math.floor(Math.random() * locations.length)];

  return {
    number: "TRK" + Math.floor(Math.random() * 10000000),
    carrier: randomcarrier,
    estimatedDelivery: new Date(
      Date.now() + 5 * 24 * 60 * 60 * 1000
    ).toISOString(),
    currentLocation: randomlocations,
    status: randomstatusOptions,
    timeline: [
      {
        status: "Order placed",
        location: "Warehouse",
        timestamp: new Date().toISOString(),
      },
      {
        status: randomstatusOptions,
        location: randomlocations,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
const Cart = require("../models/Cart");
const CartItem = require("../models/CartItem");
const Product = require("../models/Product");

router.post("/create/:userId", async (req, res) => {
  const userid = req.params.userId;
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();

    // 1. Fetch Cart
    const cart = await Cart.findOne({ userId: userid }).session(session);
    if (!cart) {
      return res.status(400).json({ message: "No active cart found for this user." });
    }

    // 2. Fetch CartItems
    const items = await CartItem.find({ cartId: cart._id }).session(session);
    if (items.length === 0) {
      return res.status(400).json({ message: "No items in the active cart." });
    }

    const orderitem = [];
    let total = 0;

    // 3. Validate and Deduct Stock Inside Transaction
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product || product.status !== "active") {
        throw new Error(`Product discontinued or inactive: ${item.productNameAtAdded}`);
      }
      if (product.price !== item.priceAtAdded) {
        throw new Error(`Price changed for ${item.productNameAtAdded}. Current: ₹${product.price}, Cart: ₹${item.priceAtAdded}`);
      }
      if (item.quantity > product.stock) {
        throw new Error(`Insufficient stock for ${item.productNameAtAdded}. Stock: ${product.stock}, Cart: ${item.quantity}`);
      }

      // Deduct stock
      product.stock -= item.quantity;
      await product.save({ session });
      if (product.stock <= 0) {
        try {
          const recommendationService = require("../services/recommendationService");
          await recommendationService.invalidateProduct(product._id);
        } catch (e) {
          console.error("Cache invalidation failed: ", e);
        }
      }

      orderitem.push({
        productId: item.productId,
        size: item.size,
        price: product.price,
        quantity: item.quantity,
      });

      // Correct arithmetic total: price * quantity
      total += product.price * item.quantity;
    }

    const tracking = genrateRandomTracking();
    const newOrder = new Order({
      userId: userid,
      date: new Date().toISOString(),
      status: "Processing",
      items: orderitem,
      total: total,
      shippingAddress: req.body.shippingAddress || "123 Main Street, Apt 4B, New York, NY, 10001",
      paymentMethod: req.body.paymentMethod || "Card",
      tracking: tracking,
    });
    await newOrder.save({ session });

    // Clear active cart items
    await CartItem.deleteMany({ cartId: cart._id }, { session });

    // Create Transaction Record
    const method = req.body.paymentMethod || "Card";
    let status = "Paid";
    let responseCode = "SUCCESS";
    if (method === "COD") {
      status = "Created";
      responseCode = "PENDING";
    }

    const gateway = method === "Card" ? "Stripe" : (method === "Google Pay" || method === "UPI" ? "Razorpay" : "None");
    const gatewayTransactionId = gateway !== "None" ? `pay_${Math.random().toString(36).substring(2, 12)}` : null;

    const newTxn = new Transaction({
      userId: userid,
      transactionId: `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceId: `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${newOrder._id.toString().substring(18)}`,
      amount: total,
      currency: "INR",
      gateway,
      gatewayTransactionId,
      gatewayResponseCode: responseCode,
      paymentMethod: method,
      status: status,
      dateTime: new Date(),
      metadata: { orderId: newOrder._id }
    });
    await newTxn.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Log audit log (non-blocking)
    await auditService.logEvent(newTxn._id, status, `User: ${userid}`, { action: "order_checkout", orderId: newOrder._id });

    // Emit notification events
    emitOrderCreated(userid, newOrder._id, total);
    emitPaymentConfirmed(userid, total, method);

    if (tracking.status === "Shipped" || tracking.status === "In Transit") {
      emitOrderShipped(userid, newOrder._id, tracking.number);
    }

    // Invalidate user recommendation cache
    try {
      const RecommendationCache = require("../models/RecommendationCache");
      await RecommendationCache.deleteMany({ userId: userid });
    } catch (e) {
      console.error("User cache invalidation failed: ", e);
    }

    res.status(200).json({ message: "Order placed successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Fallback for local mongo instance (no replica set transaction support)
    if (error.message.includes("replica set") || error.message.includes("Transaction")) {
      try {
        const cart = await Cart.findOne({ userId: userid });
        if (!cart) return res.status(400).json({ message: "No active cart found for this user." });

        const items = await CartItem.find({ cartId: cart._id });
        if (items.length === 0) return res.status(400).json({ message: "No items in the active cart." });

        const orderitem = [];
        let total = 0;

        // Step 1: Pre-validate all items to prevent half-updates
        for (const item of items) {
          const product = await Product.findById(item.productId);
          if (!product || product.status !== "active") {
            return res.status(409).json({ message: `Product is discontinued or inactive: ${item.productNameAtAdded}`, code: "DISCONTINUED" });
          }
          if (product.price !== item.priceAtAdded) {
            return res.status(409).json({ message: `Price changed for ${item.productNameAtAdded}. Current: ₹${product.price}, Cart: ₹${item.priceAtAdded}`, code: "PRICE_CHANGED" });
          }
          if (item.quantity > product.stock) {
            return res.status(409).json({ message: `Insufficient stock for ${item.productNameAtAdded}. Stock: ${product.stock}, Cart: ${item.quantity}`, code: "OUT_OF_STOCK" });
          }
        }

        // Step 2: Deduct stock and populate order item list
        for (const item of items) {
          const product = await Product.findById(item.productId);
          product.stock -= item.quantity;
          await product.save();
          if (product.stock <= 0) {
            try {
              const recommendationService = require("../services/recommendationService");
              await recommendationService.invalidateProduct(product._id);
            } catch (e) {
              console.error("Cache invalidation failed: ", e);
            }
          }

          orderitem.push({
            productId: item.productId,
            size: item.size,
            price: product.price,
            quantity: item.quantity,
          });
          total += product.price * item.quantity;
        }

        const tracking = genrateRandomTracking();
        const newOrder = new Order({
          userId: userid,
          date: new Date().toISOString(),
          status: "Processing",
          items: orderitem,
          total: total,
          shippingAddress: req.body.shippingAddress || "123 Main Street, Apt 4B, New York, NY, 10001",
          paymentMethod: req.body.paymentMethod || "Card",
          tracking: tracking,
        });
        await newOrder.save();

        // Clear active cart
        await CartItem.deleteMany({ cartId: cart._id });

        // Create transaction
        const method = req.body.paymentMethod || "Card";
        let status = "Paid";
        let responseCode = "SUCCESS";
        if (method === "COD") {
          status = "Created";
          responseCode = "PENDING";
        }
        const gateway = method === "Card" ? "Stripe" : (method === "Google Pay" || method === "UPI" ? "Razorpay" : "None");
        const gatewayTransactionId = gateway !== "None" ? `pay_${Math.random().toString(36).substring(2, 12)}` : null;

        const newTxn = new Transaction({
          userId: userid,
          transactionId: `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          invoiceId: `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${newOrder._id.toString().substring(18)}`,
          amount: total,
          currency: "INR",
          gateway,
          gatewayTransactionId,
          gatewayResponseCode: responseCode,
          paymentMethod: method,
          status: status,
          dateTime: new Date(),
          metadata: { orderId: newOrder._id }
        });
        await newTxn.save();

        await auditService.logEvent(newTxn._id, status, `User: ${userid}`, { action: "order_checkout", orderId: newOrder._id });
        emitOrderCreated(userid, newOrder._id, total);
        emitPaymentConfirmed(userid, total, method);

        if (tracking.status === "Shipped" || tracking.status === "In Transit") {
          emitOrderShipped(userid, newOrder._id, tracking.number);
        }

        // Invalidate user recommendation cache
        try {
          const RecommendationCache = require("../models/RecommendationCache");
          await RecommendationCache.deleteMany({ userId: userid });
        } catch (e) {
          console.error("User cache invalidation failed: ", e);
        }

        return res.status(200).json({ message: "Order placed successfully" });
      } catch (fallbackErr) {
        console.error("Fallback checkout execution failed:", fallbackErr);
        return res.status(500).json({ message: fallbackErr.message || "Checkout failed" });
      }
    }

    console.error("Hardened checkout failed:", error);
    res.status(409).json({ message: error.message });
  }
});
router.get("/user/:userid", async (req, res) => {
  try {
    const order = await Order.find({ userId: req.params.userid }).populate(
      "items.productId"
    );
    res.status(200).json(order);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});
module.exports = router;