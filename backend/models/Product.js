const mongoose = require("mongoose");
const ProductSchema = new mongoose.Schema(
  {
    name: String,
    brand: String,
    price: Number,
    discount: String,
    description: String,
    sizes: [String],
    images: [String],
    stock: { type: Number, default: 50, index: true },
    isDiscontinued: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ["active", "inactive", "discontinued"],
      default: "active",
      index: true,
    },
    priceHistory: [
      {
        oldPrice: Number,
        newPrice: Number,
        changedAt: { type: Date, default: Date.now },
      }
    ],
    version: { type: Number, default: 1 },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }]
  },
  { timestamps: true }
);

// Compound index to optimize recommendation queries
ProductSchema.index({ categories: 1, stock: 1, isDiscontinued: 1 });

module.exports = mongoose.model("Product", ProductSchema);


