const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Route for M-Pesa callback (MUST be publicly accessible, NO AUTHENTICATION)
// Daraja API will send requests to this endpoint directly.
router.post('/callback', paymentController.handleCallback);

// Routes requiring POS authentication (e.g., cashier initiating STK push)
router.use(verifyToken);
router.use(checkRole('admin', 'cashier')); // Only admin and cashier can initiate M-Pesa transactions

// Route for initiating STK Push (POS client sends request)
router.post('/stk-push', paymentController.initiateStkPush);

// Route for checking payment status
router.post('/check-status', paymentController.checkPaymentStatus);

module.exports = router;