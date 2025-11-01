const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function createAdminUser() {
  try {
    // Check if admin already exists
    const [existing] = await db.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      ['admin', 'admin@sangarawholesalers.com']
    );

    if (existing.length > 0) {
      console.log('⚠️  Admin user already exists!');
      console.log('Username:', existing[0].username);
      console.log('Email:', existing[0].email);
      process.exit(0);
    }

    // Hash password
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const [result] = await db.query(
      `INSERT INTO users (username, email, password, full_name, role) 
       VALUES (?, ?, ?, ?, ?)`,
      ['admin', 'admin@sangarawholesalers.com', hashedPassword, 'System Administrator', 'admin']
    );

    console.log('✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Email: admin@sangarawholesalers.com');
    console.log('Role: admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
    process.exit(1);
  }
}

createAdminUser();