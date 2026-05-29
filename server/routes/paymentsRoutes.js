// Payments routes
const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/paymentsController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect route
router.post('/', authMiddleware, paymentsController.recordPayment);
router.get('/', authMiddleware, paymentsController.getPayments);

module.exports = router;
