
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// All report routes require authentication and specific roles
router.use(verifyToken);
// Generally, admin and inventory_manager would have access to all reports.
// Cashiers might have access to basic sales reports. For now, let's keep it broad for 'admin', 'inventory_manager', 'cashier'
router.use(checkRole('admin', 'inventory_manager', 'cashier')); // <--- Ensure broad access for all reports

// Sales Reports
router.get('/sales/summary', reportController.getSalesSummaryReport);
router.get('/sales/product-wise', reportController.getProductWiseSales);
// Corrected checkRole for daily-trend to include 'cashier' if they can view charts
router.get('/sales/daily-trend', checkRole('admin', 'inventory_manager', 'cashier'), reportController.getDailySalesAndProfitTrend); // <-- UPDATED THIS LINE

// Inventory Reports
router.get('/inventory/overview', reportController.getInventoryOverviewReport);
router.get('/inventory/low-stock', reportController.getLowStockProductsReport);
router.get('/inventory/near-expiry', reportController.getNearExpiryProductsReport);

// Profit Reports
router.get('/profit/summary', reportController.getProfitSummaryReport);

// Customer Reports
router.get('/customers/top', reportController.getTopCustomersReport);
router.get('/customers/frequent', reportController.getFrequentCustomersReport);
router.get('/customers/total', reportController.getTotalCustomersReport);

module.exports = router;