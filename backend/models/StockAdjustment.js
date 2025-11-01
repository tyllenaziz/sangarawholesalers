const db = require('../config/database');
const Product = require('./Product'); // To update product stock

class StockAdjustment {
  // Create a new stock adjustment
  static async create(adjustmentData) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { product_id, user_id, adjustment_type, quantity, reason } = adjustmentData;

      // Determine operation based on adjustment_type
      let operation = 'add';
      if (['damaged', 'returned_to_supplier', 'lost'].includes(adjustment_type)) { // Added 'returned_to_supplier' type
        operation = 'subtract';
      } else if (['found', 'correction_add', 'received_from_other_location'].includes(adjustment_type)) { // Added 'correction_add', 'received_from_other_location'
        operation = 'add';
      } else if (adjustment_type === 'correction_subtract') { // Specific subtract correction
        operation = 'subtract';
      } else if (adjustment_type === 'sale_return') { // Specific add correction for customer returns
        operation = 'add';
      }
      
      // Update product stock
      const stockUpdated = await Product.updateStock(product_id, quantity, operation);

      if (!stockUpdated) {
        throw new Error('Failed to update product stock during adjustment.');
      }

      // Insert stock adjustment record
      const query = `
        INSERT INTO stock_adjustments (product_id, user_id, adjustment_type, quantity, reason)
        VALUES (?, ?, ?, ?, ?)
      `;

      const [result] = await connection.query(query, [
        product_id,
        user_id,
        adjustment_type,
        operation === 'subtract' ? -Math.abs(quantity) : Math.abs(quantity), // Store as positive/negative for clarity
        reason || null
      ]);

      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Get all stock adjustments with filters
  static async findAll(filters = {}) {
    let query = `
      SELECT sa.*, 
             p.name as product_name, p.sku, 
             u.full_name as adjusted_by_user
      FROM stock_adjustments sa
      JOIN products p ON sa.product_id = p.id
      JOIN users u ON sa.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.product_id) {
      query += ' AND sa.product_id = ?';
      params.push(filters.product_id);
    }
    if (filters.user_id) {
      query += ' AND sa.user_id = ?';
      params.push(filters.user_id);
    }
    if (filters.adjustment_type) {
      query += ' AND sa.adjustment_type = ?';
      params.push(filters.adjustment_type);
    }
    if (filters.start_date) {
      query += ' AND DATE(sa.created_at) >= ?';
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      query += ' AND DATE(sa.created_at) <= ?';
      params.push(filters.end_date);
    }
    if (filters.search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR sa.reason LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY sa.created_at DESC';

    const [rows] = await db.query(query, params);
    return rows;
  }
  
  // Get stock movement history for a specific product
  static async getProductMovement(productId, filters = {}) {
      let query = `
          SELECT 
              'sale' as type,
              si.quantity as quantity_change,
              si.unit_price as price_at_change,
              s.created_at as timestamp,
              u.full_name as performed_by,
              s.invoice_number as reference,
              'Customer Sale' as reason
          FROM sale_items si
          JOIN sales s ON si.sale_id = s.id
          JOIN users u ON s.user_id = u.id
          WHERE si.product_id = ?

          UNION ALL

          SELECT 
              'purchase' as type,
              pi.quantity as quantity_change,
              pi.unit_cost as price_at_change,
              p.created_at as timestamp,
              u.full_name as performed_by,
              p.purchase_number as reference,
              'Supplier Purchase' as reason
          FROM purchase_items pi
          JOIN purchases p ON pi.purchase_id = p.id
          JOIN users u ON p.user_id = u.id
          WHERE pi.product_id = ? AND p.status = 'received'

          UNION ALL

          SELECT 
              'adjustment' as type,
              sa.quantity as quantity_change,
              NULL as price_at_change, -- Price might not be relevant for all adjustments
              sa.created_at as timestamp,
              u.full_name as performed_by,
              sa.adjustment_type as reference,
              sa.reason as reason
          FROM stock_adjustments sa
          JOIN users u ON sa.user_id = u.id
          WHERE sa.product_id = ?
      `;

      const params = [productId, productId, productId]; // Parameters for each UNION part

      // Add common date filters if needed
      // Note: Applying date filters across UNION ALL requires careful wrapping
      // For simplicity here, assuming it queries all data and client filters or
      // more complex SQL for server-side filtering across UNION.
      // E.g., 'WHERE (si.product_id = ? AND DATE(s.created_at) BETWEEN ? AND ?) UNION ALL ...'

      query += ` ORDER BY timestamp DESC`;

      const [rows] = await db.query(query, params);
      return rows;
  }
}

module.exports = StockAdjustment;