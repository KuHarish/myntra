const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const CartItem = require("../models/CartItem");
const SavedItem = require("../models/SavedItem");
const Product = require("../models/Product");

// Helper to get or create cart
async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({ userId });
    await cart.save();
  } else {
    // Update activity
    cart.lastActivityAt = new Date();
    await cart.save();
  }
  return cart;
}

exports.getCart = async (req, res) => {
  try {
    const { userId } = req.params;
    const cart = await getOrCreateCart(userId);

    const activeItems = await CartItem.find({ cartId: cart._id }).populate("productId");
    const savedItems = await SavedItem.find({ cartId: cart._id }).populate("productId");

    return res.status(200).json({ activeItems, savedItems });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return res.status(500).json({ message: "Error fetching cart details." });
  }
};

exports.getCartSummary = async (req, res) => {
  try {
    const { userId } = req.params;
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(200).json({ itemCount: 0, subtotal: 0, savedCount: 0 });
    }

    const activeItems = await CartItem.find({ cartId: cart._id });
    const savedItems = await SavedItem.find({ cartId: cart._id });

    const itemCount = activeItems.reduce((sum, item) => sum + item.quantity, 0);
    const savedCount = savedItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = activeItems.reduce((sum, item) => sum + item.quantity * item.priceAtAdded, 0);

    return res.status(200).json({ itemCount, subtotal, savedCount });
  } catch (error) {
    console.error("Error fetching cart summary:", error);
    return res.status(500).json({ message: "Error fetching cart summary." });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { userId, productId, size, quantity = 1 } = req.body;
    if (!userId || !productId || !size) {
      return res.status(400).json({ message: "userId, productId, and size are required." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    if (product.status !== "active") {
      return res.status(400).json({ message: "Cannot add inactive or discontinued product to cart." });
    }

    const cart = await getOrCreateCart(userId);

    // Concurrency check: check existing item quantity
    const existingItem = await CartItem.findOne({ cartId: cart._id, productId, size });
    const targetQty = (existingItem ? existingItem.quantity : 0) + Number(quantity);

    if (targetQty > product.stock) {
      return res.status(409).json({ message: `Requested quantity exceeds available stock (${product.stock}).` });
    }

    // Atomic findOneAndUpdate with upsert
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
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(200).json(cartItem);
  } catch (error) {
    console.error("Error adding to cart:", error);
    return res.status(500).json({ message: "Something went wrong adding item to cart." });
  }
};

exports.updateQuantity = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity, version } = req.body;

    if (quantity === undefined || version === undefined) {
      return res.status(400).json({ message: "quantity and version are required." });
    }

    const cartItem = await CartItem.findById(itemId);
    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found." });
    }

    const product = await Product.findById(cartItem.productId);
    if (!product || product.status !== "active") {
      return res.status(400).json({ message: "Product is inactive, discontinued or unavailable." });
    }

    // Strengthen Stock Validation
    if (Number(quantity) > product.stock) {
      return res.status(409).json({ message: `Requested quantity exceeds available stock (${product.stock}).` });
    }

    // Optimistic locking quantity update
    const updatedItem = await CartItem.findOneAndUpdate(
      { _id: itemId, version: Number(version) },
      {
        $set: { quantity: Number(quantity) },
        $inc: { version: 1 }
      },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(409).json({
        message: "Concurrency conflict: Cart item was modified on another device. Please refresh.",
        conflict: true
      });
    }

    // Keep Cart activity timestamp fresh
    await Cart.findByIdAndUpdate(updatedItem.cartId, { lastActivityAt: new Date() });

    return res.status(200).json(updatedItem);
  } catch (error) {
    console.error("Error updating quantity:", error);
    return res.status(500).json({ message: "Something went wrong updating item quantity." });
  }
};

