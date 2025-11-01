const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// Get all categories (all authenticated users)
router.get('/', categoryController.getAllCategories);

// Get single category (all authenticated users)
router.get('/:id', categoryController.getCategory);

// Create category (admin and inventory_manager only)
router.post('/', 
  checkRole('admin', 'inventory_manager'), 
  categoryController.createCategory
);

// Update category (admin and inventory_manager only)
router.put('/:id', 
  checkRole('admin', 'inventory_manager'), 
  categoryController.updateCategory
);

// Delete category (admin only)
router.delete('/:id', 
  checkRole('admin'), 
  categoryController.deleteCategory
);

module.exports = router;