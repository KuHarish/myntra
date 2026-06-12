const mongoose = require("mongoose");

const SavedItemSchema = new mongoose.Schema(
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
      default: 1,
      min: 1,
    },
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate products of same size in the saved items
SavedItemSchema.index({ cartId: 1, productId: 1, size: 1 }, { unique: true });

module.exports = mongoose.model("SavedItem", SavedItemSchema);
