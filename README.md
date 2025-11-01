Sangara Wholesalers: Integrated POS & Inventory Management System
Sangara Wholesalers is a modern, full-stack web application designed to streamline point-of-sale (POS) operations, inventory management, customer and supplier relations, and detailed reporting for wholesale businesses. This system empowers businesses to efficiently manage sales, track stock, handle purchases, and gain valuable insights into their operations.
Table of Contents
Core Features
Technology Stack
Frontend
Backend
Database
Shared/Utilities
Project Structure
Database Schema
API Endpoints (Summary)
Authentication & Authorization
Installation & Setup
Prerequisites
Environment Variables
Database Setup
Backend Installation
Frontend Installation
Running the Application
Key Scripts
Error Handling
Future Enhancements
License
1. Core Features
The Sangara Wholesalers system offers a wide range of functionalities:
Secure Authentication & Role-Based Access Control: Robust user login with JWT and clear separation of privileges for Admin, Cashier, and Inventory Manager roles.
Real-time Point of Sale (POS):
Quick product search by name, SKU, or barcode.
Dynamic shopping cart with quantity management.
Customer selection with loyalty points display and redemption.
Support for multiple payment methods: Cash, Card, Credit.
Integrated M-Pesa STK Push: Seamless mobile payments with real-time status polling.
Automated sales receipt generation and printing.
Comprehensive Inventory Management:
Full CRUD operations for products with stock levels, reorder alerts, cost/selling prices, and expiry date tracking.
Categorization and supplier linking for products.
Stock Adjustment Module: Record changes due to damage, loss, customer returns, supplier returns, or corrections.
Detailed product movement history.
Supplier & Purchase Order Management:
Maintain supplier details and track outstanding balances.
Create, track, and manage Purchase Orders (POs) through "ordered", "received", and "canceled" statuses.
Automatic stock updates upon receiving POs.
Record payments for outstanding POs.
Customer Relationship Management:
Store customer information including contact details and address.
Track total purchases and loyalty points.
Prevents deletion of customers with sales history for data integrity.
Reporting & Analytics:
In-depth sales summaries (revenue, profit, transactions by period).
Product-wise sales, low stock, and near expiry reports.
Customer analytics (top buyers, frequent shoppers).
Daily sales and profit trends (visualized with charts).
System Configuration:
Manage business details, default tax rates, and discount rules.
Database Backup: On-demand database backup functionality.
User Management: Admin control over user accounts, roles, and active status. Prevents deletion of users with sales history.
Activity Logging: Comprehensive audit trail of all user actions for accountability and monitoring.
2. Technology Stack
Frontend
Language: JavaScript (React.js)
Framework/Library: React.js (v19)
Routing: React Router DOM (v7.x)
Styling: Tailwind CSS
HTTP Client: Axios
Date & Time: Moment.js
Charts: Recharts
Utilities: lodash (for debounce)
Backend
Language: Node.js
Framework: Express.js
HTTP Client: Axios (for external API calls like M-Pesa)
Authentication: JSON Web Tokens (JWT)
Password Hashing: Bcrypt.js
Date & Time: Moment.js
Environment Management: dotenv
CORS Handling: cors
Database Driver: mysql2/promise (for asynchronous MySQL interactions)
Database
Type: MySQL
Shared/Utilities
Environment Variables: .env files for configuration.
Version Control: Git
3. Project Structure
The project is structured into two main directories: backend and frontend, each with its own specific organization.

sangara-wholesalers/
├── backend/
│   ├── config/             # DB connection, test scripts
│   ├── controllers/        # Business logic & request handling
│   ├── middleware/         # Auth & role checks
│   ├── models/             # Database interaction (CRUD)
│   ├── routes/             # API endpoint definitions
│   ├── scripts/            # Utility scripts (backup, create admin)
│   ├── .env                # Backend environment variables
│   ├── package.json        # Backend dependencies
│   └── server.js           # Backend entry point
├── frontend/
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # Reusable UI components (modals, alerts)
│   │   ├── contexts/       # React Context for global state (AuthContext)
│   │   ├── pages/          # Main application views/pages
│   │   ├── services/       # API config, frontend .env
│   │   ├── App.js          # Root React component & routing
│   │   └── index.js        # React entry point
│   ├── .env                # Frontend environment variables
│   ├── package.json        # Frontend dependencies
│   └── README.md           # Frontend-specific README (generated)
└── .gitignore              # Global Git ignore rules
└── README.md               # This combined README



