const express = require("express");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { verifyToken, restrictToAdmin } = require("../middleware/auth");
const router = express.Router();

// Apply auth protection to all admin product routes
router.use(verifyToken, restrictToAdmin);

// Get all products (admin catalog)
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().populate("categories");
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching admin products:", error);
    res.status(500).json({ message: "Something went wrong fetching products." });
  }
});

// Get product by ID (admin catalog)
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching admin product by ID:", error);
    res.status(500).json({ message: "Something went wrong fetching product." });
  }
});

// Add Product
router.post("/", async (req, res) => {
  const { name, brand, description, category, price, stock, images } = req.body;

  // Validation
  if (!name || !brand || !description || !category || price === undefined || stock === undefined || !images) {
    return res.status(400).json({ message: "All fields (name, brand, description, category, price, stock, images) are required." });
  }

  if (Number(price) <= 0) {
    return res.status(400).json({ message: "Price must be greater than 0." });
  }

  if (Number(stock) < 0) {
    return res.status(400).json({ message: "Stock cannot be negative." });
  }

  try {
    const product = new Product({
      name,
      brand,
      description,
      price: Number(price),
      stock: Number(stock),
      images: Array.isArray(images) ? images : [images],
      categories: [category],
      status: "active",
      isDiscontinued: false,
    });

    await product.save();

    // Update Category association
    await Category.findByIdAndUpdate(category, { $addToSet: { productId: product._id } });

    res.status(201).json(product);
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ message: "Something went wrong adding the product." });
  }
});

// Edit Product
router.put("/:id", async (req, res) => {
  const { name, brand, description, category, images } = req.body;

  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    if (category && !product.categories.includes(category)) {
      // Remove from old categories
      for (const oldCatId of product.categories) {
        await Category.findByIdAndUpdate(oldCatId, { $pull: { productId: product._id } });
      }
      // Add to new category
      await Category.findByIdAndUpdate(category, { $addToSet: { productId: product._id } });
      product.categories = [category];
    }

    if (name !== undefined) product.name = name;
    if (brand !== undefined) product.brand = brand;
    if (description !== undefined) product.description = description;
    if (images !== undefined) product.images = Array.isArray(images) ? images : [images];

    await product.save();
    res.status(200).json(product);
  } catch (error) {
    console.error("Error editing product:", error);
    res.status(500).json({ message: "Something went wrong editing the product." });
  }
});

// Update Stock
router.patch("/:id/stock", async (req, res) => {
  const { stock } = req.body;

  if (stock === undefined || Number(stock) < 0) {
    return res.status(400).json({ message: "Stock must be a non-negative number." });
  }

  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    product.stock = Number(stock);
    await product.save();
    res.status(200).json(product);
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).json({ message: "Something went wrong updating stock." });
  }
});

// Update Price
router.patch("/:id/price", async (req, res) => {
  const { price } = req.body;

  if (price === undefined || Number(price) <= 0) {
    return res.status(400).json({ message: "Price must be a positive number." });
  }

  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const oldPrice = product.price;
    product.priceHistory.push({
      oldPrice: oldPrice,
      newPrice: Number(price),
      changedAt: new Date(),
    });
    product.price = Number(price);

    await product.save();
    res.status(200).json(product);
  } catch (error) {
    console.error("Error updating price:", error);
    res.status(500).json({ message: "Something went wrong updating price." });
  }
});

// Change Status
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;

  if (!["active", "inactive", "discontinued"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value. Must be 'active', 'inactive', or 'discontinued'." });
  }

  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    product.status = status;
    // Keep isDiscontinued field in sync for backward compatibility
    if (status === "discontinued") {
      product.isDiscontinued = true;
    } else {
      product.isDiscontinued = false;
    }

    await product.save();
    res.status(200).json(product);
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ message: "Something went wrong updating status." });
  }
});

module.exports = router;
