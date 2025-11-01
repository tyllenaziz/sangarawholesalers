const db = require('../config/database');

class Supplier {
  // Create a new supplier
  static async create(supplierData) {
    const { name, contact_person, email, phone, address, outstanding_balance } = supplierData;

    const query = `
      INSERT INTO suppliers (name, contact_person, email, phone, address, outstanding_balance)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [
      name,
      contact_person || null,
      email || null,
      phone || null,
      address || null,
      outstanding_balance || 0
    ]);

    return result.insertId;
  }

  // Find supplier by ID
  static async findById(id) {
    const query = 'SELECT * FROM suppliers WHERE id = ?';
    const [rows] = await db.query(query, [id]);
    return rows[0];
  }

  // Get all suppliers
  static async findAll(filters = {}) {
    let query = `
      SELECT s.*,
             COUNT(DISTINCT p.id) as product_count,
             COUNT(DISTINCT pu.id) as purchase_count
      FROM suppliers s
      LEFT JOIN products p ON s.id = p.supplier_id AND p.is_active = true
      LEFT JOIN purchases pu ON s.id = pu.supplier_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
      query += ' AND (s.name LIKE ? OR s.contact_person LIKE ? OR s.phone LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' GROUP BY s.id ORDER BY s.name ASC';

    const [rows] = await db.query(query, params);
    return rows;
  }

  // Update supplier
  static async update(id, supplierData) {
    const { name, contact_person, email, phone, address, outstanding_balance } = supplierData;

    const query = `
      UPDATE suppliers 
      SET name = ?, contact_person = ?, email = ?, phone = ?, 
          address = ?, outstanding_balance = ?
      WHERE id = ?
    `;

    const [result] = await db.query(query, [
      name,
      contact_person || null,
      email || null,
      phone || null,
      address || null,
      outstanding_balance || 0,
      id
    ]);

    return result.affectedRows > 0;
  }

 // Update outstanding balance
  static async updateBalance(id, amount, operation = 'add', connection = db) { // <-- ADD 'connection = db'
    const query = operation === 'add'
      ? 'UPDATE suppliers SET outstanding_balance = outstanding_balance + ? WHERE id = ?'
      : 'UPDATE suppliers SET outstanding_balance = outstanding_balance - ? WHERE id = ?';

    const [result] = await connection.query(query, [amount, id]); // <-- USE 'connection.query'
    return result.affectedRows > 0;
  }

 // Delete supplier
  static async delete(id) {
    // Check if supplier has active products
    const [products] = await db.query(
      'SELECT COUNT(*) as count FROM products WHERE supplier_id = ? AND is_active = true',
      [id]
    );

    if (products[0].count > 0) {
      throw new Error('Cannot delete supplier with active products. Reassign or deactivate products first.');
    }

    // Check if supplier has outstanding purchases (ordered or partially paid)
    const [activePurchases] = await db.query(
      "SELECT COUNT(*) as count FROM purchases WHERE supplier_id = ? AND (status = 'ordered' OR payment_status = 'partial')",
      [id]
    );

    if (activePurchases[0].count > 0) {
      throw new Error('Cannot delete supplier with active purchase orders or pending payments. Resolve or cancel purchases first.');
    }

    const query = 'DELETE FROM suppliers WHERE id = ?';
    const [result] = await db.query(query, [id]);
    return result.affectedRows > 0;
  }
  // Get supplier statistics
  static async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_suppliers,
        SUM(outstanding_balance) as total_outstanding,
        COUNT(CASE WHEN outstanding_balance > 0 THEN 1 END) as suppliers_with_balance
      FROM suppliers
    `;
    const [rows] = await db.query(query);
    return rows[0];
  }
}

module.exports = Supplier;