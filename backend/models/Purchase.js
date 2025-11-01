const db = require('../config/database');
const Product = require('./Product'); // Need to interact with products table
const Supplier = require('./Supplier'); // Need to interact with suppliers table

class Purchase {
  // Create a new purchase order with items
  static async create(purchaseData, items) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const {
        supplier_id,
        user_id,
        total_amount,
        amount_paid,
        payment_status, // 'pending'/'partial' for new POs
        status,         // 'ordered' for new POs
        notes
      } = purchaseData;

      // Generate purchase number
      const purchase_number = await this.generatePurchaseNumber();

      // Insert purchase order
      const [purchaseResult] = await connection.query(
        `INSERT INTO purchases (
          purchase_number, supplier_id, user_id, total_amount, amount_paid,
          payment_status, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          purchase_number, supplier_id, user_id, total_amount, amount_paid || 0,
          payment_status || 'pending', status || 'ordered', notes || null
        ]
      );

      const purchaseId = purchaseResult.insertId;

      // Insert purchase items
      for (const item of items) {
        await connection.query(
          `INSERT INTO purchase_items (
            purchase_id, product_id, quantity, unit_cost, subtotal
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            purchaseId, item.product_id, item.quantity,
            item.unit_cost, item.subtotal
          ]
        );
      }

      // If the purchase is created with 'received' status, update stock and supplier balance immediately
      // This is a design choice: usually receiving is a separate action after creation.
      // For this initial implementation, we'll assume creation sets 'ordered' and receiving is a separate call.
      // The `receivePurchase` method below will handle stock/balance updates.

      // Update supplier's outstanding balance immediately for initial record
      // The `amount_paid` upon creation could be 0, so outstanding balance is total_amount.
      const outstandingChange = total_amount - (amount_paid || 0);
      if (outstandingChange > 0) {
         await Supplier.updateBalance(supplier_id, outstandingChange, 'add', connection); // <--- ADD 'connection'
      }

      await connection.commit();
      return { id: purchaseId, purchase_number };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Generate unique purchase number (similar to invoice number)
  static async generatePurchaseNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const prefix = `PO-${year}${month}${day}`;

    const [rows] = await db.query(
      'SELECT purchase_number FROM purchases WHERE purchase_number LIKE ? ORDER BY id DESC LIMIT 1',
      [`${prefix}%`]
    );

    let sequence = 1;
    if (rows.length > 0) {
      const lastPurchaseNumber = rows[0].purchase_number;
      const lastSequence = parseInt(lastPurchaseNumber.split('-').pop());
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  // Get purchase order by ID with items
  static async findById(id) {
    const [purchases] = await db.query(
      `SELECT p.*, s.name as supplier_name, u.full_name as created_by_user
       FROM purchases p
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (purchases.length === 0) return null;

    const purchase = purchases[0];

    // Get purchase items
    const [items] = await db.query(
      `SELECT pi.*, prod.name as product_name, prod.sku
       FROM purchase_items pi
       JOIN products prod ON pi.product_id = prod.id
       WHERE pi.purchase_id = ?`,
      [id]
    );

    purchase.items = items;
    return purchase;
  }

  // Get all purchase orders with filters
  static async findAll(filters = {}) {
    let query = `
      SELECT p.*, s.name as supplier_name, u.full_name as created_by_user
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.supplier_id) {
      query += ' AND p.supplier_id = ?';
      params.push(filters.supplier_id);
    }
    if (filters.status) {
      query += ' AND p.status = ?';
      params.push(filters.status);
    }
    if (filters.payment_status) {
      query += ' AND p.payment_status = ?';
      params.push(filters.payment_status);
    }
    if (filters.start_date) {
      query += ' AND DATE(p.created_at) >= ?';
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      query += ' AND DATE(p.created_at) <= ?';
      params.push(filters.end_date);
    }
    if (filters.search) {
      query += ' AND (p.purchase_number LIKE ? OR s.name LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY p.created_at DESC';

    const [rows] = await db.query(query, params);
    return rows;
  }

  // Update a purchase order (e.g., notes, supplier, total_amount before receiving)
  static async update(id, purchaseData) {
    const { supplier_id, total_amount, notes, payment_status } = purchaseData;
    const query = `
      UPDATE purchases SET
        supplier_id = ?, total_amount = ?, notes = ?, payment_status = ?
      WHERE id = ? AND status = 'ordered' -- Only allow edits to 'ordered' POs
    `;
    const [result] = await db.query(query, [supplier_id, total_amount, notes, payment_status, id]);
    return result.affectedRows > 0;
  }

  // Mark a purchase order as received and update stock
  static async receivePurchase(purchaseId, userId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const purchase = await this.findById(purchaseId);
      if (!purchase) {
        throw new Error('Purchase order not found.');
      }
      if (purchase.status === 'received') {
        throw new Error('Purchase order already marked as received.');
      }
      if (purchase.status === 'canceled') {
        throw new Error('Canceled purchase order cannot be received.');
      }

      // Update purchase status
      await connection.query(
        "UPDATE purchases SET status = 'received' WHERE id = ?",
        [purchaseId]
      );

      // Update stock for each item in the purchase
      for (const item of purchase.items) {
        await Product.updateStock(item.product_id, item.quantity, 'add');
        // Log stock adjustment if desired for received items
        await connection.query(
          'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
          [userId, 'STOCK_RECEIVED', `Received ${item.quantity} units of ${item.product_name} from PO ${purchase.purchase_number}`]
        );
      }
      
      // Update supplier balance if purchase was 'partial' or 'pending' and now fully paid/received
      // This logic can be more complex, accounting for payments made prior to receiving.
      // For simplicity, if balance is still due, it remains. If fully paid on creation, no change needed.

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Cancel a purchase order
  static async cancelPurchase(purchaseId, userId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const purchase = await this.findById(purchaseId);
      if (!purchase) {
        throw new Error('Purchase order not found.');
      }
      if (purchase.status === 'received') {
        throw new Error('Received purchase order cannot be canceled. A stock adjustment may be needed.');
      }
      if (purchase.status === 'canceled') {
        throw new Error('Purchase order is already canceled.');
      }

      // Update purchase status
      await connection.query(
        "UPDATE purchases SET status = 'canceled' WHERE id = ?",
        [purchaseId]
      );

     // Revert supplier outstanding balance if it was increased upon creation for this PO
      const outstandingChange = purchase.total_amount - purchase.amount_paid;
      if (outstandingChange > 0) {
          await Supplier.updateBalance(purchase.supplier_id, outstandingChange, 'subtract', connection); // <--- ADD 'connection' HERE
      }
      await connection.query(
        'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
        [userId, 'PURCHASE_CANCELED', `Canceled purchase order: ${purchase.purchase_number}`]
      );

      await connection.commit();
      return true;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Record a payment towards a purchase order
  static async recordPayment(purchaseId, amount, userId) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [purchaseRows] = await connection.query(
            'SELECT total_amount, amount_paid, supplier_id, purchase_number FROM purchases WHERE id = ?',
            [purchaseId]
        );
        if (purchaseRows.length === 0) {
            throw new Error('Purchase order not found.');
        }
        const purchase = purchaseRows[0];
       const newAmountPaid = parseFloat(purchase.amount_paid) + amount; // <--- IMPORTANT CHANGE: Explicitly parse to float

        let newPaymentStatus = 'partial';
        if (newAmountPaid >= purchase.total_amount) {
            newPaymentStatus = 'paid';
        }

        await connection.query(
            'UPDATE purchases SET amount_paid = ?, payment_status = ? WHERE id = ?',
            [newAmountPaid, newPaymentStatus, purchaseId]
        );

        // Update supplier's outstanding balance
 await Supplier.updateBalance(purchase.supplier_id, amount, 'subtract', connection); // <--- ADD 'connection' HERE
        await connection.query(
            'INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)',
            [userId, 'PURCHASE_PAYMENT_RECORDED', `Recorded KES ${amount} payment for PO ${purchase.purchase_number}`]
        );

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
}

module.exports = Purchase;