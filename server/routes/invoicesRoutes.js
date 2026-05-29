// Invoices routes
const express = require('express');
const router = express.Router();
const invoicesController = require('../controllers/invoicesController');
const authMiddleware = require('../middleware/authMiddleware');

// Public route for downloading invoice PDFs (so browser tabs can download directly)
router.get('/:id/pdf', invoicesController.getInvoicePDF);

// Protect all other invoice routes
router.use(authMiddleware);

router.get('/', invoicesController.getInvoices);
router.get('/:id', invoicesController.getInvoiceById);
router.post('/', invoicesController.createInvoice);
router.put('/:id', invoicesController.updateInvoice);
router.delete('/:id', invoicesController.deleteInvoice);
router.patch('/:id/status', invoicesController.updateInvoiceStatus);

module.exports = router;