4. Database Schema
The database sangara_wholesalers contains the following tables:
users: Manages user accounts for system access.
id (PK), username (UNIQUE), email (UNIQUE), password (hashed), full_name, role (ENUM: 'admin', 'cashier', 'inventory_manager'), phone, is_active (BOOLEAN), created_at, updated_at.
categories: Organizes products into logical groups.
id (PK), name, description, created_at.
suppliers: Stores information about product suppliers.
id (PK), name, contact_person, email, phone, address, outstanding_balance (DECIMAL), created_at, updated_at.
products: Contains details of all inventory items.
id (PK), name, sku (UNIQUE), barcode (UNIQUE), category_id (FK to categories), supplier_id (FK to suppliers), unit, cost_price (DECIMAL), selling_price (DECIMAL), quantity_in_stock (INT), reorder_level (INT), description, expiry_date (DATE), image_url, is_active (BOOLEAN), created_at, updated_at.
customers: Manages customer profiles.
id (PK), name, email, phone, address, outstanding_balance (DECIMAL), total_purchases (DECIMAL), loyalty_points (INT), created_at, updated_at.
sales: Records all sales transactions.
id (PK), invoice_number (UNIQUE), customer_id (FK to customers), user_id (FK to users), subtotal (DECIMAL), discount (DECIMAL), loyalty_points_redeemed (INT), loyalty_discount_amount (DECIMAL), tax_rate (DECIMAL), tax (DECIMAL), total (DECIMAL), amount_paid (DECIMAL), change_amount (DECIMAL), payment_method (ENUM: 'cash', 'mpesa', 'card', 'credit'), payment_status (ENUM: 'paid', 'partial', 'pending'), mpesa_receipt_number (VARCHAR), transaction_id (VARCHAR), notes, created_at.
sale_items: Details individual products sold within a sale.
id (PK), sale_id (FK to sales), product_id (FK to products), product_name, quantity, unit_price (DECIMAL), discount (DECIMAL), subtotal (DECIMAL), created_at.
purchases: Stores records of purchase orders from suppliers.
id (PK), purchase_number (UNIQUE), supplier_id (FK to suppliers), user_id (FK to users), total_amount (DECIMAL), amount_paid (DECIMAL), payment_status (ENUM: 'paid', 'partial', 'pending'), status (ENUM: 'ordered', 'received', 'canceled'), notes, created_at.
purchase_items: Details individual products ordered in a purchase.
id (PK), purchase_id (FK to purchases), product_id (FK to products), quantity, unit_cost (DECIMAL), subtotal (DECIMAL), created_at.
stock_adjustments: Logs all changes to stock outside of sales/purchases.
id (PK), product_id (FK to products), user_id (FK to users), adjustment_type (ENUM: 'damaged', 'lost', 'found', 'correction_add', 'correction_subtract', 'sale_return', 'returned_to_supplier', 'received_from_other_location'), quantity (INT), reason, created_at.
expenses: Tracks operational expenses (functionality might be extended in future).
id (PK), user_id (FK to users), category, amount (DECIMAL), description, expense_date, created_at.
activity_logs: Comprehensive audit trail of user actions.
id (PK), user_id (FK to users), action, description, ip_address, created_at.
settings: Stores configurable system-wide settings.
id (PK), key_name (UNIQUE), key_value (TEXT), description, created_at, updated_at.
tax_rates: Manages different sales tax configurations.
id (PK), name (UNIQUE), rate (DECIMAL), is_default (BOOLEAN), is_active (BOOLEAN), description, created_at, updated_at.
discount_rules: Defines various promotional and loyalty discount rules.
id (PK), name (UNIQUE), code (UNIQUE, NULLABLE), type (ENUM: 'percentage', 'fixed_amount'), value (DECIMAL), min_purchase_amount (DECIMAL), applies_to (ENUM: 'all_products', 'specific_categories', 'specific_products'), is_active (BOOLEAN), start_date (DATE), end_date (DATE), description, created_at, updated_at.
5. API Endpoints (Summary)
The backend exposes a RESTful API, organized by resource under the /api prefix. Key routes include:
Authentication: /api/auth/register, /api/auth/login, /api/auth/profile, /api/auth/change-password.
Products: /api/products (CRUD), /api/products/statistics, /api/products/low-stock, /api/products/:id/stock.
Categories: /api/categories (CRUD).
Suppliers: /api/suppliers (CRUD), /api/suppliers/statistics, /api/suppliers/:id/balance.
Customers: /api/customers (CRUD).
Sales: /api/sales (Create, Read All), /api/sales/summary/today, /api/sales/statistics, /api/sales/invoice/:invoice, /api/sales/:id.
Purchase Orders: /api/purchases (CRUD), /api/purchases/:id/receive, /api/purchases/:id/cancel, /api/purchases/:id/payment.
Stock Adjustments: /api/stock-adjustments (Create, Read All), /api/stock-adjustments/products/:id/movement.
Reports: /api/reports/sales/summary, /api/reports/sales/product-wise, /api/reports/sales/daily-trend, /api/reports/inventory/overview, /api/reports/inventory/low-stock, /api/reports/inventory/near-expiry, /api/reports/profit/summary, /api/reports/customers/top, /api/reports/customers/frequent, /api/reports/customers/total.
User Management: /api/users (CRUD), /api/users/:id/status, /api/users/activity-logs.
Settings: /api/settings (Read All/Key), /api/settings/:key_name (Update), /api/settings/backup (Trigger), /api/settings/backups (List).
Tax Rates: /api/tax-rates (CRUD).
Discount Rules: /api/discount-rules (CRUD).
M-Pesa Payments: /api/payment/stk-push (Initiate), /api/payment/check-status, /api/payment/callback (PUBLIC for Daraja API).
For full details on specific requests, roles, and responses, refer to the backend code within backend/routes and backend/controllers.
6. Authentication & Authorization
The system employs JWT-based authentication and role-based access control (RBAC):
JWT Authentication: Users log in to receive a JSON Web Token (JWT). This token is stored securely in the browser's localStorage (frontend) and sent with every subsequent API request (backend). The backend authMiddleware.js verifies the token's authenticity and expiration.
User Roles:
admin: Full administrative access to all system features, including user management, system settings, and all reports.
inventory_manager: Manages products, categories, suppliers, purchase orders, stock adjustments, and relevant inventory/purchase reports.
cashier: Handles point-of-sale operations, customer management, sales history, and sales-related reports.
Authorization Middleware: The middleware/authMiddleware.js in the backend uses verifyToken to ensure a user is authenticated and checkRole(...roles) to restrict access to specific API endpoints based on the user's assigned role.
Frontend Role-Based UI: The frontend dynamically renders navigation links and action buttons based on the logged-in user's role, ensuring that users only interact with features relevant to their permissions.
7. Installation & Setup
Prerequisites
Ensure you have the following installed on your development machine:
Node.js: https://nodejs.org/ (LTS version recommended)
npm: Comes bundled with Node.js
MySQL Server: https://www.mysql.com/downloads/ (or any compatible MySQL/MariaDB database)
mysqldump utility: This is required for database backups. Ensure it's in your system's PATH or explicitly configured in the backend/scripts/backup.bat file.
Windows: Usually found in C:\Program Files\MySQL\MySQL Server X.Y\bin\ or C:\xampp\mysql\bin\.
Environment Variables
You need two separate .env files: one in the backend/ directory and one in frontend/src/services/ (or frontend/ root, depending on your setup).


