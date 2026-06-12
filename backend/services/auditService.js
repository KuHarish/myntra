const AuditLog = require("../models/AuditLog");

/**
 * Service to log system and user actions on transactions.
 */
const auditService = {
  /**
   * Logs a transaction lifecycle event.
   * @param {string} transactionId - MongoDB ObjectId of the transaction.
   * @param {string} eventType - The action eventType ("Created" | "Paid" | "Failed" | "Refunded" | "Cancelled").
   * @param {string} actor - The entity initiating the event (e.g. "User: 65ab...", "System: Webhook").
   * @param {object} [metadata] - Optional additional context/payload.
   */
  async logEvent(transactionId, eventType, actor, metadata = {}) {
    try {
      const log = new AuditLog({
        transactionId,
        eventType,
        actor,
        metadata,
      });
      await log.save();
      console.log(`[AuditLog] Event logged: ${eventType} on Txn ID: ${transactionId} by ${actor}`);
      return log;
    } catch (error) {
      console.error("[AuditLog] Failed to write audit log:", error);
      // We do not throw to prevent blocking the core transaction workflow, but in production,
      // this could be published to a reliable message queue or retried.
    }
  },

  /**
   * Retrieves audit logs for a specific transaction.
   * @param {string} transactionId - The transaction ID.
   */
  async getLogsForTransaction(transactionId) {
    return AuditLog.find({ transactionId }).sort({ timestamp: 1 });
  }
};

module.exports = auditService;
