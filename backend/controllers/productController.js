const Product = require('../models/Product');
const db = require('../config/database');

// Get all products
const getAllProducts = async (req, res) => {
  try {
    const { search, category_id, supplier_id, is_active } = req.query;

    const filters = {};
    if (search) filters.search = search;
    if (category_id) filters.category_id = category_id;
    if (supplier_id) filters.supplier_id = supplier_id;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const products = await Product.findAll(filters);

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

// Get single product
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
};

// Create product
const createProduct = async (req, res) => {
  try {
    const productData = req.body;

    // Validation
    if (!productData.name || !productData.sku || !productData.unit || 
        !productData.cost_price || !productData.selling_price) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const productId = await Product.create(productData);

    // Log activity
    await db.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
      [req.user.id, 'PRODUCT_CREATED', `Created product: ${productData.name}`]
    );

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { id: productId }
    });
  } catch (error) {
    console.error('Create product error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'SKU or Barcode already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const updated = await Product.update(id, productData);

    if (updated) {
      // Log activity
      await db.query(
        'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
        [req.user.id, 'PRODUCT_UPDATED', `Updated product: ${productData.name}`]
      );

      res.json({
        success: true,
        message: 'Product updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to update product'
      });
    }
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
};

// Delete product (soft delete)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const deleted = await Product.delete(id);

    if (deleted) {
      // Log activity
      await db.query(
        'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
        [req.user.id, 'PRODUCT_DELETED', `Deleted product: ${product.name}`]
      );

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete product'
      });
    }
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
};

// Get low stock products
const getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.getLowStock();

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock products',
      error: error.message
    });
  }
};

// Update stock quantity
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation } = req.body; // operation: 'add' or 'subtract'

    if (!quantity || !operation) {
      return res.status(400).json({
        success: false,
        message: 'Please provide quantity and operation'
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const updated = await Product.updateStock(id, quantity, operation);

    if (updated) {
      // Log activity
      await db.query(
        'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
        [req.user.id, 'STOCK_UPDATED', `${operation === 'add' ? 'Added' : 'Subtracted'} ${quantity} units for ${product.name}`]
      );

      res.json({
        success: true,
        message: 'Stock updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to update stock'
      });
    }
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock',
      error: error.message
    });
  }
};

// Get product statistics
const getStatistics = async (req, res) => {
  try {
    const stats = await Product.getStatistics();

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
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  updateStock,
  getStatistics
};