const db = require('../config/database');

class Product {
  // Create a new product
  static async create(productData) {
    const {
      name, sku, barcode, category_id, supplier_id, unit,
      cost_price, selling_price, quantity_in_stock, reorder_level,
      description, expiry_date, image_url // <--- ENSURE expiry_date IS HERE
    } = productData;

    const query = `
      INSERT INTO products (
        name, sku, barcode, category_id, supplier_id, unit,
        cost_price, selling_price, quantity_in_stock, reorder_level,
        description, expiry_date, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [
      name, sku, barcode || null, category_id || null, supplier_id || null,
      unit, cost_price, selling_price, quantity_in_stock || 0,
      reorder_level || 10, description || null, expiry_date || null, image_url || null // <--- ENSURE expiry_date || null IS HERE
    ]);

    return result.insertId;
  }

  // Find product by ID
  static async findById(id) {
    const query = `
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `;
    const [rows] = await db.query(query, [id]);
    return rows[0];
  }

  // Find product by SKU or Barcode
  static async findBySKUOrBarcode(code) {
    const query = `
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.sku = ? OR p.barcode = ?
    `;
    const [rows] = await db.query(query, [code, code]);
    return rows[0];
  }

  // Get all products with filters
  static async findAll(filters = {}) {
    let query = `
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.category_id) {
      query += ' AND p.category_id = ?';
      params.push(filters.category_id);
    }

    if (filters.supplier_id) {
      query += ' AND p.supplier_id = ?';
      params.push(filters.supplier_id);
    }

    if (filters.is_active !== undefined) {
      query += ' AND p.is_active = ?';
      params.push(filters.is_active);
    }

    if (filters.search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY p.created_at DESC';

    const [rows] = await db.query(query, params);
    return rows;
  }

  // Get low stock products
  static async getLowStock() {
    const query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.quantity_in_stock <= p.reorder_level AND p.is_active = true
      ORDER BY p.quantity_in_stock ASC
    `;
    const [rows] = await db.query(query);
    return rows;
  }

  // Update product
  static async update(id, productData) {
    const {
      name, sku, barcode, category_id, supplier_id, unit,
      cost_price, selling_price, quantity_in_stock, reorder_level,
      description, expiry_date, image_url, is_active // <--- ENSURE expiry_date IS HERE
    } = productData;

    const query = `
      UPDATE products SET
        name = ?, sku = ?, barcode = ?, category_id = ?, supplier_id = ?,
        unit = ?, cost_price = ?, selling_price = ?, quantity_in_stock = ?,
        reorder_level = ?, description = ?, expiry_date = ?, image_url = ?, is_active = ?
      WHERE id = ?
    `;

    const [result] = await db.query(query, [
      name, sku, barcode || null, category_id || null, supplier_id || null,
      unit, cost_price, selling_price, quantity_in_stock,
      reorder_level, description || null, expiry_date || null, image_url || null, is_active, id // <--- ENSURE expiry_date || null IS HERE
    ]);

    return result.affectedRows > 0;
  }

  // Update stock quantity
  static async updateStock(id, quantity, operation = 'add') {
    const query = operation === 'add'
      ? 'UPDATE products SET quantity_in_stock = quantity_in_stock + ? WHERE id = ?'
      : 'UPDATE products SET quantity_in_stock = quantity_in_stock - ? WHERE id = ?';

    const [result] = await db.query(query, [quantity, id]);
    return result.affectedRows > 0;
  }

  // Delete product (soft delete by setting is_active to false)
  static async delete(id) {
    const query = 'UPDATE products SET is_active = false WHERE id = ?';
    const [result] = await db.query(query, [id]);
    return result.affectedRows > 0;
  }

  // Get product statistics
  static async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_products,
        SUM(quantity_in_stock) as total_items,
        SUM(quantity_in_stock * cost_price) as total_value,
        COUNT(CASE WHEN quantity_in_stock <= reorder_level THEN 1 END) as low_stock_count
      FROM products
      WHERE is_active = true
    `;
    const [rows] = await db.query(query);
    return rows[0];
  }
}

module.exports = Product;