const db = require('../config/database');

class Setting {
  // Get all settings
  static async findAll() {
    const query = 'SELECT id, key_name, key_value, description, created_at, updated_at FROM settings ORDER BY key_name ASC';
    const [rows] = await db.query(query);
    return rows;
  }

  // Get a single setting by key_name
  static async findByKey(key_name) {
    const query = 'SELECT id, key_name, key_value, description, created_at, updated_at FROM settings WHERE key_name = ?';
    const [rows] = await db.query(query, [key_name]);
    return rows[0];
  }

  // Update a setting by key_name
  static async updateByKey(key_name, newValue) {
    const query = 'UPDATE settings SET key_value = ? WHERE key_name = ?';
    const [result] = await db.query(query, [newValue, key_name]);
    return result.affectedRows > 0;
  }

  // Create a new setting (for future expansion, but admin would primarily update)
  static async create(settingData) {
    const { key_name, key_value, description } = settingData;
    const query = 'INSERT INTO settings (key_name, key_value, description) VALUES (?, ?, ?)';
    const [result] = await db.query(query, [key_name, key_value, description || null]);
    return result.insertId;
  }

  // Delete a setting (use with caution, typically not needed for core settings)
  static async deleteByKey(key_name) {
    const query = 'DELETE FROM settings WHERE key_name = ?';
    const [result] = await db.query(query, [key_name]);
    return result.affectedRows > 0;
  }

  // Utility to get a specific setting's value
  static async getValue(key_name) {
    const setting = await this.findByKey(key_name);
    return setting ? setting.key_value : null;
  }
}

module.exports = Setting;