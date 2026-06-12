const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const CartItem = require("../models/CartItem");
const Product = require("../models/Product");
const { emitCartItemAdded } = require("../services/notificationEvents");

// Helper to get or create cart
async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({ userId });
    await cart.save();
  }
  return cart;
}

// POST /bag (Add to cart)
router.post("/", async (req, res) => {
  try {
    const { userId, productId, size, quantity = 1 } = req.body;
    if (!userId || !productId || !size) {
      return res.status(400).json({ message: "userId, productId, and size are required." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    if (product.isDiscontinued) {
      return res.status(400).json({ message: "Product is discontinued." });
    }

    // Check stock
    const cart = await getOrCreateCart(userId);
    const existingItem = await CartItem.findOne({ cartId: cart._id, productId, size });
    const targetQty = (existingItem ? existingItem.quantity : 0) + Number(quantity);

    if (targetQty > product.stock) {
      return res.status(409).json({ message: `Requested quantity exceeds available stock (${product.stock}).` });
    }

    // Atomic insert/update
    const cartItem = await CartItem.findOneAndUpdate(
      { cartId: cart._id, productId, size },
      {
        $inc: { quantity: Number(quantity) },
        $setOnInsert: {
          priceAtAdded: product.price,
          productNameAtAdded: product.name,
          productImageAtAdded: product.images[0] || "",
          brandAtAdded: product.brand || "",
          version: 0
        }
      },
      { upsert: true, new: true }
    );

    // Emit cart abandonment event (kept for notifications functionality)
    try {
      emitCartItemAdded(userId, product.name || "");
    } catch (e) {
      emitCartItemAdded(userId, "");
    }

    // Map to old Bag format
    const responseItem = {
      _id: cartItem._id,
      userId: userId,
      productId: productId,
      size: cartItem.size,
      quantity: cartItem.quantity
    };

    res.status(200).json(responseItem);
  } catch (error) {
    console.error("Error adding to bag:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

// GET /bag/:userid (Get bag items)
router.get("/:userid", async (req, res) => {
  try {
    const { userid } = req.params;
    const cart = await Cart.findOne({ userId: userid });
    if (!cart) {
      return res.status(200).json([]);
    }

    const items = await CartItem.find({ cartId: cart._id }).populate("productId");
    
    // Map items to match what client expects (with userId property)
    const responseItems = items.map(item => ({
      _id: item._id,
      userId: userid,
      productId: item.productId,
      size: item.size,
      quantity: item.quantity,
      priceAtAdded: item.priceAtAdded,
      productNameAtAdded: item.productNameAtAdded,
      productImageAtAdded: item.productImageAtAdded,
      brandAtAdded: item.brandAtAdded,
      version: item.version
    }));

    res.status(200).json(responseItems);
  } catch (error) {
    console.error("Error fetching bag:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

// DELETE /bag/:itemid (Remove from bag)
router.delete("/:itemid", async (req, res) => {
  try {
    const deleted = await CartItem.findByIdAndDelete(req.params.itemid);
    res.status(200).json({ message: "Item removed from bag" });
  } catch (error) {
    console.error("Error deleting from bag:", error);
    return res.status(500).json({ message: "Error removing item from bag" });
  }
});

module.exports = router;

