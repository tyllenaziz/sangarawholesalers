const StockAdjustment = require('../models/StockAdjustment');
const Product = require('../models/Product'); // To get product list for forms
const db = require('../config/database'); // For activity logging

// Helper to log user activity (reusing the one from authController)
const logActivity = async (userId, action, description, ipAddress) => {
  try {
    await db.query(
      'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
      [userId, action, description, ipAddress]
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

// Create a new stock adjustment
const createStockAdjustment = async (req, res) => {
  try {
    const { product_id, adjustment_type, quantity, reason } = req.body;

    if (!product_id || !adjustment_type || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Product, adjustment type, and a positive quantity are required.'
      });
    }

    const adjustmentId = await StockAdjustment.create({
      product_id,
      user_id: req.user.id, // User performing the adjustment
      adjustment_type,
      quantity,
      reason
    });

    await logActivity(req.user.id, 'STOCK_ADJUSTED', `Stock adjustment for product ${product_id} (${adjustment_type}, quantity: ${quantity})`, req.ip);

    res.status(201).json({
      success: true,
      message: 'Stock adjustment recorded successfully',
      data: { id: adjustmentId }
    });
  } catch (error) {
    console.error('Create stock adjustment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create stock adjustment',
      error: error.message
    });
  }
};

// Get all stock adjustments
const getAllStockAdjustments = async (req, res) => {
  try {
    const { product_id, user_id, adjustment_type, start_date, end_date, search } = req.query;
    const filters = {};
    if (product_id) filters.product_id = product_id;
    if (user_id) filters.user_id = user_id;
    if (adjustment_type) filters.adjustment_type = adjustment_type;
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;
    if (search) filters.search = search;

    const adjustments = await StockAdjustment.findAll(filters);

    res.json({
      success: true,
      data: adjustments,
      count: adjustments.length
    });
  } catch (error) {
    console.error('Get all stock adjustments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock adjustments',
      error: error.message
    });
  }
};

// Get stock movement history for a product
const getProductMovementHistory = async (req, res) => {
  try {
    const { id } = req.params; // Product ID
    const { start_date, end_date } = req.query; // Optional filters

    const movement = await StockAdjustment.getProductMovement(id, { start_date, end_date });

    res.json({
      success: true,
      data: movement,
      count: movement.length
    });
  } catch (error) {
    console.error('Get product movement history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product movement history',
      error: error.message
    });
  }
};


module.exports = {
  createStockAdjustment,
  getAllStockAdjustments,
  getProductMovementHistory,
};