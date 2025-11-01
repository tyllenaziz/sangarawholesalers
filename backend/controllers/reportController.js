const db = require('../config/database');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const moment = require('moment'); // <--- ADD THIS LINE!
// Assuming Customer model will be created later, for now direct queries for customers
// const Customer = require('../models/Customer'); 

// Helper function to get date conditions based on query params
const getDateConditions = (queryParams, dateField = 'created_at') => {
  let conditionParts = [];
  const params = [];

  if (queryParams.start_date) {
    conditionParts.push(`DATE(${dateField}) >= ?`);
    params.push(queryParams.start_date);
  }
  if (queryParams.end_date) {
    conditionParts.push(`DATE(${dateField}) <= ?`);
    params.push(queryParams.end_date);
  }

  // If no custom dates, fallback to period
  if (conditionParts.length === 0 && queryParams.period) {
    switch (queryParams.period) {
      case 'today':
        conditionParts.push(`DATE(${dateField}) = CURDATE()`);
        break;
      case 'week':
        conditionParts.push(`YEARWEEK(${dateField}, 1) = YEARWEEK(CURDATE(), 1)`); // 1 means week starts on Monday
        break;
      case 'month':
        conditionParts.push(`MONTH(${dateField}) = MONTH(CURDATE()) AND YEAR(${dateField}) = YEAR(CURDATE())`);
        break;
      case 'year':
        conditionParts.push(`YEAR(${dateField}) = YEAR(CURDATE())`);
        break;
      default:
        // No period or unrecognized, default to today if nothing else is specified.
        // Or handle as an error if strict. For now, let's just not add a condition.
        break;
    }
  }
  
  // If no date conditions are specified at all, return empty
  if (conditionParts.length === 0) {
      return { condition: '1=1', params: [] }; // Return '1=1' to avoid breaking SQL query structure
  }

  return { condition: conditionParts.join(' AND '), params };
};

// 1. Sales Reports
// Get Sales Summary (reusing Sale.getStatistics)
const getSalesSummaryReport = async (req, res) => {
  try {
    // Pass entire req.query (which contains period, start_date, end_date) to Sale.getStatistics
    const summary = await Sale.getStatistics(req.query); // <--- CHANGED THIS LINE

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get sales summary report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales summary',
      error: error.message
    });
  }
};

// Get Product-wise Sales
// Change `const { condition, params } = getDateConditions(period, 's.created_at');`
// To: `const { condition, params } = getDateConditions(req.query, 's.created_at');`
const getProductWiseSales = async (req, res) => {
  try {
    const { condition, params } = getDateConditions(req.query, 's.created_at');

    const query = `
      SELECT 
        si.product_id,
        si.product_name,
        SUM(si.quantity) as total_quantity_sold,
        SUM(si.subtotal) as total_revenue_from_product
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE ${condition}
      GROUP BY si.product_id, si.product_name
      ORDER BY total_revenue_from_product DESC
      LIMIT 20
    `;
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get product-wise sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product-wise sales',
      error: error.message
    });
  }
};

// 2. Inventory Reports
// Get Inventory Overview (reusing Product.getStatistics)
const getInventoryOverviewReport = async (req, res) => {
  try {
    const overview = await Product.getStatistics();
    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('Get inventory overview report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory overview',
      error: error.message
    });
  }
};

// Get Low Stock Products (reusing Product.getLowStock)
const getLowStockProductsReport = async (req, res) => {
  try {
    const products = await Product.getLowStock();
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Get low stock products report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock products',
      error: error.message
    });
  }
};

