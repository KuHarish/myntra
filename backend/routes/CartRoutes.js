const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");

// Add to Cart
router.post("/", cartController.addToCart);

// Get Cart Summary (both query param or path param are supported)
router.get("/summary/:userId", cartController.getCartSummary);
router.get("/summary", cartController.getCartSummary); // Expects ?userId=

// Validate Cart (expects ?userId=)
router.get("/validate", cartController.validateCart);

// Accept Price Changes
router.post("/accept-prices", cartController.acceptPriceChanges);

// Get Cart items (active + saved)
router.get("/:userId", cartController.getCart);

// Update item quantity
router.put("/items/:itemId", cartController.updateQuantity);

// Remove item from active/saved cart
router.delete("/items/:itemId", cartController.removeItem);

// Move item to save for later list
router.post("/items/:itemId/save", cartController.saveForLater);

// Move saved item back to active cart
router.post("/saved/:itemId/move-to-cart", cartController.moveToCart);

module.exports = router;