# Database Configuration
DB_HOST=localhost
DB_USER=root # Or a dedicated database user
DB_PASSWORD=Tyllen001. # Your MySQL root password or dedicated user password
DB_NAME=sangara_wholesalers
DB_PORT=3306

# Server Configuration
PORT=5000
NODE_ENV=development # Use 'production' for production environments

# JWT Secret - IMPORTANT: Change this to a strong, unique, random string in production!
JWT_SECRET=your_super_secret_key_change_this_in_production

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000 # Your frontend's development URL

# M-Pesa Daraja API Configuration - IMPORTANT: Obtain these from your Safaricom Daraja developer account
MPESA_CONSUMER_KEY=YOUR_MPESA_CONSUMER_KEY
MPESA_CONSUMER_SECRET=YOUR_MPESA_CONSUMER_SECRET
MPESA_SHORTCODE=174379 # Your M-Pesa Pay Bill or Buy Goods shortcode
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919 # Your LIPA Na M-Pesa Online Shortcode Passkey
MPESA_CALLBACK_URL=https://your-publicly-accessible-url/api/payment/callback # e.g., using ngrok for development: https://xxxxxx.ngrok-free.dev/api/payment/callback
MPESA_ENVIRONMENT=sandbox # or 'production' for live transactions


M-Pesa Note: The MPESA_CALLBACK_URL must be a publicly accessible URL for Safaricom's Daraja API to send transaction results. During development, you'll need tools like ngrok (as suggested in the example) to expose your local backend server to the internet.
frontend/src/services/.env:

