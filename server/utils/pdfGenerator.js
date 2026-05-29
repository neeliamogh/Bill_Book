// PDF generator helper using PDFKit
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates an invoice PDF
 * @param {Object} invoice - Invoice details
 * @param {Object} client - Client details
 * @param {Array} items - Invoice line items
 * @param {string} outputPath - Path to save the PDF
 * @returns {Promise<string>} Path of the generated PDF
 */
function generateInvoicePDF(invoice, client, items, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const writeStream = fs.createWriteStream(outputPath);

      doc.pipe(writeStream);

      // Header Brand (Top Left)
      doc.fillColor('#1D9E75'); // Accent Teal
      doc.fontSize(24).font('Helvetica-Bold').text('BillBook', 50, 50);
      doc.fillColor('#6B6A65'); // Text Secondary
      doc.fontSize(9).font('Helvetica-Oblique').text('Smart Billing for Small Businesses', 50, 76);

      // Invoice metadata (Top Right)
      doc.fillColor('#1A1A1A'); // Text Primary
      doc.fontSize(11).font('Helvetica-Bold').text(`Invoice #: ${invoice.invoice_number}`, 380, 50, { align: 'right', width: 165 });
      doc.fontSize(9).font('Helvetica').text(`Issue Date: ${formatDate(invoice.issue_date)}`, 380, 68, { align: 'right', width: 165 });
      doc.fontSize(9).font('Helvetica').text(`Due Date: ${formatDate(invoice.due_date)}`, 380, 82, { align: 'right', width: 165 });

      // Divider Line
      doc.strokeColor('#E2E0D8').lineWidth(1).moveTo(50, 105).lineTo(545, 105).stroke();

      // Bill To & Business Details (Left)
      doc.fillColor('#1A1A1A');
      doc.fontSize(11).font('Helvetica-Bold').text('Bill To:', 50, 125);
      doc.fontSize(10).font('Helvetica-Bold').text(client.name, 50, 140);
      doc.fontSize(9).font('Helvetica');
      if (client.address) {
        doc.fillColor('#6B6A65');
        doc.text(client.address, 50, 155, { width: 250 });
      }
      
      const currentY = doc.y + 4;
      doc.fillColor('#1A1A1A');
      doc.text(`Phone: ${client.phone}`, 50, currentY);
      if (client.gstin) {
        doc.text(`GSTIN: ${client.gstin}`, 50, currentY + 14);
      }

      // Line Items Table Header
      let tableTop = 230;
      doc.strokeColor('#E2E0D8').lineWidth(0.5).moveTo(50, tableTop).lineTo(545, tableTop).stroke();
      tableTop += 8;
      
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1A1A1A');
      doc.text('Sr.', 50, tableTop, { width: 30 });
      doc.text('Description', 90, tableTop, { width: 200 });
      doc.text('Unit', 300, tableTop, { width: 50, align: 'right' });
      doc.text('Qty', 360, tableTop, { width: 50, align: 'right' });
      doc.text('Rate', 420, tableTop, { width: 60, align: 'right' });
      doc.text('Amount', 490, tableTop, { width: 55, align: 'right' });
      
      tableTop += 15;
      doc.strokeColor('#E2E0D8').lineWidth(1).moveTo(50, tableTop).lineTo(545, tableTop).stroke();
      
      // Items Rows
      doc.font('Helvetica').fontSize(9);
      items.forEach((item, index) => {
        tableTop += 10;
        doc.fillColor('#6B6A65');
        doc.text(String(index + 1), 50, tableTop, { width: 30 });
        doc.fillColor('#1A1A1A');
        doc.text(item.description, 90, tableTop, { width: 200 });
        doc.fillColor('#6B6A65');
        doc.text(item.unit || 'pcs', 300, tableTop, { width: 50, align: 'right' });
        doc.text(Number(item.quantity).toFixed(2), 360, tableTop, { width: 50, align: 'right' });
        doc.text(`₹${Number(item.rate).toFixed(2)}`, 420, tableTop, { width: 60, align: 'right' });
        doc.fillColor('#1A1A1A');
        doc.text(`₹${Number(item.amount).toFixed(2)}`, 490, tableTop, { width: 55, align: 'right' });
        
        tableTop += 15;
        doc.strokeColor('#F9F8F6').lineWidth(0.5).moveTo(50, tableTop).lineTo(545, tableTop).stroke();
      });

      // Totals Section
      tableTop += 15;
      doc.fontSize(9).font('Helvetica');
      
      doc.fillColor('#6B6A65').text('Subtotal:', 350, tableTop, { width: 130, align: 'right' });
      doc.fillColor('#1A1A1A').text(`₹${Number(invoice.subtotal).toFixed(2)}`, 490, tableTop, { width: 55, align: 'right' });

      if (Number(invoice.discount_amount) > 0) {
        tableTop += 15;
        doc.fillColor('#6B6A65').text(`Discount (${invoice.discount_percent}%):`, 350, tableTop, { width: 130, align: 'right' });
        doc.fillColor('#1D9E75').text(`-₹${Number(invoice.discount_amount).toFixed(2)}`, 490, tableTop, { width: 55, align: 'right' });
      }

      // Check if IGST was used
      const isIgst = Number(invoice.igst_percent) > 0;
      if (isIgst) {
        tableTop += 15;
        doc.fillColor('#6B6A65').text(`IGST (${invoice.igst_percent}%):`, 350, tableTop, { width: 130, align: 'right' });
        doc.fillColor('#1A1A1A').text(`₹${Number(invoice.tax_amount).toFixed(2)}`, 490, tableTop, { width: 55, align: 'right' });
      } else {
        tableTop += 15;
        doc.fillColor('#6B6A65').text(`CGST (${invoice.cgst_percent}%):`, 350, tableTop, { width: 130, align: 'right' });
        doc.fillColor('#1A1A1A').text(`₹${(Number(invoice.tax_amount) / 2).toFixed(2)}`, 490, tableTop, { width: 55, align: 'right' });

        tableTop += 15;
        doc.fillColor('#6B6A65').text(`SGST (${invoice.sgst_percent}%):`, 350, tableTop, { width: 130, align: 'right' });
        doc.fillColor('#1A1A1A').text(`₹${(Number(invoice.tax_amount) / 2).toFixed(2)}`, 490, tableTop, { width: 55, align: 'right' });
      }

      // Border above Grand Total
      tableTop += 20;
      doc.strokeColor('#E2E0D8').lineWidth(1).moveTo(350, tableTop).lineTo(545, tableTop).stroke();
      
      tableTop += 8;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1A1A1A');
      doc.text('Grand Total:', 350, tableTop, { width: 130, align: 'right' });
      doc.fillColor('#1D9E75').text(`₹${Number(invoice.total).toFixed(2)}`, 490, tableTop, { width: 55, align: 'right' });

      // UPI payment box at bottom left with PhonePe QR Code
      let paymentBoxTop = 600;
      doc.rect(50, paymentBoxTop, 380, 110).strokeColor('#1D9E75').lineWidth(1).stroke();
      doc.fillColor('#1D9E75').fontSize(9).font('Helvetica-Bold').text('Pay via PhonePe / UPI: yourbusiness@upi', 60, paymentBoxTop + 12);
      doc.fillColor('#6B6A65').font('Helvetica').fontSize(8);
      doc.text(`Notes: Scan using PhonePe or any UPI App to complete payment. Specify invoice number ${invoice.invoice_number} in references. Please share the screenshot once done.`, 60, paymentBoxTop + 28, { width: 230, lineGap: 2 });

      const qrCodePath = path.join(__dirname, '..', 'phonepe_qr.png');
      if (fs.existsSync(qrCodePath)) {
        doc.image(qrCodePath, 340, paymentBoxTop + 10, { width: 75 });
      }

      // Footer
      doc.fillColor('#6B6A65');
      doc.fontSize(10).font('Helvetica-Bold').text('Thank you for your business!', 50, 730, { align: 'center', width: 495 });

      doc.end();

      writeStream.on('finish', () => {
        try {
          if (process.platform === 'win32') {
            const os = require('os');
            const homeDir = os.homedir();
            let documentsDir;
            if (process.env.OneDrive) {
              documentsDir = path.join(process.env.OneDrive, 'Documents', 'BillBook Invoices');
            } else {
              documentsDir = path.join(homeDir, 'Documents', 'BillBook Invoices');
            }

            if (!fs.existsSync(documentsDir)) {
              fs.mkdirSync(documentsDir, { recursive: true });
            }

            const backupPath = path.join(documentsDir, path.basename(outputPath));
            fs.copyFileSync(outputPath, backupPath);
            console.log(`[PDF Backup] Copy saved to Documents: ${backupPath}`);
          }
        } catch (backupErr) {
          console.error('[PDF Backup Error] Failed to write to Documents:', backupErr);
        }
        resolve(outputPath);
      });
      writeStream.on('error', (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
}

function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

module.exports = { generateInvoicePDF };
