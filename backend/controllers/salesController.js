const Sale = require('../models/Sale');
const db = require('../config/database');

// Create a new sale
const createSale = async (req, res) => {
  try {
    const { 
      items, 
      customer_id, 
      subtotal, 
      discount, 
      tax_rate,  // <-- ADD THIS
      tax, 
      total, 
      amount_paid, 
      payment_method, 
      payment_status,  // <-- ADD THIS
      notes 
    } = req.body;

    // Validation
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sale must have at least one item'
      });
    }

    // Allow partial payment for credit sales
    const finalPaymentStatus = payment_status || 'paid';
    if (finalPaymentStatus !== 'credit' && finalPaymentStatus !== 'partial' && amount_paid < total) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment amount'
      });
    }

    // Check stock availability for all items
    for (const item of items) {
      const [product] = await db.query(
        'SELECT quantity_in_stock FROM products WHERE id = ?',
        [item.product_id]
      );

      if (!product[0] || product[0].quantity_in_stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.product_name}`
        });
      }
    }

    // Generate invoice number
    const invoice_number = await Sale.generateInvoiceNumber();

    // Calculate change
    const change_amount = amount_paid - total;

    // Create sale
    const saleData = {
      invoice_number,
      customer_id: customer_id || null,
      user_id: req.user.id,
      subtotal: parseFloat(subtotal) || 0,
      discount: parseFloat(discount) || 0,
      loyalty_points_redeemed: 0,  // <-- ADD THIS (default to 0 for now)
      loyalty_discount_amount: 0,   // <-- ADD THIS (default to 0 for now)
      tax_rate: parseFloat(tax_rate) || 0.16,  // <-- ADD THIS
      tax: parseFloat(tax) || 0,
      total: parseFloat(total) || 0,
      amount_paid: parseFloat(amount_paid) || 0,
      change_amount: parseFloat(change_amount) || 0,
      payment_method: payment_method || 'cash',
      payment_status: finalPaymentStatus,
      notes: notes || null
    };

    const saleId = await Sale.create(saleData, items);

    // Log activity
    await db.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
      [req.user.id, 'SALE_CREATED', `Created sale ${invoice_number} - KES ${total}`]
    );

    // Get complete sale details
    const sale = await Sale.findById(saleId);

    res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      data: sale
    });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sale',
      error: error.message
    });
  }
};

// Get sale by ID
const getSale = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findById(id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sale',
      error: error.message
    });
  }
};

// Get sale by invoice number
const getSaleByInvoice = async (req, res) => {
  try {
    const { invoice } = req.params;
    const sale = await Sale.findByInvoice(invoice);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('Get sale by invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sale',
      error: error.message
    });
  }
};

// Get all sales
const getAllSales = async (req, res) => {
  try {
    const { start_date, end_date, payment_method, user_id } = req.query;

    const filters = {};
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;
    if (payment_method) filters.payment_method = payment_method;
    if (user_id) filters.user_id = user_id;

    const sales = await Sale.findAll(filters);

    res.json({
      success: true,
      data: sales,
      count: sales.length
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales',
      error: error.message
    });
  }
};

// Get today's sales summary
const getTodaySummary = async (req, res) => {
  try {
    const summary = await Sale.getTodaySummary();

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summary',
      error: error.message
    });
  }
};

// Get sales statistics
const getStatistics = async (req, res) => {
  try {
    const { period, start_date, end_date } = req.query;

    const filters = {};
    if (start_date && end_date) {
      filters.start_date = start_date;
      filters.end_date = end_date;
    } else if (period) {
      filters.period = period;
    }

    const stats = await Sale.getStatistics(filters);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

module.exports = {
  createSale,
  getSale,
  getSaleByInvoice,
  getAllSales,
  getTodaySummary,
  getStatistics
};