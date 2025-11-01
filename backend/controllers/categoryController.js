const Category = require('../models/Category');
const db = require('../config/database');

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();

    res.json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

// Get single category
const getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message
    });
  }
};

// Create category
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    const categoryId = await Category.create({ name, description });

    // Log activity
    await db.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
      [req.user.id, 'CATEGORY_CREATED', `Created category: ${name}`]
    );

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { id: categoryId }
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const updated = await Category.update(id, { name, description });

    if (updated) {
      // Log activity
      await db.query(
        'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
        [req.user.id, 'CATEGORY_UPDATED', `Updated category: ${name}`]
      );

      res.json({
        success: true,
        message: 'Category updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to update category'
      });
    }
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const deleted = await Category.delete(id);

    if (deleted) {
      // Log activity
      await db.query(
        'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
        [req.user.id, 'CATEGORY_DELETED', `Deleted category: ${category.name}`]
      );

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete category'
      });
    }
  } catch (error) {
    console.error('Delete category error:', error);
    
    if (error.message.includes('Cannot delete category with active products')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with active products. Remove or reassign products first.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
};

module.exports = {
  getAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
};