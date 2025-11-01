const db = require('../config/database');

class DiscountRule {
  // Create a new discount rule
  static async create(discountRuleData) {
    const {
      name, code, type, value, min_purchase_amount,
      applies_to, is_active, start_date, end_date, description
    } = discountRuleData;

    const query = `
      INSERT INTO discount_rules (
        name, code, type, value, min_purchase_amount,
        applies_to, is_active, start_date, end_date, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [
      name, code || null, type, value, min_purchase_amount || 0,
      applies_to || 'all_products', is_active || true,
      start_date || null, end_date || null, description || null
    ]);
    return result.insertId;
  }

  // Find discount rule by ID
  static async findById(id) {
    const query = 'SELECT * FROM discount_rules WHERE id = ?';
    const [rows] = await db.query(query, [id]);
    return rows[0];
  }

  // Find discount rule by code
  static async findByCode(code) {
    const query = 'SELECT * FROM discount_rules WHERE code = ? AND is_active = TRUE AND (start_date IS NULL OR start_date <= CURDATE()) AND (end_date IS NULL OR end_date >= CURDATE()) LIMIT 1';
    const [rows] = await db.query(query, [code]);
    return rows[0];
  }

  // Get all active discount rules
  static async findAllActive() {
    const query = 'SELECT * FROM discount_rules WHERE is_active = TRUE AND (start_date IS NULL OR start_date <= CURDATE()) AND (end_date IS NULL OR end_date >= CURDATE()) ORDER BY name ASC';
    const [rows] = await db.query(query);
    return rows;
  }

  // Get all discount rules with optional filters (for admin view)
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM discount_rules WHERE 1=1';
    const params = [];

    if (filters.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active);
    }
    if (filters.applies_to) {
      query += ' AND applies_to = ?';
      params.push(filters.applies_to);
    }
    if (filters.search) {
      query += ' AND (name LIKE ? OR code LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY created_at DESC';
    const [rows] = await db.query(query, params);
    return rows;
  }

  // Update a discount rule
  static async update(id, discountRuleData) {
    const {
      name, code, type, value, min_purchase_amount,
      applies_to, is_active, start_date, end_date, description
    } = discountRuleData;

    const query = `
      UPDATE discount_rules SET
        name = ?, code = ?, type = ?, value = ?, min_purchase_amount = ?,
        applies_to = ?, is_active = ?, start_date = ?, end_date = ?, description = ?
      WHERE id = ?
    `;
    const [result] = await db.query(query, [
      name, code || null, type, value, min_purchase_amount || 0,
      applies_to || 'all_products', is_active,
      start_date || null, end_date || null, description || null, id
    ]);
    return result.affectedRows > 0;
  }

  // Delete a discount rule
  static async delete(id) {
    const query = 'DELETE FROM discount_rules WHERE id = ?';
    const [result] = await db.query(query, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = DiscountRule;