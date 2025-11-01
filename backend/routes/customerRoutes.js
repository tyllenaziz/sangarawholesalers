const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// All customer routes require authentication
router.use(verifyToken);

// Get all customers (admin, cashier, inventory_manager)
router.get('/', checkRole('admin', 'cashier', 'inventory_manager'), customerController.getAllCustomers);

// Get single customer (admin, cashier, inventory_manager)
router.get('/:id', checkRole('admin', 'cashier', 'inventory_manager'), customerController.getCustomer);

// Create customer (admin, cashier)
router.post('/', checkRole('admin', 'cashier'), customerController.createCustomer);

// Update customer (admin, cashier)
router.put('/:id', checkRole('admin', 'cashier'), customerController.updateCustomer);

// Delete customer (admin only - due to potential data integrity impacts)
router.delete('/:id', checkRole('admin'), customerController.deleteCustomer);

module.exports = router;