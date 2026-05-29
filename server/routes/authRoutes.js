// Auth routes
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public route
router.post('/login', authController.login);

// Protected route
router.get('/verify', authMiddleware, authController.verify);

module.exports = router;
