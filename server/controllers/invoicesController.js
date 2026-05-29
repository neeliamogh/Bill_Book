// Invoices controller for managing bills, totals, items, and PDF generation
const db = require('../db/db');
const path = require('path');
const fs = require('fs');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

// List all invoices with client names
const getInvoices = async (req, res) => {
  try {
    const query = `
      SELECT i.id, i.invoice_number, i.issue_date, i.due_date, i.status, i.total, c.name as client_name
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      ORDER BY i.issue_date DESC, i.id DESC
    `;
    const result = await db.query(query);
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get details of a single invoice including items and payments
const getInvoiceById = async (req, res) => {
  const { id } = req.params;
  try {
    const invQuery = `
      SELECT i.*, 
        c.name as client_name, 
        c.phone as client_phone, 
        c.email as client_email, 
        c.address as client_address, 
        c.gstin as client_gstin
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE i.id = $1
    `;
    const invResult = await db.query(invQuery, [id]);
    if (invResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const invoice = invResult.rows[0];

    const itemsResult = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC', [id]);
    const paymentsResult = await db.query('SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC, id DESC', [id]);

    return res.json({
      invoice,
      items: itemsResult.rows,
      payments: paymentsResult.rows
    });
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new invoice and trigger PDF compilation
const createInvoice = async (req, res) => {
  const {
    client_id,
    issue_date,
    due_date,
    status = 'draft',
    discount_percent = 0,
    cgst_percent = 9,
    sgst_percent = 9,
    igst_percent = 0,
    notes,
    items
  } = req.body;

  if (!client_id || !issue_date || !due_date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing required billing fields or items' });
  }

  // Live calculations
  let subtotal = 0;
  const processedItems = items.map(item => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const amount = qty * rate;
    subtotal += amount;
    return {
      description: item.description,
      quantity: qty,
      unit: item.unit || 'pcs',
      rate: rate,
      amount: amount
    };
  });

  const discPercent = parseFloat(discount_percent) || 0;
  const discount_amount = (subtotal * discPercent) / 100;
  const taxable_amount = subtotal - discount_amount;

  const cgst = parseFloat(cgst_percent) || 0;
  const sgst = parseFloat(sgst_percent) || 0;
  const igst = parseFloat(igst_percent) || 0;

  const totalTaxPercent = igst > 0 ? igst : (cgst + sgst);
  const tax_amount = (taxable_amount * totalTaxPercent) / 100;
  const total = taxable_amount + tax_amount;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert base invoice
    const invInsertQuery = `
      INSERT INTO invoices (
        client_id, issue_date, due_date, status, subtotal, 
        discount_percent, discount_amount, cgst_percent, sgst_percent, igst_percent, 
        tax_amount, total, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const invResult = await client.query(invInsertQuery, [
      client_id, issue_date, due_date, status, subtotal,
      discPercent, discount_amount, cgst, sgst, igst,
      tax_amount, total, notes || null
    ]);
    const invoice = invResult.rows[0];

    // 2. Insert line items
    for (const item of processedItems) {
      await client.query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit, rate, amount) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [invoice.id, item.description, item.quantity, item.unit, item.rate, item.amount]
      );
    }

    // 3. Fetch client details for PDF metadata
    const clientResult = await client.query('SELECT * FROM clients WHERE id = $1', [client_id]);
    const clientData = clientResult.rows[0];

    // 4. Compile and write PDF file
    const pdfFilename = `${invoice.invoice_number}.pdf`;
    const relativePdfPath = `/pdfs/${pdfFilename}`;
    const absolutePdfPath = path.join(__dirname, '..', 'pdfs', pdfFilename);

    await generateInvoicePDF(invoice, clientData, processedItems, absolutePdfPath);

    // 5. Update invoice row with the generated PDF file path
    await client.query('UPDATE invoices SET pdf_path = $1 WHERE id = $2', [relativePdfPath, invoice.id]);
    invoice.pdf_path = relativePdfPath;

    await client.query('COMMIT');
    return res.status(201).json({ ...invoice, items: processedItems });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating invoice transaction:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

// Update an existing invoice and compile fresh PDF copy
const updateInvoice = async (req, res) => {
  const { id } = req.params;
  const {
    client_id,
    issue_date,
    due_date,
    status,
    discount_percent = 0,
    cgst_percent = 9,
    sgst_percent = 9,
    igst_percent = 0,
    notes,
    items
  } = req.body;

  if (!client_id || !issue_date || !due_date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing required billing fields or items' });
  }

  // Totals calculations
  let subtotal = 0;
  const processedItems = items.map(item => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const amount = qty * rate;
    subtotal += amount;
    return {
      description: item.description,
      quantity: qty,
      unit: item.unit || 'pcs',
      rate: rate,
      amount: amount
    };
  });

  const discPercent = parseFloat(discount_percent) || 0;
  const discount_amount = (subtotal * discPercent) / 100;
  const taxable_amount = subtotal - discount_amount;

  const cgst = parseFloat(cgst_percent) || 0;
  const sgst = parseFloat(sgst_percent) || 0;
  const igst = parseFloat(igst_percent) || 0;

  const totalTaxPercent = igst > 0 ? igst : (cgst + sgst);
  const tax_amount = (taxable_amount * totalTaxPercent) / 100;
  const total = taxable_amount + tax_amount;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Retrieve original invoice number to maintain filename consistency
    const origQuery = await client.query('SELECT invoice_number FROM invoices WHERE id = $1', [id]);
    if (origQuery.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const invoiceNumber = origQuery.rows[0].invoice_number;

    // 1. Update DB entry
    const invUpdateQuery = `
      UPDATE invoices SET 
        client_id = $1, issue_date = $2, due_date = $3, status = $4, subtotal = $5, 
        discount_percent = $6, discount_amount = $7, cgst_percent = $8, sgst_percent = $9, igst_percent = $10, 
        tax_amount = $11, total = $12, notes = $13
      WHERE id = $14
      RETURNING *
    `;
    const invResult = await client.query(invUpdateQuery, [
      client_id, issue_date, due_date, status, subtotal,
      discPercent, discount_amount, cgst, sgst, igst,
      tax_amount, total, notes || null, id
    ]);
    const invoice = invResult.rows[0];

    // 2. Drop existing items and record current list
    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
    for (const item of processedItems) {
      await client.query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit, rate, amount) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, item.description, item.quantity, item.unit, item.rate, item.amount]
      );
    }

    // 3. Retrieve client metadata
    const clientResult = await client.query('SELECT * FROM clients WHERE id = $1', [client_id]);
    const clientData = clientResult.rows[0];

    // 4. Overwrite PDF bill template
    const pdfFilename = `${invoiceNumber}.pdf`;
    const absolutePdfPath = path.join(__dirname, '..', 'pdfs', pdfFilename);
    await generateInvoicePDF(invoice, clientData, processedItems, absolutePdfPath);

    await client.query('COMMIT');
    return res.json(invoice);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating invoice transaction:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

// Delete an invoice along with its PDF attachment
const deleteInvoice = async (req, res) => {
  const { id } = req.params;
  try {
    const origQuery = await db.query('SELECT invoice_number FROM invoices WHERE id = $1', [id]);
    if (origQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const invoiceNumber = origQuery.rows[0].invoice_number;

    // Delete constraints and main entry
    await db.query('DELETE FROM payments WHERE invoice_id = $1', [id]);
    await db.query('DELETE FROM invoices WHERE id = $1', [id]);

    // Unlink the filesystem PDF template
    const absolutePdfPath = path.join(__dirname, '..', 'pdfs', `${invoiceNumber}.pdf`);
    if (fs.existsSync(absolutePdfPath)) {
      fs.unlinkSync(absolutePdfPath);
    }

    return res.json({ message: 'Invoice and associated PDF deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Patch status of the invoice and regenerate the PDF file to reflect the change
const updateInvoiceStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const result = await db.query(
      'UPDATE invoices SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = result.rows[0];
    
    // Regenerate PDF with updated status stamp
    const clientResult = await db.query('SELECT * FROM clients WHERE id = $1', [invoice.client_id]);
    const clientData = clientResult.rows[0];
    const itemsResult = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC', [id]);

    const absolutePdfPath = path.join(__dirname, '..', 'pdfs', `${invoice.invoice_number}.pdf`);
    await generateInvoicePDF(invoice, clientData, itemsResult.rows, absolutePdfPath);

    return res.json(invoice);
  } catch (error) {
    console.error('Error patching invoice status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Retrieve/Download PDF binary
const getInvoicePDF = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT invoice_number FROM invoices WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const invoiceNumber = result.rows[0].invoice_number;
    const pdfFilename = `${invoiceNumber}.pdf`;
    const absolutePdfPath = path.join(__dirname, '..', 'pdfs', pdfFilename);

    if (!fs.existsSync(absolutePdfPath)) {
      // Regenerate if file missing
      const invQuery = `
        SELECT i.*, c.name, c.phone, c.email, c.address, c.gstin
        FROM invoices i
        JOIN clients c ON i.client_id = c.id
        WHERE i.id = $1
      `;
      const invResult = await db.query(invQuery, [id]);
      const invoiceData = invResult.rows[0];
      const itemsResult = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC', [id]);
      
      const clientObj = {
        name: invoiceData.name,
        phone: invoiceData.phone,
        email: invoiceData.email,
        address: invoiceData.address,
        gstin: invoiceData.gstin
      };

      await generateInvoicePDF(invoiceData, clientObj, itemsResult.rows, absolutePdfPath);
    }

    return res.download(absolutePdfPath, pdfFilename);
  } catch (error) {
    console.error('Error processing PDF download:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
  getInvoicePDF
};
