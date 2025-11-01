const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// Get all sales (admin and cashier)
router.get('/', 
  checkRole('admin', 'cashier'), 
  salesController.getAllSales
);

// Get today's summary
router.get('/summary/today', 
  checkRole('admin', 'cashier'), 
  salesController.getTodaySummary
);

// Get statistics
router.get('/statistics', 
  checkRole('admin', 'cashier'), 
  salesController.getStatistics
);

// Get sale by invoice number
router.get('/invoice/:invoice', 
  checkRole('admin', 'cashier'), 
  salesController.getSaleByInvoice
);

// Get sale by ID
router.get('/:id', 
  checkRole('admin', 'cashier'), 
  salesController.getSale
);

// Create sale (admin and cashier)
router.post('/', 
  checkRole('admin', 'cashier'), 
  salesController.createSale
);

module.exports = router;