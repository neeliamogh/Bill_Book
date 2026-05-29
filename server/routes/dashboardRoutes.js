// Dashboard routes
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect route
router.get('/stats', authMiddleware, dashboardController.getDashboardStats);

module.exports = router;
