const db = require('../config/database');

class Category {
  // Create a new category
  static async create(categoryData) {
    const { name, description } = categoryData;

    const query = 'INSERT INTO categories (name, description) VALUES (?, ?)';
    const [result] = await db.query(query, [name, description || null]);

    return result.insertId;
  }

  // Find category by ID
  static async findById(id) {
    const query = 'SELECT * FROM categories WHERE id = ?';
    const [rows] = await db.query(query, [id]);
    return rows[0];
  }

  // Get all categories
  static async findAll() {
    const query = `
      SELECT c.*, 
             COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
      GROUP BY c.id
      ORDER BY c.name ASC
    `;
    const [rows] = await db.query(query);
    return rows;
  }

  // Update category
  static async update(id, categoryData) {
    const { name, description } = categoryData;

    const query = 'UPDATE categories SET name = ?, description = ? WHERE id = ?';
    const [result] = await db.query(query, [name, description || null, id]);

    return result.affectedRows > 0;
  }

  // Delete category
  static async delete(id) {
    // Check if category has products
    const [products] = await db.query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_active = true',
      [id]
    );

    if (products[0].count > 0) {
      throw new Error('Cannot delete category with active products');
    }

    const query = 'DELETE FROM categories WHERE id = ?';
    const [result] = await db.query(query, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Category;