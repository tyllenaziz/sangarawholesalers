const DiscountRule = require('../models/DiscountRule');
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

// Get all discount rules
const getAllDiscountRules = async (req, res) => {
  try {
    const { is_active, applies_to, search, active_only } = req.query;
    const filters = {};
    if (is_active !== undefined) filters.is_active = is_active === 'true';
    if (applies_to) filters.applies_to = applies_to;
    if (search) filters.search = search;

    let discountRules;
    if (active_only === 'true') {
        discountRules = await DiscountRule.findAllActive();
    } else {
        discountRules = await DiscountRule.findAll(filters);
    }
    
    res.json({
      success: true,
      data: discountRules,
      count: discountRules.length
    });
  } catch (error) {
    console.error('Get all discount rules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch discount rules',
      error: error.message
    });
  }
};

// Get a single discount rule by ID
const getDiscountRule = async (req, res) => {
  try {
    const { id } = req.params;
    const discountRule = await DiscountRule.findById(id);

    if (!discountRule) {
      return res.status(404).json({
        success: false,
        message: 'Discount rule not found'
      });
    }

    res.json({
      success: true,
      data: discountRule
    });
  } catch (error) {
    console.error('Get discount rule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch discount rule',
      error: error.message
    });
  }
};

// Create a new discount rule
const createDiscountRule = async (req, res) => {
  try {
    const {
      name, code, type, value, min_purchase_amount,
      applies_to, is_active, start_date, end_date, description
    } = req.body;

    if (!name || !type || value === undefined || value === null) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, and value are required for a discount rule.'
      });
    }
    if (code) {
        const existingByCode = await DiscountRule.findByCode(code);
        if (existingByCode) {
            return res.status(400).json({ success: false, message: 'Discount code already exists.' });
        }
    }

    const discountRuleId = await DiscountRule.create({
      name, code, type, value, min_purchase_amount,
      applies_to, is_active, start_date, end_date, description
    });

    await logActivity(req.user.id, 'DISCOUNT_RULE_CREATED', `Created discount rule: ${name} (Code: ${code})`, req.ip);

    res.status(201).json({
      success: true,
      message: 'Discount rule created successfully',
      data: { id: discountRuleId }
    });
  } catch (error) {
    console.error('Create discount rule error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: 'Discount rule with this name or code already exists.' });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create discount rule',
      error: error.message
    });
  }
};

// Update a discount rule
const updateDiscountRule = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, code, type, value, min_purchase_amount,
      applies_to, is_active, start_date, end_date, description
    } = req.body;

    const existingDiscountRule = await DiscountRule.findById(id);
    if (!existingDiscountRule) {
      return res.status(404).json({
        success: false,
        message: 'Discount rule not found'
      });
    }

    // Check for duplicate code if code is changed
    if (code && code !== existingDiscountRule.code) {
        const existingByCode = await DiscountRule.findByCode(code);
        if (existingByCode && existingByCode.id !== id) {
            return res.status(400).json({ success: false, message: 'Discount code already exists.' });
        }
    }

    const updated = await DiscountRule.update(id, {
      name, code, type, value, min_purchase_amount,
      applies_to, is_active, start_date, end_date, description
    });

    if (updated) {
      await logActivity(req.user.id, 'DISCOUNT_RULE_UPDATED', `Updated discount rule: ${name} (ID: ${id})`, req.ip);
      res.json({
        success: true,
        message: 'Discount rule updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to update discount rule'
      });
    }
  } catch (error) {
    console.error('Update discount rule error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: 'Discount rule with this name or code already exists.' });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update discount rule',
      error: error.message
    });
  }
};

// Delete a discount rule
const deleteDiscountRule = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await DiscountRule.delete(id);

    if (deleted) {
      await logActivity(req.user.id, 'DISCOUNT_RULE_DELETED', `Deleted discount rule ID: ${id}`, req.ip);
      res.json({
        success: true,
        message: 'Discount rule deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete discount rule'
      });
    }
  } catch (error) {
    console.error('Delete discount rule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete discount rule',
      error: error.message
    });
  }
};

module.exports = {
  getAllDiscountRules,
  getDiscountRule,
  createDiscountRule,
  updateDiscountRule,
  deleteDiscountRule,
};