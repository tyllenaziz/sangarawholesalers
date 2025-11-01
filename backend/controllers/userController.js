const User = require('../models/User');
const db = require('../config/database'); // For activity logging
const ActivityLog = require('../models/ActivityLog'); // <-- ADD THIS IMPORT
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

// Get all users (admin, optionally filterable)
const getAllUsers = async (req, res) => {
  try {
    const { role, is_active, search } = req.query;
    const filters = {};
    if (role) filters.role = role;
    if (is_active !== undefined) filters.is_active = is_active === 'true'; // Convert string to boolean
    if (search) filters.search = search;

    const users = await User.findAll(filters); // <--- This calls the User model

    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};
// Get a single user by ID
const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
};

// Create a new user (admin only)
const createUser = async (req, res) => {
  try {
    const { username, email, password, full_name, role, phone } = req.body;

    if (!username || !email || !password || !full_name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: username, email, password, full_name, role'
      });
    }

    // Check if user already exists by username or email
    const existingUser = await User.findByUsername(username); // findByUsername also checks email
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    const userId = await User.create({
      username,
      email,
      password,
      full_name,
      role,
      phone
    });

    await logActivity(req.user.id, 'USER_CREATED', `Admin created user: ${username} (ID: ${userId})`, req.ip);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { userId }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

// Update user details (admin only)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, full_name, role, phone, is_active } = req.body;

    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if username/email change conflicts with existing users (excluding self)
    if (username && username !== userToUpdate.username) {
      const existing = await User.findByUsername(username);
      if (existing && existing.id !== userToUpdate.id) {
        return res.status(400).json({ success: false, message: 'Username already taken.' });
      }
    }
    if (email && email !== userToUpdate.email) {
      const existing = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (existing[0].length > 0) {
        return res.status(400).json({ success: false, message: 'Email already taken.' });
      }
    }


    const updated = await User.update(id, {
      username,
      email,
      full_name,
      role,
      phone,
      is_active
    });

    if (updated) {
      await logActivity(req.user.id, 'USER_UPDATED', `Admin updated user: ${userToUpdate.username} (ID: ${id})`, req.ip);
      res.json({
        success: true,
        message: 'User updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to update user'
      });
    }
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

// Deactivate/Activate user (admin only)
const toggleUserActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body; // Expecting boolean true/false

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ success: false, message: 'is_active must be a boolean.' });
    }

    const userToToggle = await User.findById(id);
    if (!userToToggle) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updated = await User.update(id, { is_active });

    if (updated) {
      await logActivity(req.user.id, `USER_${is_active ? 'ACTIVATED' : 'DEACTIVATED'}`, `Admin ${is_active ? 'activated' : 'deactivated'} user: ${userToToggle.username} (ID: ${id})`, req.ip);
      res.json({
        success: true,
        message: `User ${is_active ? 'activated' : 'deactivated'} successfully`
      });
    } else {
      res.status(400).json({ success: false, message: 'Failed to update user status' });
    }
  } catch (error) {
    console.error('Toggle user active status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    });
  }
};


// Delete user (admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (req.user.id === userToDelete.id) {
      return res.status(403).json({
        success: false,
        message: 'You cannot delete your own account.'
      });
    }
    
    // Check if user has associated sales (prevent deleting a cashier with sales history)
    const [sales] = await db.query(
      'SELECT COUNT(*) as count FROM sales WHERE user_id = ?',
      [id]
    );

    if (sales[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user with existing sales history. Consider deactivating instead.'
      });
    }

    const deleted = await User.delete(id);

    if (deleted) {
      await logActivity(req.user.id, 'USER_DELETED', `Admin deleted user: ${userToDelete.username} (ID: ${id})`, req.ip);
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete user'
      });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};
// Get all activity logs (Admin only)
const getActivityLogs = async (req, res) => {
  try {
    // Pass filters directly from req.query to ActivityLog.findAll
    const logs = await ActivityLog.findAll(req.query); // <--- This calls ActivityLog model

    res.json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  toggleUserActiveStatus,
  deleteUser,
  getActivityLogs, // <-- ADD THIS EXPORT
};
