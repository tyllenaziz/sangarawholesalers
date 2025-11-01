const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Create a new user
  static async create(userData) {
    const { username, email, password, full_name, role, phone } = userData;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO users (username, email, password, full_name, role, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.query(query, [
      username,
      email,
      hashedPassword,
      full_name,
      role,
      phone || null
    ]);
    
    return result.insertId;
  }

  // Find user by ID
  static async findById(id) {
    const query = 'SELECT id, username, email, full_name, role, phone, is_active, created_at FROM users WHERE id = ?';
    const [rows] = await db.query(query, [id]);
    return rows[0];
  }

  // Find user by username or email
  static async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = ? OR email = ?';
    const [rows] = await db.query(query, [username, username]);
    return rows[0];
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Get all users with filters
  static async findAll(filters = {}) {
    let query = 'SELECT id, username, email, full_name, role, phone, is_active, created_at FROM users WHERE 1=1';
    const params = [];

    if (filters.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }
    if (filters.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active);
    }
    if (filters.search) {
      query += ' AND (username LIKE ? OR full_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';
    const [rows] = await db.query(query, params);
    return rows;
  }

  // Update user
  static async update(id, userData) {
    const { username, email, full_name, role, phone, is_active } = userData;
    
    const query = `
      UPDATE users 
      SET username = ?, email = ?, full_name = ?, role = ?, phone = ?, is_active = ?
      WHERE id = ?
    `;
    
    const [result] = await db.query(query, [
      username,
      email,
      full_name,
      role,
      phone,
      is_active,
      id
    ]);
    
    return result.affectedRows > 0;
  }

  // Delete user
  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = ?';
    const [result] = await db.query(query, [id]);
    return result.affectedRows > 0;
  }

  // Change password
  static async changePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = 'UPDATE users SET password = ? WHERE id = ?';
    const [result] = await db.query(query, [hashedPassword, id]);
    return result.affectedRows > 0;
  }
}

module.exports = User;