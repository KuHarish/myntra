const Transaction = require("../models/Transaction");
const auditService = require("../services/auditService");
const pdfService = require("../services/pdfService");

/**
 * Controller to handle all transactions queries, exports, receipts, and webhooks.
 */
const transactionController = {
  /**
   * Get paginated, sorted, and filtered transactions.
   */
  async getTransactions(req, res) {
    try {
      const {
        userId,
        status,
        paymentMethod,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        search,
        page = 1,
        limit = 10,
        sortBy = "dateTime",
        sortOrder = "desc",
      } = req.query;

      if (!userId) {
        return res.status(400).json({ success: false, message: "userId parameter is required." });
      }

      // Build Query Filters
      const query = { userId };

      if (status) {
        query.status = status;
      }

      if (paymentMethod) {
        query.paymentMethod = paymentMethod;
      }

      // Date Range Filter
      if (startDate || endDate) {
        query.dateTime = {};
        if (startDate) query.dateTime.$gte = new Date(startDate);
        if (endDate) query.dateTime.$lte = new Date(endDate);
      }

      // Amount Range Filter
      if (minAmount || maxAmount) {
        query.amount = {};
        if (minAmount) query.amount.$gte = parseFloat(minAmount);
        if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
      }

      // Search Filter (matches transactionId or invoiceId)
      if (search) {
        const searchRegex = new RegExp(search, "i");
        query.$or = [
          { transactionId: searchRegex },
          { invoiceId: searchRegex }
        ];
      }

      // Pagination options
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Sort criteria
      const sort = {};
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;

      // Fetch documents and count total
      const [transactions, totalRecords] = await Promise.all([
        Transaction.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
        Transaction.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalRecords / limitNum);

      return res.status(200).json({
        success: true,
        data: transactions,
        pagination: {
          totalRecords,
          currentPage: pageNum,
          totalPages,
          limit: limitNum,
        }
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Stream transactions as CSV directly to response without loading all in memory.
   */
  async exportCSV(req, res) {
    try {
      const {
        userId,
        status,
        paymentMethod,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        search,
        sortBy = "dateTime",
        sortOrder = "desc",
      } = req.query;

      if (!userId) {
        return res.status(400).json({ success: false, message: "userId parameter is required." });
      }

      // Build Query Filters
      const query = { userId };

      if (status) query.status = status;
      if (paymentMethod) query.paymentMethod = paymentMethod;

      if (startDate || endDate) {
        query.dateTime = {};
        if (startDate) query.dateTime.$gte = new Date(startDate);
        if (endDate) query.dateTime.$lte = new Date(endDate);
      }

      if (minAmount || maxAmount) {
        query.amount = {};
        if (minAmount) query.amount.$gte = parseFloat(minAmount);
        if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
      }

      if (search) {
        const searchRegex = new RegExp(search, "i");
        query.$or = [
          { transactionId: searchRegex },
          { invoiceId: searchRegex }
        ];
      }

      const sort = {};
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;

      // Set headers for Streaming CSV download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="transactions_${userId}_${Date.now()}.csv"`);
      res.setHeader("Transfer-Encoding", "chunked");

      // Write BOM for UTF-8 compatibility with Excel
      res.write("\ufeff");

      // Write CSV Headers
      const headers = [
        "Transaction ID",
        "Invoice ID",
        "Amount",
        "Currency",
        "Gateway",
        "Payment Method",
        "Status",
        "Date & Time",
        "Gateway Txn ID",
        "Gateway Response Code"
      ].map(h => `"${h}"`).join(",");
      res.write(headers + "\n");

      // Use MongoDB cursor to stream records
      const cursor = Transaction.find(query).sort(sort).cursor();

      let count = 0;
      for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        const row = [
          doc.transactionId,
          doc.invoiceId,
          doc.amount,
          doc.currency,
          doc.gateway || "N/A",
          doc.paymentMethod,
          doc.status,
          doc.dateTime.toISOString(),
          doc.gatewayTransactionId || "N/A",
          doc.gatewayResponseCode || "N/A"
        ].map(val => {
          if (val === null || val === undefined) return '""';
          const strVal = String(val).replace(/"/g, '""'); // Escape double quotes
          return `"${strVal}"`;
        }).join(",");

        res.write(row + "\n");
        count++;

        // Visual indicator on server log every 2000 streamed records
        if (count % 2000 === 0) {
          console.log(`[CSV Stream] Streamed ${count} records for User: ${userId}`);
        }
      }

      console.log(`[CSV Stream] Completed streaming. Total: ${count} rows`);
      res.end();
    } catch (error) {
      console.error("Error exporting CSV:", error);
      // If headers already sent, we must destroy connection
      if (res.headersSent) {
        res.destroy();
      } else {
        return res.status(500).json({ success: false, message: "Failed to export CSV" });
      }
    }
  },

  /**
   * Generates and downloads secure PDF receipt.
   */
  async downloadReceipt(req, res) {
    try {
      const { id } = req.params;

      const transaction = await Transaction.findById(id).populate("userId");

      if (!transaction) {
        return res.status(404).json({ success: false, message: "Transaction not found" });
      }

      // Set Headers for PDF
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="receipt_${transaction.invoiceId}.pdf"`);

      // Draw receipt directly into express response stream
      pdfService.generateReceiptPDF(transaction, res);

      // Record audit log
      await auditService.logEvent(
        transaction._id,
        transaction.status,
        `User: ${transaction.userId?._id || "unknown"}`,
        { action: "download_receipt", timestamp: new Date() }
      );
    } catch (error) {
      console.error("Error generating receipt PDF:", error);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, message: "Failed to download receipt" });
      }
    }
  },

  /**
   * Process payment webhook events idempotently.
   */
  async handleWebhook(req, res) {
    try {
      const {
        eventId,
        userId,
        transactionId,
        invoiceId,
        amount,
        currency = "INR",
        gateway,
        gatewayTransactionId,
        gatewayResponseCode,
        paymentMethod,
        status,
        metadata = {},
      } = req.body;

      if (!eventId || !transactionId || !status || !userId) {
        return res.status(400).json({
          success: false,
          message: "Required parameters: eventId, transactionId, status, userId",
        });
      }

      // 1. Idempotency Check
      let transaction = await Transaction.findOne({ webhookIdempotencyKey: eventId });
      if (transaction) {
        return res.status(200).json({
          success: true,
          message: "Duplicate webhook event, already processed",
          duplicate: true,
          data: transaction,
        });
      }

      // 2. Fetch by transactionId to see if we are updating an existing checkout checkout txn
      transaction = await Transaction.findOne({ transactionId });

      if (transaction) {
        const oldStatus = transaction.status;
        
        // Update fields
        transaction.status = status;
        transaction.webhookIdempotencyKey = eventId;
        if (gateway) transaction.gateway = gateway;
        if (gatewayTransactionId) transaction.gatewayTransactionId = gatewayTransactionId;
        if (gatewayResponseCode) transaction.gatewayResponseCode = gatewayResponseCode;
        transaction.metadata = { ...transaction.metadata, ...metadata };

        await transaction.save();

        // 3. Log Audit Event
        await auditService.logEvent(
          transaction._id,
          status,
          `Webhook: ${gateway || "System"}`,
          { eventId, oldStatus, newStatus: status }
        );
      } else {
        // If not found, create new transaction record (e.g. webhook comes first or checkout direct payment)
        transaction = new Transaction({
          userId,
          transactionId,
          invoiceId: invoiceId || `INV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          amount,
          currency,
          gateway,
          gatewayTransactionId,
          gatewayResponseCode,
          paymentMethod: paymentMethod || "Unknown",
          status,
          webhookIdempotencyKey: eventId,
          metadata,
        });

        try {
          await transaction.save();
        } catch (saveErr) {
          // Catch potential duplicate key race condition from parallel webhooks
          if (saveErr.code === 11000) {
            const duplicateTxn = await Transaction.findOne({ webhookIdempotencyKey: eventId });
            if (duplicateTxn) {
              return res.status(200).json({
                success: true,
                message: "Duplicate webhook event, already processed",
                duplicate: true,
                data: duplicateTxn,
              });
            }
          }
          throw saveErr;
        }

        // 3. Log Audit Event
        await auditService.logEvent(
          transaction._id,
          status,
          `Webhook: ${gateway || "System"}`,
          { eventId, eventAction: "create_via_webhook" }
        );
      }

      return res.status(200).json({
        success: true,
        message: "Webhook processed successfully",
        data: transaction,
      });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};

module.exports = transactionController;
