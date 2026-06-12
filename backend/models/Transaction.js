const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    invoiceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      index: true,
    },
    currency: {
      type: String,
      default: "INR",
      required: true,
    },
    gateway: {
      type: String,
      trim: true,
    },
    gatewayTransactionId: {
      type: String,
      trim: true,
    },
    gatewayResponseCode: {
      type: String,
      trim: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Created", "Paid", "Failed", "Refunded", "Cancelled"],
      default: "Created",
      required: true,
      index: true,
    },
    dateTime: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    webhookIdempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Compound Indexes for query optimizations
TransactionSchema.index({ userId: 1, dateTime: -1 });
TransactionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("Transaction", TransactionSchema);
