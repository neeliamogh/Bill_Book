// Clients routes
const express = require('express');
const router = express.Router();
const clientsController = require('../controllers/clientsController');
const authMiddleware = require('../middleware/authMiddleware');

// Protect all client routes
router.use(authMiddleware);

router.get('/', clientsController.getClients);
router.get('/search', clientsController.searchClientByPhone);
router.post('/', clientsController.createClient);
router.put('/:id', clientsController.updateClient);
router.delete('/:id', clientsController.deleteClient);

module.exports = router;
