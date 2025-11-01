const db = require('../config/database');

class ActivityLog {
  // Get all activity logs with filters
  static async findAll(filters = {}) {
    let query = `
      SELECT al.*, 
             u.username, u.full_name, u.role
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.user_id) {
      query += ' AND al.user_id = ?';
      params.push(filters.user_id);
    }
    if (filters.action) {
      query += ' AND al.action = ?';
      params.push(filters.action);
    }
    if (filters.ip_address) {
      query += ' AND al.ip_address LIKE ?';
      params.push(`%${filters.ip_address}%`);
    }
    if (filters.start_date) {
      query += ' AND DATE(al.created_at) >= ?';
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      query += ' AND DATE(al.created_at) <= ?';
      params.push(filters.end_date);
    }
    if (filters.search) {
      // Search across description, action, username, full_name, ip_address
      query += ' AND (al.description LIKE ? OR al.action LIKE ? OR u.username LIKE ? OR u.full_name LIKE ? OR al.ip_address LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY al.created_at DESC';

    const [rows] = await db.query(query, params);
    return rows;
  }

  // Get a single activity log by ID (if needed for specific detail)
  static async findById(id) {
    const query = `
      SELECT al.*, 
             u.username, u.full_name, u.role
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.id = ?
    `;
    const [rows] = await db.query(query, [id]);
    return rows[0];
  }
}

module.exports = ActivityLog;