exports.removeItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    // Attempt delete in active items
    let deleted = await CartItem.findByIdAndDelete(itemId);
    if (!deleted) {
      // Attempt delete in saved items
      deleted = await SavedItem.findByIdAndDelete(itemId);
    }

    if (!deleted) {
      return res.status(404).json({ message: "Item not found in cart or saved items." });
    }

    // Keep activity fresh
    await Cart.findByIdAndUpdate(deleted.cartId, { lastActivityAt: new Date() });

    return res.status(200).json({ message: "Item removed successfully." });
  } catch (error) {
    console.error("Error removing item:", error);
    return res.status(500).json({ message: "Something went wrong removing item." });
  }
};

exports.saveForLater = async (req, res) => {
  const { itemId } = req.params;
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();

    const activeItem = await CartItem.findByIdAndDelete(itemId).session(session);
    if (!activeItem) {
      throw new Error("Active cart item not found.");
    }

    // Move to SavedItem (using findOneAndUpdate with upsert in transaction)
    await SavedItem.findOneAndUpdate(
      { cartId: activeItem.cartId, productId: activeItem.productId, size: activeItem.size },
      { $inc: { quantity: activeItem.quantity } },
      { upsert: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    // Refresh activity
    await Cart.findByIdAndUpdate(activeItem.cartId, { lastActivityAt: new Date() });

    return res.status(200).json({ message: "Item saved for later." });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Fallback for non-replica sets in local development
    if (error.message.includes("replica set") || error.message.includes("Transaction")) {
      try {
        const activeItem = await CartItem.findByIdAndDelete(itemId);
        if (!activeItem) {
          return res.status(404).json({ message: "Active cart item not found." });
        }

        await SavedItem.findOneAndUpdate(
          { cartId: activeItem.cartId, productId: activeItem.productId, size: activeItem.size },
          { $inc: { quantity: activeItem.quantity } },
          { upsert: true }
        );

        await Cart.findByIdAndUpdate(activeItem.cartId, { lastActivityAt: new Date() });

        return res.status(200).json({ message: "Item saved for later (non-transactional fallback)." });
      } catch (fallbackErr) {
        console.error("Fallback saveForLater failed:", fallbackErr);
        return res.status(500).json({ message: "Error saving item for later." });
      }
    }

    console.error("Transaction saveForLater failed:", error);
    return res.status(500).json({ message: error.message || "Error saving item for later." });
  }
};

exports.moveToCart = async (req, res) => {
  const { itemId } = req.params;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const savedItem = await SavedItem.findByIdAndDelete(itemId).session(session);
    if (!savedItem) {
      throw new Error("Saved item not found.");
    }

    // Get product to check stock & build snapshots
    const product = await Product.findById(savedItem.productId).session(session);
    if (!product) {
      // Restore before failing
      await new SavedItem({
        _id: savedItem._id,
        cartId: savedItem.cartId,
        productId: savedItem.productId,
        size: savedItem.size,
        quantity: savedItem.quantity
      }).save({ session });
      throw new Error("Product not found.");
    }
    if (product.status !== "active") {
      // Restore before failing
      await new SavedItem({
        _id: savedItem._id,
        cartId: savedItem.cartId,
        productId: savedItem.productId,
        size: savedItem.size,
        quantity: savedItem.quantity
      }).save({ session });
      throw new Error("Cannot move inactive or discontinued product to active bag.");
    }

    // Check stock limit
    const existingCartItem = await CartItem.findOne({ cartId: savedItem.cartId, productId: savedItem.productId, size: savedItem.size }).session(session);
    const targetQty = (existingCartItem ? existingCartItem.quantity : 0) + savedItem.quantity;
    if (targetQty > product.stock) {
      // Restore before failing
      await new SavedItem({
        _id: savedItem._id,
        cartId: savedItem.cartId,
        productId: savedItem.productId,
        size: savedItem.size,
        quantity: savedItem.quantity
      }).save({ session });
      throw new Error(`Insufficient stock. Only ${product.stock} items available.`);
    }

    // Add back to active CartItem
    await CartItem.findOneAndUpdate(
      { cartId: savedItem.cartId, productId: savedItem.productId, size: savedItem.size },
      {
        $inc: { quantity: savedItem.quantity },
        $setOnInsert: {
          priceAtAdded: product.price,
          productNameAtAdded: product.name,
          productImageAtAdded: product.images[0] || "",
          brandAtAdded: product.brand || "",
          version: 0
        }
      },
      { upsert: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    // Refresh activity
    await Cart.findByIdAndUpdate(savedItem.cartId, { lastActivityAt: new Date() });

    return res.status(200).json({ message: "Item moved to active bag." });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Fallback for non-replica sets in local development
    if (error.message.includes("replica set") || error.message.includes("Transaction")) {
      try {
        const savedItem = await SavedItem.findByIdAndDelete(itemId);
        if (!savedItem) {
          return res.status(404).json({ message: "Saved item not found." });
        }

        const product = await Product.findById(savedItem.productId);
        if (!product || product.status !== "active") {
          // Restore
          await new SavedItem(savedItem.toObject()).save();
          return res.status(400).json({ message: "Product is inactive, discontinued or unavailable." });
        }

        // Check stock limit
        const existingCartItem = await CartItem.findOne({ cartId: savedItem.cartId, productId: savedItem.productId, size: savedItem.size });
        const targetQty = (existingCartItem ? existingCartItem.quantity : 0) + savedItem.quantity;
        if (targetQty > product.stock) {
          // Restore
          await new SavedItem(savedItem.toObject()).save();
          return res.status(409).json({ message: `Insufficient stock. Only ${product.stock} items available.` });
        }

        await CartItem.findOneAndUpdate(
          { cartId: savedItem.cartId, productId: savedItem.productId, size: savedItem.size },
          {
            $inc: { quantity: savedItem.quantity },
            $setOnInsert: {
              priceAtAdded: product.price,
              productNameAtAdded: product.name,
              productImageAtAdded: product.images[0] || "",
              brandAtAdded: product.brand || "",
              version: 0
            }
          },
          { upsert: true }
        );

        await Cart.findByIdAndUpdate(savedItem.cartId, { lastActivityAt: new Date() });

        return res.status(200).json({ message: "Item moved to active bag." });
      } catch (fallbackErr) {
        console.error("Fallback moveToCart failed:", fallbackErr);
        return res.status(500).json({ message: fallbackErr.message || "Error moving item to bag." });
      }
    }

    console.error("Transaction moveToCart failed:", error);
    return res.status(500).json({ message: error.message || "Error moving item to bag." });
  }
};

exports.validateCart = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: "userId query parameter is required." });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(200).json({ isValid: true, items: [] });
    }

    const items = await CartItem.find({ cartId: cart._id });
    const validationDetails = [];
    let isValid = true;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      const detail = {
        itemId: item._id,
        productId: item.productId,
        productName: item.productNameAtAdded,
        size: item.size,
        quantity: item.quantity,
        priceAtAdded: item.priceAtAdded,
        currentPrice: product ? product.price : null,
        availableStock: product ? product.stock : 0,
        status: "valid", // "valid", "price_changed", "out_of_stock", "discontinued"
      };

      if (!product || product.status !== "active") {
        detail.status = "discontinued";
        isValid = false;
      } else if (item.quantity > product.stock) {
        detail.status = "out_of_stock";
        isValid = false;
      } else if (product.price !== item.priceAtAdded) {
        detail.status = "price_changed";
        // Do not set isValid = false; price changes are warnings, users can accept them
      }

      validationDetails.push(detail);
    }

    return res.status(200).json({ isValid, items: validationDetails });
  } catch (error) {
    console.error("Error validating cart:", error);
    return res.status(500).json({ message: "Error validating cart." });
  }
};

// Allows user to accept price changes, updating price snapshots in cart items
exports.acceptPriceChanges = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    }

    const items = await CartItem.find({ cartId: cart._id });
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product && !product.isDiscontinued && product.price !== item.priceAtAdded) {
        item.priceAtAdded = product.price;
        await item.save();
      }
    }

    return res.status(200).json({ message: "Price changes accepted successfully." });
  } catch (error) {
    console.error("Error accepting price changes:", error);
    return res.status(500).json({ message: "Error updating price snapshots." });
  }
};
