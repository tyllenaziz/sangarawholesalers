const TaxRate = require('../models/TaxRate');
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

// Get all tax rates
const getAllTaxRates = async (req, res) => {
  try {
    const { is_active, is_default, search } = req.query;
    const filters = {};
    if (is_active !== undefined) filters.is_active = is_active === 'true';
    if (is_default !== undefined) filters.is_default = is_default === 'true';
    if (search) filters.search = search;

    const taxRates = await TaxRate.findAll(filters);
    res.json({
      success: true,
      data: taxRates,
      count: taxRates.length
    });
  } catch (error) {
    console.error('Get all tax rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tax rates',
      error: error.message
    });
  }
};

// Get a single tax rate by ID
const getTaxRate = async (req, res) => {
  try {
    const { id } = req.params;
    const taxRate = await TaxRate.findById(id);

    if (!taxRate) {
      return res.status(404).json({
        success: false,
        message: 'Tax rate not found'
      });
    }

    res.json({
      success: true,
      data: taxRate
    });
  } catch (error) {
    console.error('Get tax rate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tax rate',
      error: error.message
    });
  }
};

// Create a new tax rate
const createTaxRate = async (req, res) => {
  try {
    const { name, rate, is_default, is_active, description } = req.body;

    if (!name || rate === undefined || rate === null) {
      return res.status(400).json({
        success: false,
        message: 'Name and rate are required for a tax rate.'
      });
    }

    const taxRateId = await TaxRate.create({ name, rate, is_default, is_active, description });

    await logActivity(req.user.id, 'TAX_RATE_CREATED', `Created tax rate: ${name} (${rate * 100}%)`, req.ip);

    res.status(201).json({
      success: true,
      message: 'Tax rate created successfully',
      data: { id: taxRateId }
    });
  } catch (error) {
    console.error('Create tax rate error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: 'Tax rate with this name already exists.' });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create tax rate',
      error: error.message
    });
  }
};

// Update a tax rate
const updateTaxRate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, rate, is_default, is_active, description } = req.body;

    const existingTaxRate = await TaxRate.findById(id);
    if (!existingTaxRate) {
      return res.status(404).json({
        success: false,
        message: 'Tax rate not found'
      });
    }

    const updated = await TaxRate.update(id, { name, rate, is_default, is_active, description });

    if (updated) {
      await logActivity(req.user.id, 'TAX_RATE_UPDATED', `Updated tax rate: ${name} (${rate * 100}%)`, req.ip);
      res.json({
        success: true,
        message: 'Tax rate updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to update tax rate'
      });
    }
  } catch (error) {
    console.error('Update tax rate error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: 'Tax rate with this name already exists.' });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update tax rate',
      error: error.message
    });
  }
};

// Delete a tax rate
const deleteTaxRate = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await TaxRate.delete(id);

    if (deleted) {
      await logActivity(req.user.id, 'TAX_RATE_DELETED', `Deleted tax rate ID: ${id}`, req.ip);
      res.json({
        success: true,
        message: 'Tax rate deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete tax rate'
      });
    }
  } catch (error) {
    console.error('Delete tax rate error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAllTaxRates,
  getTaxRate,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate,
};