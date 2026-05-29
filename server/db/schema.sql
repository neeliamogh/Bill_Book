-- SQL Schema for BillBook Invoice & Billing System

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(200),
    address TEXT,
    gstin VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_num_seq START 1;

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE DEFAULT 'INV-' || lpad(nextval('invoice_num_seq')::text, 4, '0'),
    client_id INTEGER REFERENCES clients(id) ON DELETE RESTRICT,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft', -- draft, sent, paid, overdue
    subtotal DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    cgst_percent DECIMAL(5,2) DEFAULT 9,
    sgst_percent DECIMAL(5,2) DEFAULT 9,
    igst_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    notes TEXT,
    pdf_path VARCHAR(300),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(300) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- hrs, pcs, kg, etc.
    rate DECIMAL(10,2) NOT NULL,
    amount DECIMAL(10,2) NOT NULL
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    method VARCHAR(50) NOT NULL, -- cash, UPI, bank transfer, cheque
    note TEXT
);
