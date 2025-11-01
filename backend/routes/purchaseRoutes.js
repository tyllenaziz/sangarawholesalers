const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// All purchase order routes require authentication
router.use(verifyToken);

// Get all purchase orders (Admin, Inventory Manager)
router.get('/', checkRole('admin', 'inventory_manager'), purchaseController.getAllPurchaseOrders);

// Get a single purchase order by ID (Admin, Inventory Manager)
router.get('/:id', checkRole('admin', 'inventory_manager'), purchaseController.getPurchaseOrder);

// Create a new purchase order (Admin, Inventory Manager)
router.post('/', checkRole('admin', 'inventory_manager'), purchaseController.createPurchaseOrder);

// Update a purchase order (Admin, Inventory Manager - only 'ordered' status)
router.put('/:id', checkRole('admin', 'inventory_manager'), purchaseController.updatePurchaseOrder);

// Mark purchase order as received (updates stock) (Admin, Inventory Manager)
router.patch('/:id/receive', checkRole('admin', 'inventory_manager'), purchaseController.receivePurchaseOrder);

// Mark purchase order as canceled (Admin, Inventory Manager)
router.patch('/:id/cancel', checkRole('admin', 'inventory_manager'), purchaseController.cancelPurchaseOrder);

// Record payment for a purchase order (Admin, Inventory Manager)
router.patch('/:id/payment', checkRole('admin', 'inventory_manager'), purchaseController.recordPurchasePayment);

module.exports = router;