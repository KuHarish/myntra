const express = require("express");
const rateLimit = require("express-rate-limit");
const transactionController = require("../controllers/transactionController");

const router = express.Router();

// Define Custom Rate Limiters targeting User ID (from query) or falling back to IP Address

// 1. Export CSV Limiter: 10 requests/hour/user
const csvExportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (req) => {
    return req.query.userId || req['ip'];
  },
  message: {
    success: false,
    message: "Rate limit exceeded. You can only export transactions 10 times per hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// 2. Receipt Download Limiter: 60 requests/hour/user
const receiptDownloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,
  keyGenerator: (req) => {
    // If user is downloading, try to map from query userId if present
    return req.query.userId || req['ip'];
  },
  message: {
    success: false,
    message: "Rate limit exceeded. You can only download receipts 60 times per hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

// Routes
router.get("/", transactionController.getTransactions);
router.get("/export", csvExportLimiter, transactionController.exportCSV);
router.get("/:id/receipt", receiptDownloadLimiter, transactionController.downloadReceipt);
router.post("/webhook", transactionController.handleWebhook);

module.exports = router;
