// backend/models/Sale.js
const db = require('../config/database');
const Customer = require('./Customer');

class Sale {
  // Create a new sale with items
  static async create(saleData, items) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const {
        invoice_number, customer_id, user_id, subtotal, discount,
        loyalty_points_redeemed, loyalty_discount_amount,
        tax_rate, tax, total, amount_paid, change_amount, payment_method,
        payment_status, notes
      } = saleData;

      // Insert sale - Ensure columns match the number of placeholders
      const [saleResult] = await connection.query(
        `INSERT INTO sales (
          invoice_number, customer_id, user_id, subtotal, discount,
          loyalty_points_redeemed, loyalty_discount_amount,
          tax_rate, tax, total, amount_paid, change_amount, payment_method,
          payment_status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoice_number,
          customer_id || null,
          user_id,
          parseFloat(subtotal) || 0,
          parseFloat(discount) || 0,
          parseInt(loyalty_points_redeemed) || 0,
          parseFloat(loyalty_discount_amount) || 0,
          parseFloat(tax_rate) || 0.16,
          parseFloat(tax) || 0,
          parseFloat(total) || 0,
          parseFloat(amount_paid) || 0,
          parseFloat(change_amount) || 0,
          payment_method || 'cash',
          payment_status || 'paid',
          notes || null
        ]
      );

      const saleId = saleResult.insertId;

      // Insert sale items and update stock
      for (const item of items) {
        await connection.query(
          `INSERT INTO sale_items (
            sale_id, product_id, product_name, quantity,
            unit_price, discount, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            saleId,
            item.product_id,
            item.product_name,
            parseInt(item.quantity) || 0,
            parseFloat(item.unit_price) || 0,
            parseFloat(item.discount) || 0,
            parseFloat(item.subtotal) || 0
          ]
        );

        // Update product stock
        await connection.query(
          'UPDATE products SET quantity_in_stock = quantity_in_stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      // Update customer total purchases and loyalty points if customer exists
      if (customer_id) {
        // Calculate loyalty points (1 point per 100 currency units)
        const loyaltyPointsEarned = Math.floor(parseFloat(total) / 100);
        
        // Update customer stats within the same transaction
        await connection.query(
          `UPDATE customers 
           SET total_purchases = total_purchases + ?, 
               loyalty_points = loyalty_points + ?
           WHERE id = ?`,
          [parseFloat(total), loyaltyPointsEarned, customer_id]
        );

        // If loyalty points were redeemed, deduct them
        if (loyalty_points_redeemed > 0) {
          await connection.query(
            `UPDATE customers 
             SET loyalty_points = loyalty_points - ?
             WHERE id = ? AND loyalty_points >= ?`,
            [loyalty_points_redeemed, customer_id, loyalty_points_redeemed]
          );
          
          await connection.query(
            'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
            [user_id, 'LOYALTY_REDEEMED', `Redeemed ${loyalty_points_redeemed} loyalty points for customer ${customer_id} in sale ${invoice_number}`]
          );
        }
      }

      await connection.commit();
      return saleId;
    } catch (error) {
      await connection.rollback();
      console.error('Sale creation error:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Generate unique invoice number
  static async generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const prefix = `INV-${year}${month}${day}`;

    const [rows] = await db.query(
      'SELECT invoice_number FROM sales WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1',
      [`${prefix}%`]
    );

    let sequence = 1;
    if (rows.length > 0) {
      const lastInvoice = rows[0].invoice_number;
      const lastSequence = parseInt(lastInvoice.split('-').pop());
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  // Get sale by ID with items
  static async findById(id) {
    const [sales] = await db.query(
      `SELECT s.*, u.full_name as cashier_name, c.name as customer_name
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.id = ?`,
      [id]
    );

    if (sales.length === 0) return null;

    const sale = sales[0];

    // Get sale items
    const [items] = await db.query(
      'SELECT * FROM sale_items WHERE sale_id = ?',
      [id]
    );

    sale.items = items;
    return sale;
  }

  // Get sale by invoice number
  static async findByInvoice(invoiceNumber) {
    const [sales] = await db.query(
      `SELECT s.*, u.full_name as cashier_name, c.name as customer_name
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.invoice_number = ?`,
      [invoiceNumber]
    );

    if (sales.length === 0) return null;

    const sale = sales[0];

    // Get sale items
    const [items] = await db.query(
      'SELECT * FROM sale_items WHERE sale_id = ?',
      [sale.id]
    );

    sale.items = items;
    return sale;
  }

  // Get all sales with filters
  static async findAll(filters = {}) {
    let query = `
      SELECT s.*, u.full_name as cashier_name, c.name as customer_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.start_date) {
      query += ' AND DATE(s.created_at) >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND DATE(s.created_at) <= ?';
      params.push(filters.end_date);
    }

    if (filters.payment_method) {
      query += ' AND s.payment_method = ?';
      params.push(filters.payment_method);
    }

    if (filters.user_id) {
      query += ' AND s.user_id = ?';
      params.push(filters.user_id);
    }

    query += ' ORDER BY s.created_at DESC LIMIT 100';

    const [rows] = await db.query(query, params);
    return rows;
  }

  // Get today's sales summary
  static async getTodaySummary() {
    const query = `
      SELECT
        COUNT(*) as total_sales,
        SUM(total) as total_revenue,
        SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) as cash_sales,
        SUM(CASE WHEN payment_method = 'mpesa' THEN total ELSE 0 END) as mpesa_sales,
        SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END) as card_sales
      FROM sales
      WHERE DATE(created_at) = CURDATE()
    `;
    const [rows] = await db.query(query);
    return rows[0];
  }

  // Get sales statistics
  static async getStatistics(filters = {}) {
    let dateCondition = '1=1';
    const params = [];

    if (filters.start_date && filters.end_date) {
      dateCondition = `DATE(created_at) BETWEEN ? AND ?`;
      params.push(filters.start_date, filters.end_date);
    } else if (filters.period) {
      switch (filters.period) {
        case 'today':
          dateCondition = `DATE(created_at) = CURDATE()`;
          break;
        case 'week':
          dateCondition = `YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)`;
          break;
        case 'month':
          dateCondition = `MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())`;
          break;
        case 'year':
          dateCondition = `YEAR(created_at) = YEAR(CURDATE())`;
          break;
        default:
          dateCondition = `DATE(created_at) = CURDATE()`;
      }
    } else {
      dateCondition = `DATE(created_at) = CURDATE()`;
    }

    const query = `
      SELECT
        COUNT(*) as total_transactions,
        SUM(total) as total_revenue,
        AVG(total) as average_sale,
        SUM(subtotal - (SELECT SUM(si.quantity * p.cost_price)
                        FROM sale_items si
                        JOIN products p ON si.product_id = p.id
                        WHERE si.sale_id = sales.id)) as estimated_profit
      FROM sales
      WHERE ${dateCondition}
    `;
    const [rows] = await db.query(query, params);
    return rows[0];
  }
}

module.exports = Sale;