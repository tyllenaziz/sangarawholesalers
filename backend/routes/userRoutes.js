const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.use(verifyToken);

// --- More Specific Routes FIRST ---
// Get all activity logs (Admin only)
router.get('/activity-logs', checkRole('admin'), userController.getActivityLogs); // <--- THIS SHOULD COME FIRST

// --- General User Routes ---
// Get all users (Admin or manager)
router.get('/', checkRole('admin', 'inventory_manager'), userController.getAllUsers);

// Get specific user for details (Admin or manager)
router.get('/:id', checkRole('admin', 'inventory_manager'), userController.getUser); // <--- THEN THIS

// Create new user (Admin only)
router.post('/', checkRole('admin'), userController.createUser);

// Update user details (Admin only)
router.put('/:id', checkRole('admin'), userController.updateUser);

// Toggle user active status (Admin only)
router.patch('/:id/status', checkRole('admin'), userController.toggleUserActiveStatus);

// Delete user (Admin only)
router.delete('/:id', checkRole('admin'), userController.deleteUser);

module.exports = router;