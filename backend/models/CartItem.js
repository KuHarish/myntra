const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema(
  {
    cartId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    size: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    priceAtAdded: {
      type: Number,
      required: true,
    },
    productNameAtAdded: {
      type: String,
      required: true,
    },
    productImageAtAdded: {
      type: String,
      required: true,
    },
    brandAtAdded: {
      type: String,
      required: true,
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate products of same size in the active cart
CartItemSchema.index({ cartId: 1, productId: 1, size: 1 }, { unique: true });

module.exports = mongoose.model("CartItem", CartItemSchema);
