-- Seed Data for BillBook System

-- Seed admin user
-- Username: admin, Password: admin123
INSERT INTO admins (username, password_hash)
VALUES ('admin', '$2a$10$flScsty/zDaikE748YBShOL3ayUd8Q77QH98RXrctLPmeqS9QC4Aq')
ON CONFLICT (username) DO NOTHING;

-- Seed clients
INSERT INTO clients (name, phone, email, address, gstin)
VALUES 
('Acme Corp', '9876543210', 'acme@example.com', '123 Industrial Area, Phase 1, New Delhi', '07AAAAA1111A1Z1'),
('Sharma Grocery', '9876543211', 'sharma@example.com', 'Sector 4, Rohini, New Delhi', '07BBBBB2222B2Z2'),
('Rajesh Traders', '9876543212', 'rajesh@example.com', 'Chawri Bazar, Old Delhi', '07CCCCC3333C3Z3');

-- Seed invoices (will trigger the invoice_num_seq sequence)
-- Invoice 1: Acme Corp, paid
INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, status, subtotal, discount_percent, discount_amount, cgst_percent, sgst_percent, igst_percent, tax_amount, total, notes, pdf_path)
VALUES ('INV-0001', 1, '2026-05-01', '2026-05-15', 'paid', 1000.00, 10.00, 100.00, 9.00, 9.00, 0.00, 162.00, 1062.00, 'Paid via bank transfer', '/pdfs/INV-0001.pdf');

-- Invoice 2: Sharma Grocery, sent (partially paid)
INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, status, subtotal, discount_percent, discount_amount, cgst_percent, sgst_percent, igst_percent, tax_amount, total, notes, pdf_path)
VALUES ('INV-0002', 2, '2026-05-10', '2026-05-24', 'sent', 2000.00, 0.00, 0.00, 9.00, 9.00, 0.00, 360.00, 2360.00, 'Please pay before due date', '/pdfs/INV-0002.pdf');

-- Invoice 3: Rajesh Traders, overdue (unpaid)
INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, status, subtotal, discount_percent, discount_amount, cgst_percent, sgst_percent, igst_percent, tax_amount, total, notes, pdf_path)
VALUES ('INV-0003', 3, '2026-04-15', '2026-04-30', 'overdue', 500.00, 0.00, 0.00, 9.00, 9.00, 0.00, 90.00, 590.00, 'Urgent payment required', '/pdfs/INV-0003.pdf');

-- Invoice 4: Acme Corp, draft
INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, status, subtotal, discount_percent, discount_amount, cgst_percent, sgst_percent, igst_percent, tax_amount, total, notes, pdf_path)
VALUES ('INV-0004', 1, '2026-05-25', '2026-06-08', 'draft', 1500.00, 5.00, 75.00, 0.00, 0.00, 18.00, 256.50, 1681.50, 'Draft invoice for review', '/pdfs/INV-0004.pdf');

-- Invoice 5: Sharma Grocery, paid
INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, status, subtotal, discount_percent, discount_amount, cgst_percent, sgst_percent, igst_percent, tax_amount, total, notes, pdf_path)
VALUES ('INV-0005', 2, '2026-05-20', '2026-06-03', 'paid', 800.00, 0.00, 0.00, 9.00, 9.00, 0.00, 144.00, 944.00, 'Paid via Cash', '/pdfs/INV-0005.pdf');

-- Synchronize the sequence for invoice numbers
SELECT setval('invoice_num_seq', 5, true);

-- Seed invoice items
-- Invoice 1 items
INSERT INTO invoice_items (invoice_id, description, quantity, unit, rate, amount) VALUES 
(1, 'Item A', 10.00, 'pcs', 50.00, 500.00),
(1, 'Item B', 5.00, 'pcs', 100.00, 500.00);

-- Invoice 2 items
INSERT INTO invoice_items (invoice_id, description, quantity, unit, rate, amount) VALUES 
(2, 'Item C', 2.00, 'pcs', 1000.00, 2000.00);

-- Invoice 3 items
INSERT INTO invoice_items (invoice_id, description, quantity, unit, rate, amount) VALUES 
(3, 'Item D', 1.00, 'pcs', 500.00, 500.00);

-- Invoice 4 items
INSERT INTO invoice_items (invoice_id, description, quantity, unit, rate, amount) VALUES 
(4, 'Item E', 3.00, 'pcs', 500.00, 1500.00);

-- Invoice 5 items
INSERT INTO invoice_items (invoice_id, description, quantity, unit, rate, amount) VALUES 
(5, 'Item F', 8.00, 'pcs', 100.00, 800.00);

-- Seed payments
-- Invoice 1 full payment
INSERT INTO payments (invoice_id, amount, payment_date, method, note) VALUES
(1, 1062.00, '2026-05-02', 'bank transfer', 'Full payment received');

-- Invoice 2 partial payment
INSERT INTO payments (invoice_id, amount, payment_date, method, note) VALUES
(2, 1000.00, '2026-05-12', 'UPI', 'Partial payment');

-- Invoice 5 full payment
INSERT INTO payments (invoice_id, amount, payment_date, method, note) VALUES
(5, 944.00, '2026-05-22', 'cash', 'Paid in cash');
