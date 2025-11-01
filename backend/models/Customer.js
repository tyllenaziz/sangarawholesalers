const db = require('../config/database');

class Customer {
  // Create a new customer
  static async create(customerData) {
    const { name, email, phone, address, outstanding_balance, loyalty_points } = customerData;

    const query = `
      INSERT INTO customers (name, email, phone, address, outstanding_balance, loyalty_points)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [
      name,
      email || null,
      phone,
      address || null,
      outstanding_balance || 0,
      loyalty_points || 0
    ]);

    return result.insertId;
  }

  // Find customer by ID
  static async findById(id) {
    const query = 'SELECT * FROM customers WHERE id = ?';
    const [rows] = await db.query(query, [id]);
    return rows[0];
  }

  // Get all customers with filters
  static async findAll(filters = {}) {
    let query = `
      SELECT c.*,
             COUNT(s.id) as total_transactions_count
      FROM customers c
      LEFT JOIN sales s ON c.id = s.customer_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
      query += ' AND (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' GROUP BY c.id ORDER BY c.name ASC';

    const [rows] = await db.query(query, params);
    return rows;
  }

  // Update customer
  static async update(id, customerData) {
    const { name, email, phone, address, outstanding_balance, total_purchases, loyalty_points } = customerData;

    const query = `
      UPDATE customers
      SET name = ?, email = ?, phone = ?, address = ?,
          outstanding_balance = ?, total_purchases = ?, loyalty_points = ?
      WHERE id = ?
    `;

    const [result] = await db.query(query, [
      name,
      email || null,
      phone,
      address || null,
      outstanding_balance || 0,
      total_purchases || 0,
      loyalty_points || 0,
      id
    ]);

    return result.affectedRows > 0;
  }

  // Delete customer
  static async delete(id) {
    // Check if customer has associated sales (to prevent deleting a customer with sales history)
    const [sales] = await db.query(
      'SELECT COUNT(*) as count FROM sales WHERE customer_id = ?',
      [id]
    );

    if (sales[0].count > 0) {
      throw new Error('Cannot delete customer with existing sales history');
    }

    const query = 'DELETE FROM customers WHERE id = ?';
    const [result] = await db.query(query, [id]);
    return result.affectedRows > 0;
  }

  // Update customer's outstanding balance
  static async updateBalance(id, amount, operation = 'add') {
    const query = operation === 'add'
      ? 'UPDATE customers SET outstanding_balance = outstanding_balance + ? WHERE id = ?'
      : 'UPDATE customers SET outstanding_balance = outstanding_balance - ? WHERE id = ?';

    const [result] = await db.query(query, [amount, id]);
    return result.affectedRows > 0;
  }

  // Update customer's total purchases and loyalty points (used by Sale model)
  static async updatePurchaseStats(id, totalSaleAmount) {
    // Example: 1 loyalty point for every KES 100 spent
    const newLoyaltyPoints = Math.floor(totalSaleAmount / 100);

    const query = `
      UPDATE customers
      SET total_purchases = total_purchases + ?,
          loyalty_points = loyalty_points + ?
      WHERE id = ?
    `;
    const [result] = await db.query(query, [totalSaleAmount, newLoyaltyPoints, id]);
    return result.affectedRows > 0;
  }

  // Redeem loyalty points from a customer's account
  static async redeemLoyaltyPoints(id, pointsToRedeem, connection = db) { // <--- NEW METHOD
    const [customerRows] = await connection.query(
      'SELECT loyalty_points FROM customers WHERE id = ?',
      [id]
    );

    if (customerRows.length === 0) {
      throw new Error('Customer not found for loyalty redemption.');
    }

    const currentPoints = customerRows[0].loyalty_points;
    if (currentPoints < pointsToRedeem) {
      throw new Error(`Insufficient loyalty points. Customer has ${currentPoints}, tried to redeem ${pointsToRedeem}.`);
    }

    const query = `
      UPDATE customers
      SET loyalty_points = loyalty_points - ?
      WHERE id = ?
    `;
    const [result] = await connection.query(query, [pointsToRedeem, id]);
    return result.affectedRows > 0;
  }
}

module.exports = Customer;