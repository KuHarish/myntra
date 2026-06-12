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
    version: { type: Number, default: 1 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);

