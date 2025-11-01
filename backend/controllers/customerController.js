const Customer = require('../models/Customer');
const db = require('../config/database'); // For activity logging

// Get all customers
const getAllCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const filters = {};
    if (search) filters.search = search;

    const customers = await Customer.findAll(filters);

    res.json({
      success: true,
      data: customers,
      count: customers.length
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error.message
    });
  }
};

// Get single customer
const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer',
      error: error.message
    });
  }
};

// Create customer
const createCustomer = async (req, res) => {
  try {
    const customerData = req.body;

    if (!customerData.name || !customerData.phone) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and phone are required'
      });
    }

    const customerId = await Customer.create(customerData);

    // Log activity
    await db.query(
      'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
      [req.user.id, 'CUSTOMER_CREATED', `Created customer: ${customerData.name}`, req.ip]
    );

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: { id: customerId }
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      error: error.message
    });
  }
};

// Update customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customerData = req.body;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const updated = await Customer.update(id, customerData);

    if (updated) {
      // Log activity
      await db.query(
        'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
        [req.user.id, 'CUSTOMER_UPDATED', `Updated customer: ${customerData.name}`, req.ip]
      );

      res.json({
        success: true,
        message: 'Customer updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to update customer'
      });
    }
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer',
      error: error.message
    });
  }
};

// Delete customer
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const deleted = await Customer.delete(id);

    if (deleted) {
      // Log activity
      await db.query(
        'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
        [req.user.id, 'CUSTOMER_DELETED', `Deleted customer: ${customer.name}`, req.ip]
      );

      res.json({
        success: true,
        message: 'Customer deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete customer'
      });
    }
  } catch (error) {
    console.error('Delete customer error:', error);
    if (error.message.includes('Cannot delete customer with existing sales history')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer',
      error: error.message
    });
  }
};

module.exports = {
  getAllCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer
};