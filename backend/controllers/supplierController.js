const Supplier = require('../models/Supplier');
const db = require('../config/database');

// Get all suppliers
const getAllSuppliers = async (req, res) => {
  try {
    const { search } = req.query;
    const filters = {};
    if (search) filters.search = search;

    const suppliers = await Supplier.findAll(filters);

    res.json({
      success: true,
      data: suppliers,
      count: suppliers.length
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suppliers',
      error: error.message
    });
  }
};

// Get single supplier
const getSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supplier',
      error: error.message
    });
  }
};

// Create supplier
const createSupplier = async (req, res) => {
  try {
    const supplierData = req.body;

    if (!supplierData.name) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required'
      });
    }

    const supplierId = await Supplier.create(supplierData);

    // Log activity
    await db.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
      [req.user.id, 'SUPPLIER_CREATED', `Created supplier: ${supplierData.name}`]
    );

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: { id: supplierId }
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create supplier',
      error: error.message
    });
  }
};

// Update supplier
const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplierData = req.body;

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    const updated = await Supplier.update(id, supplierData);

    if (updated) {
      // Log activity
      await db.query(
        'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
        [req.user.id, 'SUPPLIER_UPDATED', `Updated supplier: ${supplierData.name}`]
      );

      res.json({
        success: true,
        message: 'Supplier updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to update supplier'
      });
    }
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update supplier',
      error: error.message
    });
  }
};

// Delete supplier
const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    const deleted = await Supplier.delete(id);

    if (deleted) {
      // Log activity
      await db.query(
        'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
        [req.user.id, 'SUPPLIER_DELETED', `Deleted supplier: ${supplier.name}`]
      );

      res.json({
        success: true,
        message: 'Supplier deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete supplier'
      });
    }
  } catch (error) {
    console.error('Delete supplier error:', error);

    if (error.message.includes('Cannot delete supplier')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete supplier',
      error: error.message
    });
  }
};

// Update supplier balance
const updateBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, operation } = req.body;

    if (!amount || !operation) {
      return res.status(400).json({
        success: false,
        message: 'Please provide amount and operation'
      });
    }

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    const updated = await Supplier.updateBalance(id, amount, operation);

    if (updated) {
      await db.query(
        'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
        [req.user.id, 'SUPPLIER_BALANCE_UPDATED', `${operation === 'add' ? 'Added' : 'Subtracted'} KES ${amount} for ${supplier.name}`]
      );

      res.json({
        success: true,
        message: 'Balance updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to update balance'
      });
    }
  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update balance',
      error: error.message
    });
  }
};

// Get supplier statistics
const getStatistics = async (req, res) => {
  try {
    const stats = await Supplier.getStatistics();

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
  getAllSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  updateBalance,
  getStatistics
};