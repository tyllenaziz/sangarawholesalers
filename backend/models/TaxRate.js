const db = require('../config/database');

class TaxRate {
  // Create a new tax rate
  static async create(taxRateData) {
    const { name, rate, is_default, is_active, description } = taxRateData;

    // If setting a new default, ensure no other default is active
    if (is_default) {
      await db.query('UPDATE tax_rates SET is_default = FALSE WHERE is_default = TRUE');
    }

    const query = `
      INSERT INTO tax_rates (name, rate, is_default, is_active, description)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(query, [
      name, rate, is_default || false, is_active || true, description || null
    ]);
    return result.insertId;
  }

  // Find tax rate by ID
  static async findById(id) {
    const query = 'SELECT * FROM tax_rates WHERE id = ?';
    const [rows] = await db.query(query, [id]);
    return rows[0];
  }

  // Find tax rate by name
  static async findByName(name) {
    const query = 'SELECT * FROM tax_rates WHERE name = ?';
    const [rows] = await db.query(query, [name]);
    return rows[0];
  }

  // Get the current default active tax rate
  static async findDefaultActive() {
    const query = 'SELECT * FROM tax_rates WHERE is_default = TRUE AND is_active = TRUE LIMIT 1';
    const [rows] = await db.query(query);
    return rows[0];
  }

  // Get all tax rates with optional filters
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM tax_rates WHERE 1=1';
    const params = [];

    if (filters.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active);
    }
    if (filters.is_default !== undefined) {
      query += ' AND is_default = ?';
      params.push(filters.is_default);
    }
    if (filters.search) {
      query += ' AND name LIKE ?';
      params.push(`%${filters.search}%`);
    }

    query += ' ORDER BY name ASC';
    const [rows] = await db.query(query, params);
    return rows;
  }

  // Update a tax rate
  static async update(id, taxRateData) {
    const { name, rate, is_default, is_active, description } = taxRateData;

    // If trying to set this as default, clear others first
    if (is_default) {
      await db.query('UPDATE tax_rates SET is_default = FALSE WHERE id != ? AND is_default = TRUE', [id]);
    } else {
        // If the current default is being deactivated or unset as default
        const currentRate = await this.findById(id);
        if (currentRate && currentRate.is_default && !is_default && is_active) {
            // If unset as default and still active, might need logic to pick a new default
            console.warn(`Default tax rate ${id} was unset/deactivated. Consider setting a new default.`);
        }
    }


    const query = `
      UPDATE tax_rates SET
        name = ?, rate = ?, is_default = ?, is_active = ?, description = ?
      WHERE id = ?
    `;
    const [result] = await db.query(query, [
      name, rate, is_default, is_active, description || null, id
    ]);
    return result.affectedRows > 0;
  }

  // Delete a tax rate
  static async delete(id) {
    // Prevent deleting the active default tax rate
    const taxRate = await this.findById(id);
    if (taxRate && taxRate.is_default && taxRate.is_active) {
      throw new Error('Cannot delete the currently active default tax rate. Please set another as default first.');
    }

    const query = 'DELETE FROM tax_rates WHERE id = ?';
    const [result] = await db.query(query, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = TaxRate;