// Payments controller for recording transactions and updating invoice statuses
const db = require('../db/db');
const path = require('path');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

const recordPayment = async (req, res) => {
  const { invoice_id, amount, payment_date, method, note } = req.body;

  if (!invoice_id || amount === undefined || !payment_date || !method) {
    return res.status(400).json({ error: 'Missing required payment fields' });
  }

  const pmtAmount = parseFloat(amount) || 0;
  if (pmtAmount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than zero' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert the payment
    const pmtInsertQuery = `
      INSERT INTO payments (invoice_id, amount, payment_date, method, note)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const pmtResult = await client.query(pmtInsertQuery, [
      invoice_id, pmtAmount, payment_date, method, note || null
    ]);
    const payment = pmtResult.rows[0];

    // 2. Fetch invoice metadata
    const invQuery = await client.query(
      'SELECT total, status, client_id, invoice_number FROM invoices WHERE id = $1',
      [invoice_id]
    );
    if (invQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const { total, status: oldStatus, client_id, invoice_number } = invQuery.rows[0];
    const invoiceTotal = parseFloat(total);

    // 3. Sum up all payments recorded for the invoice
    const sumResult = await client.query(
      'SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE invoice_id = $1',
      [invoice_id]
    );
    const totalPaid = parseFloat(sumResult.rows[0].paid || 0);

    let newStatus = oldStatus;
    // Auto-update invoice status to paid if fully paid
    if (totalPaid >= invoiceTotal) {
      newStatus = 'paid';
    }

    if (newStatus !== oldStatus) {
      await client.query('UPDATE invoices SET status = $1 WHERE id = $2', [newStatus, invoice_id]);

      // PDF details update
      const clientResult = await client.query('SELECT * FROM clients WHERE id = $1', [client_id]);
      const clientData = clientResult.rows[0];
      const itemsResult = await client.query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC', [invoice_id]);
      const invoiceDataResult = await client.query('SELECT * FROM invoices WHERE id = $1', [invoice_id]);

      const absolutePdfPath = path.join(__dirname, '..', 'pdfs', `${invoice_number}.pdf`);
      await generateInvoicePDF(invoiceDataResult.rows[0], clientData, itemsResult.rows, absolutePdfPath);
    }

    await client.query('COMMIT');
    return res.status(201).json({
      payment,
      statusUpdated: newStatus !== oldStatus,
      newStatus
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recording payment transaction:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

const getPayments = async (req, res) => {
  try {
    const query = `
      SELECT p.*, i.invoice_number, c.name as client_name
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN clients c ON i.client_id = c.id
      ORDER BY p.payment_date DESC, p.id DESC
    `;
    const result = await db.query(query);
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payments list:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { recordPayment, getPayments };