REACT_APP_API_URL=http://localhost:5000/api # Replace with your backend API URL (should match backend's PORT)
REACT_APP_NAME=Sangara Wholesalers


(If your create-react-app setup requires it, you might need to move this .env file to the frontend/ root directory.)
Database Setup
Connect to MySQL: Use a MySQL client (e.g., MySQL Workbench, terminal, phpMyAdmin) to connect to your MySQL server.
Create Database: Run the following SQL to create the database:

CREATE DATABASE IF NOT EXISTS sangara_wholesalers;
USE sangara_wholesalers;

Create Tables and Insert Initial Data: Execute the following comprehensive SQL schema script to create all necessary tables and populate some initial data. This script includes all the table definitions and modifications discussed.

-- CREATE DATABASE IF NOT EXISTS sangara_wholesalers; -- Already done above
USE sangara_wholesalers;

-- 1. Users Table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role ENUM('admin', 'cashier', 'inventory_manager') NOT NULL,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Categories Table
CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Suppliers Table
CREATE TABLE suppliers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  outstanding_balance DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Products Table
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  barcode VARCHAR(50) UNIQUE,
  category_id INT,
  supplier_id INT,
  unit VARCHAR(20) NOT NULL,
  cost_price DECIMAL(15, 2) NOT NULL,
  selling_price DECIMAL(15, 2) NOT NULL,
  quantity_in_stock INT DEFAULT 0,
  reorder_level INT DEFAULT 10,
  description TEXT,
  expiry_date DATE NULL,
  image_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- 5. Customers Table
CREATE TABLE customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20) NOT NULL,
  address TEXT,
  outstanding_balance DECIMAL(15, 2) DEFAULT 0,
  total_purchases DECIMAL(15, 2) DEFAULT 0,
  loyalty_points INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. Sales Table
