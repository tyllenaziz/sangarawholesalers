const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// Get all products
router.get('/', productController.getAllProducts);

// Get product statistics
router.get('/statistics', productController.getStatistics);

// Get low stock products
router.get('/low-stock', productController.getLowStockProducts);

// Get single product
router.get('/:id', productController.getProduct);

// Create product (admin and inventory_manager only)
router.post('/', 
  checkRole('admin', 'inventory_manager'), 
  productController.createProduct
);

// Update product (admin and inventory_manager only)
router.put('/:id', 
  checkRole('admin', 'inventory_manager'), 
  productController.updateProduct
);

// Update stock quantity (admin and inventory_manager only)
router.patch('/:id/stock', 
  checkRole('admin', 'inventory_manager'), 
  productController.updateStock
);

// Delete product (admin only)
router.delete('/:id', 
  checkRole('admin'), 
  productController.deleteProduct
);

module.exports = router;