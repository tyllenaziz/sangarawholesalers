const Purchase = require('../models/Purchase');
const Supplier = require('../models/Supplier'); // To fetch suppliers for dropdowns
const Product = require('../models/Product');   // To fetch products for adding items
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

// Create a new Purchase Order
const createPurchaseOrder = async (req, res) => {
  try {
    const { supplier_id, items, notes, amount_paid, payment_status } = req.body;

    if (!supplier_id || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier and at least one item are required for a purchase order.'
      });
    }

    let total_amount = 0;
    // Validate items and calculate total amount
    for (const item of items) {
      if (!item.product_id || !item.quantity || !item.unit_cost) {
        return res.status(400).json({ success: false, message: 'Each item must have product_id, quantity, and unit_cost.' });
      }
      item.subtotal = item.quantity * item.unit_cost;
      total_amount += item.subtotal;
    }

    const purchaseData = {
      supplier_id,
      user_id: req.user.id, // User creating the PO
      total_amount,
      amount_paid: amount_paid || 0,
      payment_status: payment_status || 'pending',
      status: 'ordered', // New POs are 'ordered' by default
      notes
    };

    const result = await Purchase.create(purchaseData, items);

    await logActivity(req.user.id, 'PURCHASE_ORDER_CREATED', `Created Purchase Order ${result.purchase_number}`, req.ip);

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: result
    });
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create purchase order',
      error: error.message
    });
  }
};

// Get all Purchase Orders
const getAllPurchaseOrders = async (req, res) => {
  try {
    const { supplier_id, status, payment_status, start_date, end_date, search } = req.query;
    const filters = {};
    if (supplier_id) filters.supplier_id = supplier_id;
    if (status) filters.status = status;
    if (payment_status) filters.payment_status = payment_status;
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;
    if (search) filters.search = search;

    const purchases = await Purchase.findAll(filters);

    res.json({
      success: true,
      data: purchases,
      count: purchases.length
    });
  } catch (error) {
    console.error('Get all purchase orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase orders',
      error: error.message
    });
  }
};

// Get a single Purchase Order by ID
const getPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await Purchase.findById(id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    res.json({
      success: true,
      data: purchase
    });
  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase order',
      error: error.message
    });
  }
};

// Update a Purchase Order (e.g., notes, payment_status, etc. for 'ordered' POs)
const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier_id, total_amount, notes, payment_status } = req.body;

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }
    if (purchase.status !== 'ordered') {
      return res.status(400).json({ success: false, message: 'Only "ordered" purchase orders can be edited directly.' });
    }

    const updated = await Purchase.update(id, { supplier_id, total_amount, notes, payment_status });

    if (updated) {
      await logActivity(req.user.id, 'PURCHASE_ORDER_UPDATED', `Updated Purchase Order ${purchase.purchase_number}`, req.ip);
      res.json({
        success: true,
        message: 'Purchase order updated successfully'
      });
    } else {
      res.status(400).json({ success: false, message: 'Failed to update purchase order.' });
    }
  } catch (error) {
    console.error('Update purchase order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// Mark Purchase Order as Received (updates stock)
const receivePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const received = await Purchase.receivePurchase(id, req.user.id);

    if (received) {
      res.json({
        success: true,
        message: 'Purchase order marked as received and stock updated.'
      });
    } else {
      res.status(400).json({ success: false, message: 'Failed to receive purchase order.' });
    }
  } catch (error) {
    console.error('Receive purchase order error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Mark Purchase Order as Canceled
const cancelPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const canceled = await Purchase.cancelPurchase(id, req.user.id);

    if (canceled) {
      res.json({
        success: true,
        message: 'Purchase order marked as canceled.'
      });
    } else {
      res.status(400).json({ success: false, message: 'Failed to cancel purchase order.' });
    }
  } catch (error) {
    console.error('Cancel purchase order error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Record a payment for a Purchase Order
const recordPurchasePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Payment amount must be positive.' });
        }

        const paid = await Purchase.recordPayment(id, amount, req.user.id);

        if (paid) {
            res.json({ success: true, message: 'Payment recorded successfully.' });
        } else {
            res.status(400).json({ success: false, message: 'Failed to record payment.' });
        }
    } catch (error) {
        console.error('Record purchase payment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  recordPurchasePayment,
};