const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// =========================
// ✅ CORS Configuration
// =========================
const allowedOrigins = [
  process.env.FRONTEND_URL || "https://sangarawholesalers.vercel.app", // your live frontend
  "http://localhost:5173", // allow local dev
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`❌ Blocked by CORS: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// =========================
// ✅ Middleware
// =========================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// =========================
// ✅ Base Route
// =========================
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Sangara Wholesalers API',
    version: '1.0.0',
    status: 'active',
  });
});

// =========================
// ✅ API Routes
// =========================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/sales', require('./routes/salesRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));
app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/stock-adjustments', require('./routes/stockAdjustmentRoutes'));
app.use('/api/tax-rates', require('./routes/taxRateRoutes'));
app.use('/api/discount-rules', require('./routes/discountRuleRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));

// =========================
// ✅ Error Handling
// =========================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// =========================
// ✅ Server Startup
// =========================
const PORT = process.env.PORT || 5000;

// Detect your Render public URL dynamically
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL ;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 API URL: ${RENDER_EXTERNAL_URL}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// =========================
// ✅ Keep Server Alive (Render)
// =========================
if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
  const https = require('https');
  const http = require('http');
  
  const PING_INTERVAL = 8* 60 * 1000; // 10 minutes
  
  function pingServer() {
    const url = new URL(RENDER_EXTERNAL_URL);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: '/',
      method: 'GET',
      timeout: 10000,
    };

    console.log(`🔄 Keep-alive ping at ${new Date().toISOString()}`);

    const req = protocol.request(options, (res) => {
      console.log(`✅ Keep-alive ping successful! Status: ${res.statusCode}`);
      res.on('data', () => {});
    });

    req.on('error', (error) => {
      console.error(`❌ Keep-alive ping failed:`, error.message);
    });

    req.on('timeout', () => {
      console.error(`⏱️ Keep-alive ping timed out`);
      req.destroy();
    });

    req.end();
  }

  // Start keep-alive pings
  console.log('🚀 Starting keep-alive service...');
  console.log(`⏰ Pinging every ${PING_INTERVAL / 1000 / 60} minutes`);
  
  // Initial ping after 2 minutes
  setTimeout(pingServer, 2 * 60 * 1000);
  
  // Regular pings every 10 minutes
  setInterval(pingServer, PING_INTERVAL);
}