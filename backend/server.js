const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Sangara Wholesalers API',
    version: '1.0.0',
    status: 'active'
  });
});

// API Routes
// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/sales', require('./routes/salesRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/users', require('./routes/userRoutes')); // <-- ADD THIS LINE
app.use('/api/settings', require('./routes/settingRoutes')); // <-- ADD THIS LINE
app.use('/api/purchases', require('./routes/purchaseRoutes')); // <-- ADD THIS LINE
app.use('/api/stock-adjustments', require('./routes/stockAdjustmentRoutes')); // <-- ADD THIS LINE
app.use('/api/tax-rates', require('./routes/taxRateRoutes'));     // <-- ADD THIS LINE
app.use('/api/discount-rules', require('./routes/discountRuleRoutes')); // <-- ADD THIS LINE
app.use('/api/payment', require('./routes/paymentRoutes')); // <-- ADD THIS LINE
// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});