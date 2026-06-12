const PDFDocument = require("pdfkit");
const crypto = require("crypto");

/**
 * Service to generate secure, enterprise-grade PDF receipts for transactions.
 */
const pdfService = {
  /**
   * Generates a secure verification identifier for a transaction.
   * @param {object} transaction - The transaction document.
   * @returns {string} HMAC signature.
   */
  generateVerificationHash(transaction) {
    const secret = process.env.RECEIPT_HMAC_SECRET || "default_fallback_secret_key_123456";
    const dataString = [
      transaction.transactionId,
      transaction.invoiceId,
      transaction.amount.toString(),
      transaction.status,
      transaction.userId ? transaction.userId.toString() : "anonymous"
    ].join("|");

    return crypto
      .createHmac("sha256", secret)
      .update(dataString)
      .digest("hex");
  },

  /**
   * Generates a PDF receipt and pipes it to a writable stream.
   * @param {object} transaction - The transaction document with populated userId.
   * @param {WritableStream} writeStream - Express response or other write stream.
   */
  generateReceiptPDF(transaction, writeStream) {
    const doc = new PDFDocument({ size: "A4", margin: 40 });

    // Pipe PDF to the writable stream
    doc.pipe(writeStream);

    // Color Palette
    const primaryColor = "#ff3f6c"; // Myntra Pink
    const textColor = "#282c3f"; // Dark charcoal
    const lightGrey = "#f5f5f6";
    const borderGrey = "#eaeaec";
    const successGreen = "#03a685";
    const errorRed = "#e81156";
    const refundBlue = "#1070e0";

    // Set text color
    doc.fillColor(textColor);

    // 1. BRANDING / HEADER
    doc
      .fontSize(24)
      .fillColor(primaryColor)
      .font("Helvetica-Bold")
      .text("MYNTRA", 40, 40)
      .fontSize(10)
      .fillColor("#9496a2")
      .text("CLONE", 40, 68);

    doc
      .fontSize(14)
      .fillColor(textColor)
      .font("Helvetica-Bold")
      .text("TAX INVOICE / RECEIPT", 380, 40, { align: "right" })
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#686b78")
      .text("Myntra Designs Private Limited\nBangalore, Karnataka - 560068\nsupport@myntraclone.com", 380, 58, { align: "right" });

    // Decorative line
    doc
      .strokeColor(primaryColor)
      .lineWidth(2)
      .moveTo(40, 105)
      .lineTo(550, 105)
      .stroke();

    // 2. INVOICE INFO & CUSTOMER DETAILS
    doc.y = 125;
    
    // Billed To Column
    doc
      .fillColor(textColor)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("BILLED TO:", 40, 125)
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#3e4152")
      .text(transaction.userId?.fullName || "Valued Customer", 40, 140)
      .text(transaction.userId?.email || "customer@myntraclone.com", 40, 153);

    // Invoice details column
    doc
      .fillColor(textColor)
      .font("Helvetica-Bold")
      .text("INVOICE DETAILS:", 300, 125)
      .font("Helvetica")
      .fillColor("#3e4152")
      .text(`Invoice No: ${transaction.invoiceId}`, 300, 140)
      .text(`Date & Time: ${transaction.dateTime.toLocaleString()}`, 300, 153)
      .text(`Transaction ID: ${transaction.transactionId}`, 300, 166)
      .text(`Payment Method: ${transaction.paymentMethod}`, 300, 179)
      .text(`Gateway: ${transaction.gateway || "Standard"} (${transaction.gatewayTransactionId || "N/A"})`, 300, 192);

    // Status Badge
    let statusColor = successGreen;
    if (transaction.status === "Failed") statusColor = errorRed;
    else if (transaction.status === "Cancelled") statusColor = "#686b78";
    else if (transaction.status === "Refunded") statusColor = refundBlue;
    else if (transaction.status === "Created") statusColor = "#f4a261";

    doc
      .rect(40, 215, 80, 22)
      .fill(statusColor);

    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(transaction.status.toUpperCase(), 40, 221, { width: 80, align: "center" });

    // 3. TABLE OF CHARGES
    doc.y = 265;
    
    // Draw table header background
    doc
      .rect(40, 260, 510, 20)
      .fill(lightGrey);

    doc
      .fillColor(textColor)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Item Description", 45, 266)
      .text("Qty", 320, 266, { width: 40, align: "center" })
      .text("Unit Price", 370, 266, { width: 80, align: "right" })
      .text("Total Amount", 460, 266, { width: 85, align: "right" });

    // Add table item row
    const subtotal = transaction.amount / 1.18; // assuming 18% GST included
    const gstAmount = transaction.amount - subtotal;
    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;

    doc
      .fillColor("#3e4152")
      .font("Helvetica")
      .fontSize(9)
      .text(`Shopping Order Purchase - ${transaction.invoiceId}`, 45, 290, { width: 260 })
      .text("1", 320, 290, { width: 40, align: "center" })
      .text(`${transaction.currency} ${subtotal.toFixed(2)}`, 370, 290, { width: 80, align: "right" })
      .text(`${transaction.currency} ${subtotal.toFixed(2)}`, 460, 290, { width: 85, align: "right" });

    // Draw bottom border of table
    doc
      .strokeColor(borderGrey)
      .lineWidth(1)
      .moveTo(40, 315)
      .lineTo(550, 315)
      .stroke();

    // 4. FINANCIAL SUMMARY
    doc.y = 330;

    doc
      .fillColor("#686b78")
      .text("Subtotal:", 350, 330, { width: 100, align: "right" })
      .fillColor(textColor)
      .text(`${transaction.currency} ${subtotal.toFixed(2)}`, 460, 330, { width: 85, align: "right" });

    doc
      .fillColor("#686b78")
      .text("CGST (9.0%):", 350, 345, { width: 100, align: "right" })
      .fillColor(textColor)
      .text(`${transaction.currency} ${cgst.toFixed(2)}`, 460, 345, { width: 85, align: "right" });

    doc
      .fillColor("#686b78")
      .text("SGST (9.0%):", 350, 360, { width: 100, align: "right" })
      .fillColor(textColor)
      .text(`${transaction.currency} ${sgst.toFixed(2)}`, 460, 360, { width: 85, align: "right" });

    // Draw total double underline
    doc
      .strokeColor(borderGrey)
      .lineWidth(1)
      .moveTo(350, 378)
      .lineTo(550, 378)
      .moveTo(350, 381)
      .lineTo(550, 381)
      .stroke();

    doc
      .fillColor(textColor)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("Total Paid:", 350, 390, { width: 100, align: "right" })
      .fillColor(primaryColor)
      .text(`${transaction.currency} ${transaction.amount.toFixed(2)}`, 460, 390, { width: 85, align: "right" });

    // 5. SECURITY & VERIFICATION FOOTER
    const verificationHash = this.generateVerificationHash(transaction);

    // Box background for validation hash
    doc
      .rect(40, 470, 510, 85)
      .fill("#fafafb")
      .strokeColor("#d5d6d9")
      .lineWidth(0.5)
      .dash(4, { space: 2 })
      .stroke();

    doc
      .undash() // Reset dashing
      .fillColor(textColor)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("SECURE VERIFICATION IDENTIFIER", 50, 480);

    doc
      .fillColor("#686b78")
      .font("Helvetica")
      .fontSize(7.5)
      .text("This receipt is cryptographically signed and secured using SHA256 HMAC offline verification technology. Scan the key below to verify its authenticity and check status tampering.", 50, 492, { width: 490 });

    doc
      .font("Courier-Bold")
      .fontSize(8.5)
      .fillColor("#282c3f")
      .text(verificationHash, 50, 520, { width: 490, characterSpacing: 0.5 });

    // Bottom Note
    doc
      .fillColor("#9496a2")
      .font("Helvetica-Oblique")
      .fontSize(8)
      .text("This is a computer-generated document. No signature required.", 40, 780, { width: 510, align: "center" });

    // End and finalize the document
    doc.end();
  }
};

module.exports = pdfService;
