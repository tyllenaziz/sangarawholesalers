const express = require('express');
const router = express.Router();
const stockAdjustmentController = require('../controllers/stockAdjustmentController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// All stock adjustment routes require authentication and specific roles
router.use(verifyToken);
router.use(checkRole('admin', 'inventory_manager')); // Only admin and inventory managers can adjust stock

// Create a new stock adjustment
router.post('/', stockAdjustmentController.createStockAdjustment);

// Get all stock adjustments (history)
router.get('/', stockAdjustmentController.getAllStockAdjustments);

// Get stock movement history for a specific product
router.get('/products/:id/movement', stockAdjustmentController.getProductMovementHistory);

module.exports = router;