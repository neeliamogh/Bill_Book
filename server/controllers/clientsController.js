// Clients controller for client operations
const db = require('../db/db');

// List all clients with invoice summary details
const getClients = async (req, res) => {
  try {
    const query = `
      SELECT c.*, 
        COALESCE(count(i.id), 0)::integer as invoices_count,
        COALESCE(sum(i.total), 0)::numeric as total_billed
      FROM clients c
      LEFT JOIN invoices i ON c.id = i.client_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `;
    const result = await db.query(query);
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Search client by phone number and retrieve full invoicing/payment history
const searchClientByPhone = async (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number query parameter is required' });
  }

  try {
    // Fetch client
    const clientResult = await db.query('SELECT * FROM clients WHERE phone = $1', [phone]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    const client = clientResult.rows[0];

    // Fetch invoices for client
    const invoicesResult = await db.query(
      `SELECT id, invoice_number, issue_date, due_date, status, total 
       FROM invoices 
       WHERE client_id = $1 
       ORDER BY issue_date DESC, id DESC`,
      [client.id]
    );
    const invoices = invoicesResult.rows;

    let totalBilled = 0;
    let totalPaid = 0;

    // Fetch payments for each invoice
    const invoicesWithPayments = await Promise.all(
      invoices.map(async (inv) => {
        const pmtsResult = await db.query(
          'SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE invoice_id = $1',
          [inv.id]
        );
        const paid = parseFloat(pmtsResult.rows[0].paid || 0);
        const invTotal = parseFloat(inv.total);
        
        totalBilled += invTotal;
        totalPaid += paid;

        return {
          id: inv.id,
          invoice_number: inv.invoice_number,
          issue_date: inv.issue_date,
          due_date: inv.due_date,
          status: inv.status,
          total: invTotal,
          total_paid: paid,
          outstanding: invTotal - paid
        };
      })
    );

    const outstanding = totalBilled - totalPaid;

    return res.json({
      client,
      invoices: invoicesWithPayments,
      summary: {
        total_billed: totalBilled,
        total_paid: totalPaid,
        outstanding: outstanding
      }
    });
  } catch (error) {
    console.error('Error searching client by phone:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new client
const createClient = async (req, res) => {
  const { name, phone, email, address, gstin } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  try {
    const checkPhone = await db.query('SELECT id FROM clients WHERE phone = $1', [phone]);
    if (checkPhone.rows.length > 0) {
      return res.status(400).json({ error: 'Client with this phone number already exists' });
    }

    const result = await db.query(
      `INSERT INTO clients (name, phone, email, address, gstin) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [name, phone, email || null, address || null, gstin || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating client:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update an existing client
const updateClient = async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address, gstin } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  try {
    const checkPhone = await db.query('SELECT id FROM clients WHERE phone = $1 AND id != $2', [phone, id]);
    if (checkPhone.rows.length > 0) {
      return res.status(400).json({ error: 'Another client with this phone number already exists' });
    }

    const result = await db.query(
      `UPDATE clients 
       SET name = $1, phone = $2, email = $3, address = $4, gstin = $5 
       WHERE id = $6 
       RETURNING *`,
      [name, phone, email || null, address || null, gstin || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating client:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a client if there are no linked invoices
const deleteClient = async (req, res) => {
  const { id } = req.params;
  try {
    const checkInvoices = await db.query('SELECT id FROM invoices WHERE client_id = $1 LIMIT 1', [id]);
    if (checkInvoices.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete client. Client has associated invoices.' });
    }

    const result = await db.query('DELETE FROM clients WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    return res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getClients, searchClientByPhone, createClient, updateClient, deleteClient };