CREATE TABLE sales (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INT,
  user_id INT NOT NULL,
  subtotal DECIMAL(15, 2) NOT NULL,
  discount DECIMAL(15, 2) DEFAULT 0,
  loyalty_points_redeemed INT DEFAULT 0,
  loyalty_discount_amount DECIMAL(15, 2) DEFAULT 0.00,
  tax_rate DECIMAL(5, 4) DEFAULT 0.1600,
  tax DECIMAL(15, 2) DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL,
  amount_paid DECIMAL(15, 2) NOT NULL,
  change_amount DECIMAL(15, 2) DEFAULT 0,
  payment_method ENUM('cash', 'mpesa', 'card', 'credit') NOT NULL,
  payment_status ENUM('paid', 'partial', 'pending') DEFAULT 'paid',
  mpesa_receipt_number VARCHAR(50) NULL,
  transaction_id VARCHAR(100) NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 7. Sale Items Table
CREATE TABLE sale_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sale_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  discount DECIMAL(15, 2) DEFAULT 0,
  subtotal DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- 8. Purchases Table
CREATE TABLE purchases (
  id INT PRIMARY KEY AUTO_INCREMENT,
  purchase_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id INT NOT NULL,
  user_id INT NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  amount_paid DECIMAL(15, 2) DEFAULT 0,
  payment_status ENUM('paid', 'partial', 'pending') DEFAULT 'pending',
  status ENUM('ordered', 'received', 'canceled') DEFAULT 'ordered' NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 9. Purchase Items Table
CREATE TABLE purchase_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  purchase_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_cost DECIMAL(15, 2) NOT NULL,
  subtotal DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- 10. Stock Adjustments Table
CREATE TABLE stock_adjustments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  user_id INT NOT NULL,
  adjustment_type ENUM(
    'damaged',
    'lost',
    'found',
    'correction_add',
    'correction_subtract',
    'sale_return',
    'returned_to_supplier',
    'received_from_other_location'
  ) NOT NULL,
  quantity INT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 11. Expenses Table
CREATE TABLE expenses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 12. User Activity Logs Table
CREATE TABLE activity_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. Settings Table
CREATE TABLE settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  key_name VARCHAR(100) UNIQUE NOT NULL,
  key_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 14. Tax Rates Table
CREATE TABLE tax_rates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  rate DECIMAL(5, 4) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 15. Discount Rules Table
CREATE TABLE discount_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  code VARCHAR(50) UNIQUE,
  type ENUM('percentage', 'fixed_amount') NOT NULL,
  value DECIMAL(15, 2) NOT NULL,
  min_purchase_amount DECIMAL(15, 2) DEFAULT 0,
  applies_to ENUM('all_products', 'specific_categories', 'specific_products') DEFAULT 'all_products',
  is_active BOOLEAN DEFAULT TRUE,
  start_date DATE,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Initial Data Inserts
-- Default admin user (password: admin123 - hashed using bcryptjs)
INSERT INTO users (username, email, password, full_name, role)
VALUES ('admin', 'admin@sangarawholesalers.com', '$2a$10$XZ5VQKvZ8kF5V5Y8xXxXxeXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxX', 'System Administrator', 'admin');

-- Sample categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and accessories'),
('Groceries', 'Food and beverage items'),
('Clothing', 'Apparel and fashion items'),
('Hardware', 'Tools and hardware supplies'),
('Stationery', 'Office and school supplies');

-- Initial default settings
INSERT INTO settings (key_name, key_value, description) VALUES
('business_name', 'Sangara Wholesalers Ltd.', 'The official name of the business'),
('business_address', '123 Market Street, Nairobi, Kenya', 'The physical address of the business'),
('business_phone', '+254712345678', 'The main contact phone number'),
('business_email', 'info@sangarawholesalers.com', 'The main contact email address'),
('vat_rate', '0.16', 'Current Value Added Tax (VAT) rate (e.g., 0.16 for 16%)'),
('currency_symbol', 'KES', 'The currency symbol used in the system');

-- Initial default tax rate
INSERT INTO tax_rates (name, rate, is_default, description) VALUES
('VAT 16%', 0.1600, TRUE, 'Standard Value Added Tax');

-- Sample discount rules
INSERT INTO discount_rules (name, type, value, is_active, description) VALUES
('Loyalty Discount', 'percentage', 0.05, TRUE, '5% discount for loyal customers');

INSERT INTO discount_rules (name, code, type, value, min_purchase_amount, is_active, start_date, end_date, description) VALUES
('Summer Sale 20%', 'SUMMER20', 'percentage', 0.20, 500.00, TRUE, '2025-07-01', '2025-07-31', '20% off all orders over KES 500 in July');

-- M-Pesa Settings Placeholders (to be updated from your Daraja API credentials)
INSERT INTO settings (key_name, key_value, description) VALUES
('mpesa_consumer_key', 'YOUR_CONSUMER_KEY_HERE', 'Safaricom M-Pesa API Consumer Key'),
('mpesa_consumer_secret', 'YOUR_CONSUMER_SECRET_HERE', 'Safaricom M-Pesa API Consumer Secret'),
('mpesa_shortcode', '600XXX', 'M-Pesa Paybill or Till Number'),
('mpesa_passkey', 'YOUR_PASSKEY_HERE', 'Lipa Na M-Pesa Online Passkey'),
('mpesa_callback_url', 'http://your-public-ip.com/api/payment/callback', 'Public URL for M-Pesa callback endpoint (Essential for Daraja API)');


Create Default Admin User: While the SQL script above includes an admin user, it's good practice to also run the backend script, especially if you want to regenerate it or ensure the password hashing is current.
Navigate to the backend/ directory in your terminal and run:


node scripts/createAdmin.js

cd backend

npm install

Configure Backup Script (Windows only): If you are on Windows, edit backend/scripts/backup.bat and update the MYSQLDUMP_PATH variable to the correct path of your mysqldump.exe executable.
Frontend Installation
Navigate to the frontend/ directory:
code
Bash
cd frontend
Install dependencies:
code
Bash
npm install
8. Running the Application
Start the Backend Server:
Open a terminal, navigate to the backend/ directory, and run:
code
Bash
npm run dev
The backend server will start (e.g., on http://localhost:5000) and will automatically restart on code changes.
Start the Frontend Application:
Open a new terminal, navigate to the frontend/ directory, and run:
code
Bash
npm start
The frontend application will open in your web browser (e.g., http://localhost:3000).
Once both are running, you can access the login page in your browser using the frontend URL. Use the admin credentials created earlier to log in.
9. Key Scripts
Backend Scripts (backend/scripts/)
createAdmin.js: Creates a default 'admin' user if one does not already exist.
backup.bat: A Windows batch script for performing a MySQL database dump. This is executed by the /api/settings/backup API endpoint.
Frontend Scripts (frontend/package.json)
npm start: Runs the React app in development mode.
npm test: Launches the test runner.
npm run build: Builds the app for production to the build folder.
10. Error Handling
The system includes robust error handling on both sides:
Backend: A global error handling middleware in server.js catches unhandled exceptions, providing clear error messages and status codes (e.g., 400, 401, 403, 404, 500). Specific controllers also return detailed error messages for business logic failures (e.g., insufficient stock, duplicate entries).
Frontend: API errors are caught in try-catch blocks within the React components and displayed to the user via alerts, dedicated error messages, or the custom SuccessAlert component (which also handles failures).
11. Future Enhancements
Potential improvements and features for future development include:
Advanced Reporting: More interactive dashboards, custom report builders, and export options (PDF, Excel).
Notifications: Real-time notifications for low stock, new orders, or critical system events.
Multi-Warehouse/Location Support: Extend inventory to manage stock across multiple physical locations.
User Profile Management (Non-Admin): Allow users to update their own contact information (excluding role).
Password Reset/Forgot Password Functionality: Implement a secure mechanism for users to reset their passwords.
Product Image Uploads: Integrate multer in the backend for proper image file uploads and storage (currently image_url is a string).
Advanced Discounting: Implement logic for specific category/product discounts.
User Interface/Experience Improvements: Further refine UI/UX, add animations, and optimize for mobile devices.
Restore Database Functionality: Develop a secure and robust way to restore a database from a backup file via the UI.
Internationalization (i18n): Support multiple languages.
12. License
This project is licensed under the MIT License. See the LICENSE file (if provided) for details.