// Get Near Expiry Products (NEW query)
// Get Near Expiry Products (FIXED VERSION)
const getNearExpiryProductsReport = async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.days) || 30; // Allow configurable days, default 30

    // Get current date and future date for comparison
    const today = moment().format('YYYY-MM-DD');
    const futureDate = moment().add(daysAhead, 'days').format('YYYY-MM-DD');

    console.log('=== Near Expiry Products Report Debug ===');
    console.log('Today:', today);
    console.log('Checking products expiring before:', futureDate);
    console.log('Days ahead:', daysAhead);

    // First, let's check if there are ANY products with expiry dates
    const [allProducts] = await db.query(
      `SELECT COUNT(*) as total, 
              COUNT(CASE WHEN expiry_date IS NOT NULL THEN 1 END) as with_expiry,
              COUNT(CASE WHEN expiry_date IS NOT NULL AND quantity_in_stock > 0 THEN 1 END) as with_expiry_and_stock
       FROM products 
       WHERE is_active = true`
    );
    console.log('Total active products:', allProducts[0].total);
    console.log('Products with expiry dates:', allProducts[0].with_expiry);
    console.log('Products with expiry dates and stock:', allProducts[0].with_expiry_and_stock);

    // Check products with expiry dates in detail
    const [expiryCheck] = await db.query(
      `SELECT id, name, sku, expiry_date, quantity_in_stock, 
              DATEDIFF(expiry_date, CURDATE()) as days_until_expiry
       FROM products 
       WHERE expiry_date IS NOT NULL 
       AND is_active = true
       ORDER BY expiry_date ASC
       LIMIT 10`
    );
    console.log('Sample products with expiry dates:', JSON.stringify(expiryCheck, null, 2));

    // Main query - Products expiring within the specified days
    const [rows] = await db.query(
      `SELECT 
         p.id, 
         p.name, 
         p.sku, 
         p.quantity_in_stock, 
         p.expiry_date,
         DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry,
         c.name as category_name, 
         s.name as supplier_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.expiry_date IS NOT NULL 
       AND p.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
       AND p.quantity_in_stock > 0
       AND p.is_active = true
       ORDER BY p.expiry_date ASC`,
      [daysAhead]
    );

    console.log('Products found near expiry:', rows.length);
    console.log('=== End Debug ===');

    res.json({
      success: true,
      data: rows,
      debug: {
        today,
        futureDate,
        daysAhead,
        totalFound: rows.length,
        totalActive: allProducts[0].total,
        withExpiry: allProducts[0].with_expiry,
        withExpiryAndStock: allProducts[0].with_expiry_and_stock
      }
    });
  } catch (error) {
    console.error('Get near expiry products report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch near expiry products',
      error: error.message
    });
  }
};
// 3. Profit Reports
// Get Profit Summary (reusing Sale.getStatistics for estimated profit)
// Get Profit Summary (reusing Sale.getStatistics for estimated profit)
const getProfitSummaryReport = async (req, res) => {
  try {
    // Pass entire req.query (which contains period, start_date, end_date) to Sale.getStatistics
    const summary = await Sale.getStatistics(req.query); // <--- CHANGED THIS LINE

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get profit summary report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profit summary',
      error: error.message
    });
  }
};

// 4. Customer Reports
// Get Top Customers (by total purchases)
const getTopCustomersReport = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const [rows] = await db.query(
      `SELECT id, name, email, phone, total_purchases
       FROM customers
       ORDER BY total_purchases DESC
       LIMIT ?`,
      [parseInt(limit)]
    );
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Get top customers report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top customers',
      error: error.message
    });
  }
};

// Get Frequent Shoppers (by number of transactions)
const getFrequentCustomersReport = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const [rows] = await db.query(
      `SELECT c.id, c.name, c.email, c.phone, COUNT(s.id) as total_transactions
       FROM customers c
       JOIN sales s ON c.id = s.customer_id
       GROUP BY c.id, c.name, c.email, c.phone
       ORDER BY total_transactions DESC
       LIMIT ?`,
      [parseInt(limit)]
    );
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Get frequent customers report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch frequent customers',
      error: error.message
    });
  }
};
// Get Total Customers
const getTotalCustomersReport = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as total_customers FROM customers`
    );
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Get total customers report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch total customers',
      error: error.message
    });
  }
};
// Get Daily Sales and Profit Trend (NEW FUNCTION)
const getDailySalesAndProfitTrend = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Basic validation
    if (!start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'Start and end dates are required for trend report.' });
    }

    const query = `
      SELECT 
          DATE(s.created_at) as date,
          SUM(s.total) as total_revenue,
          SUM(s.subtotal - (SELECT SUM(si.quantity * p.cost_price) 
                            FROM sale_items si 
                            JOIN products p ON si.product_id = p.id 
                            WHERE si.sale_id = s.id)) as estimated_profit
      FROM sales s
      WHERE DATE(s.created_at) BETWEEN ? AND ?
      GROUP BY DATE(s.created_at)
      ORDER BY date ASC;
    `;
    const [rows] = await db.query(query, [start_date, end_date]);

    // Fill in missing dates with zero data for a continuous chart
    const allDates = [];
    let currentDate = moment(start_date);
    const endDateMoment = moment(end_date);
    while (currentDate.isSameOrBefore(endDateMoment)) {
      allDates.push(currentDate.format('YYYY-MM-DD'));
      currentDate.add(1, 'days');
    }

    const formattedData = allDates.map(date => {
        const found = rows.find(row => moment(row.date).format('YYYY-MM-DD') === date);
        return {
            name: moment(date).format('ddd MMM DD'), // Format for X-axis label
            Sales: found ? parseFloat(found.total_revenue) : 0,
            Profit: found ? parseFloat(found.estimated_profit) : 0,
        };
    });


    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Get daily sales and profit trend error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily sales and profit trend',
      error: error.message
    });
  }
};

module.exports = {
  getSalesSummaryReport,
  getProductWiseSales,
  getInventoryOverviewReport,
  getLowStockProductsReport,
  getNearExpiryProductsReport,
  getProfitSummaryReport,
  getTopCustomersReport,
  getFrequentCustomersReport,
 getTotalCustomersReport,
  getDailySalesAndProfitTrend,
};