const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// Get all suppliers
router.get('/', supplierController.getAllSuppliers);

// Get supplier statistics
router.get('/statistics', supplierController.getStatistics);

// Get single supplier
router.get('/:id', supplierController.getSupplier);

// Create supplier (admin and inventory_manager only)
router.post('/', 
  checkRole('admin', 'inventory_manager'), 
  supplierController.createSupplier
);

// Update supplier (admin and inventory_manager only)
router.put('/:id', 
  checkRole('admin', 'inventory_manager'), 
  supplierController.updateSupplier
);

// Update supplier balance (admin only)
router.patch('/:id/balance', 
  checkRole('admin'), 
  supplierController.updateBalance
);

// Delete supplier (admin only)
router.delete('/:id', 
  checkRole('admin'), 
  supplierController.deleteSupplier
);

module.exports = router;