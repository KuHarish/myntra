const express = require("express");
const Product = require("../models/Product");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const products = await Product.find({ status: "active" });
    res.status(200).json(products);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/:id", async (req, res) => {
  const productid = req.params.id;
  try {
    const product = await Product.findById(productid);
    if (!product || product.status !== "active") {
      return res.status(404).json({ message: "Product not found or unavailable." });
    }
    res.status(200).json(product);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});
module.exports = router;
