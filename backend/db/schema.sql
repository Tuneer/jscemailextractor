-- JSC Email Extractor Database Schema
-- Single comprehensive schema file with company business verticals

-- Core email processing tables
CREATE TABLE IF NOT EXISTS email_metadata (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email_uid VARCHAR(255) UNIQUE,
  subject VARCHAR(500),
  from_address VARCHAR(255),
  date_received DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email_id INT,
  filename VARCHAR(255),
  content_type VARCHAR(255),
  size INT,
  FOREIGN KEY (email_id) REFERENCES email_metadata(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS excel_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attachment_id INT,
  row_index INT,
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS merchant_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  merchant_name VARCHAR(255),
  template_name VARCHAR(255),
  header_rows JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User management tables
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS login_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  login_status ENUM('success', 'failed') NOT NULL,
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_time TIMESTAMP NULL,
  session_token VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Company business verticals (your specific categories)
CREATE TABLE IF NOT EXISTS business_verticals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Merchants table with comprehensive business data
CREATE TABLE IF NOT EXISTS merchants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  business_vertical_id INT,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  website VARCHAR(255),
  business_type ENUM('retail', 'wholesale', 'manufacturer', 'service', 'other') DEFAULT 'retail',
  annual_revenue DECIMAL(15,2),
  employee_count INT,
  established_year YEAR,
  tax_id VARCHAR(50),
  additional_data JSON, -- For dynamic columns from Excel uploads
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (business_vertical_id) REFERENCES business_verticals(id) ON DELETE SET NULL
);

-- Admin user management
CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role ENUM('super_admin', 'admin', 'manager') DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Merchant applications linking
CREATE TABLE IF NOT EXISTS merchant_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  merchant_id INT NOT NULL,
  application_name VARCHAR(255) NOT NULL,
  application_description TEXT,
  application_url VARCHAR(500),
  application_type ENUM('email_extractor', 'data_processor', 'report_generator', 'custom') DEFAULT 'email_extractor',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_email ON login_history(email);
CREATE INDEX IF NOT EXISTS idx_login_history_time ON login_history(login_time);
CREATE INDEX IF NOT EXISTS idx_merchants_vertical ON merchants(business_vertical_id);
CREATE INDEX IF NOT EXISTS idx_merchants_active ON merchants(is_active);
CREATE INDEX IF NOT EXISTS idx_merchants_name ON merchants(business_name);
CREATE INDEX IF NOT EXISTS idx_merchants_city ON merchants(city);
CREATE INDEX IF NOT EXISTS idx_merchants_state ON merchants(state);
CREATE INDEX IF NOT EXISTS idx_merchants_revenue ON merchants(annual_revenue);
CREATE INDEX IF NOT EXISTS idx_merchant_apps_merchant ON merchant_applications(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_apps_active ON merchant_applications(is_active);

-- Insert your company's business verticals
INSERT INTO business_verticals (name, description) VALUES
('Salon', 'Hair salons, beauty parlors, and personal care services'),
('Restaurant', 'Dining establishments, cafes, and food service businesses'),
('Grocery', 'Food retail stores, supermarkets, and grocery shops'),
('Liquor', 'Alcohol retail stores, bars, and liquor distribution'),
('Boutique', 'Fashion retail stores, clothing boutiques, and specialty shops');

-- Insert default admin user (password: admin123)
INSERT INTO admin_users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@jscglobalsolutions.info', '$2b$10$hashedpasswordexample', 'System Administrator', 'super_admin');

-- Insert your actual merchants from merchants.xlsx
INSERT INTO merchants (business_name, business_vertical_id, contact_person, email, phone, address, city, state, country, postal_code, website, business_type, annual_revenue, employee_count, established_year, tax_id, additional_data) VALUES
('Lila Wine and Spirits', 4, 'Liquor Manager', '', '630-324-6012', '2405 75th Street', 'WOODRIDGE', 'IL', 'USA', '60517', '', 'retail', 1500000.00, 15, 2016, 'TAX-LIQ-001', '{"StoreId": 1}'),
('Fresh Market', 3, 'Grocery Manager', '', '', '123 Main Street', 'Chicago', 'IL', 'USA', '60601', '', 'retail', 1200000.00, 12, 2016, 'TAX-GRO-002', '{"StoreId": 2}'),
('Corner Store', 3, 'Grocery Manager', '', '', '456 Oak Avenue', 'New York', 'NY', 'USA', '10001', '', 'retail', 1200000.00, 12, 2016, 'TAX-GRO-003', '{"StoreId": 3}'),
('Elite Salon', 1, 'Salon Manager', '', '', '789 Beauty Blvd', 'Miami', 'FL', 'USA', '33101', '', 'service', 1200000.00, 12, 2016, 'TAX-SAL-004', '{"StoreId": 4}');

-- Insert only Email Extractor applications for each merchant
INSERT INTO merchant_applications (merchant_id, application_name, application_description, application_url, application_type) VALUES
(1, 'Email Extractor Application', 'Extract and process emails for Lila Wine and Spirits', '/email-reader', 'email_extractor'),
(2, 'Email Extractor Application', 'Extract and process emails for Fresh Market', '/email-reader', 'email_extractor'),
(3, 'Email Extractor Application', 'Extract and process emails for Corner Store', '/email-reader', 'email_extractor'),
(4, 'Email Extractor Application', 'Extract and process emails for Elite Salon', '/email-reader', 'email_extractor');

-- Create stored procedure to clean expired OTP codes
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS cleanup_expired_otps()
BEGIN
  DELETE FROM otp_codes WHERE expires_at < NOW();
END //
DELIMITER ;

-- Create view for merchant business overview
CREATE OR REPLACE VIEW merchant_business_view AS
SELECT 
  m.id,
  m.business_name,
  m.business_vertical_id,
  m.contact_person,
  m.email,
  m.phone,
  m.address,
  m.city,
  m.state,
  m.country,
  m.postal_code,
  m.website,
  bv.name as business_vertical,
  bv.description as vertical_description,
  m.business_type,
  m.annual_revenue,
  m.employee_count,
  m.established_year,
  m.tax_id,
  m.is_active,
  m.created_at,
  m.updated_at
FROM merchants m
LEFT JOIN business_verticals bv ON m.business_vertical_id = bv.id;

-- Create view for active applications per merchant
CREATE OR REPLACE VIEW merchant_applications_view AS
SELECT 
  m.id as merchant_id,
  m.business_name,
  m.business_vertical_id,
  bv.name as business_vertical,
  bv.description as vertical_description,
  ma.id as application_id,
  ma.application_name,
  ma.application_description,
  ma.application_url,
  ma.application_type,
  ma.is_active,
  ma.created_at,
  ma.updated_at
FROM merchant_applications ma
JOIN merchants m ON ma.merchant_id = m.id
JOIN business_verticals bv ON m.business_vertical_id = bv.id
WHERE ma.is_active = TRUE;

-- ============================================
-- EMAIL AUTOMATION & DATABASE STORAGE TABLES
-- ============================================

-- Enhanced email metadata with content storage
CREATE TABLE IF NOT EXISTS email_automation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email_uid VARCHAR(255) UNIQUE,
  subject VARCHAR(500),
  from_address VARCHAR(255),
  from_name VARCHAR(255),
  to_address VARCHAR(255),
  date_received DATETIME,
  body_text TEXT,
  body_html LONGTEXT,
  content_pdf_path VARCHAR(500), -- Path to saved PDF version
  is_processed BOOLEAN DEFAULT FALSE,
  merchant_id INT,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Enhanced attachments table with Excel data
CREATE TABLE IF NOT EXISTS email_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email_id INT,
  filename VARCHAR(255),
  content_type VARCHAR(255),
  size BIGINT,
  file_data LONGBLOB, -- Actual file content
  excel_data JSON, -- Extracted Excel data as JSON
  is_coupon_file BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (email_id) REFERENCES email_automation(id) ON DELETE CASCADE
);

-- ============================================
-- COUPON & ITEM FAMILY EXTRACTION TABLES
-- ============================================

-- Coupon families extracted from Excel
CREATE TABLE IF NOT EXISTS coupon_families (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attachment_id INT,
  family_name VARCHAR(255), -- e.g., "Beverages", "Snacks"
  family_code VARCHAR(100),
  brand VARCHAR(255),
  category VARCHAR(255),
  subcategory VARCHAR(255),
  pack_size VARCHAR(100),
  unit VARCHAR(50),
  base_price DECIMAL(10,2),
  discount_percent DECIMAL(5,2),
  valid_from DATE,
  valid_until DATE,
  additional_info JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attachment_id) REFERENCES email_attachments(id) ON DELETE CASCADE
);

-- Individual coupon items within families
CREATE TABLE IF NOT EXISTS coupon_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  family_id INT,
  item_name VARCHAR(500),
  item_code VARCHAR(100),
  sku VARCHAR(100),
  description TEXT,
  quantity DECIMAL(10,3),
  price DECIMAL(10,2),
  mrp DECIMAL(10,2),
  discount_amount DECIMAL(10,2),
  final_price DECIMAL(10,2),
  barcode VARCHAR(100),
  hsn_code VARCHAR(50),
  gst_percent DECIMAL(5,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES coupon_families(id) ON DELETE CASCADE
);

-- ============================================
-- WEB SCRAPING DATA TABLES
-- ============================================

-- Scraped online product data
CREATE TABLE IF NOT EXISTS scraped_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  coupon_item_id INT, -- Link to coupon item being searched
  source_website VARCHAR(255), -- e.g., "Amazon", "Flipkart"
  product_title VARCHAR(500),
  product_url VARCHAR(1000),
  product_image_url VARCHAR(1000),
  price DECIMAL(10,2),
  original_price DECIMAL(10,2),
  discount_percent DECIMAL(5,2),
  availability VARCHAR(100), -- In Stock, Out of Stock, etc.
  seller_name VARCHAR(255),
  seller_rating DECIMAL(3,2),
  product_rating DECIMAL(3,2),
  review_count INT,
  delivery_info TEXT,
  specifications JSON,
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coupon_item_id) REFERENCES coupon_items(id) ON DELETE CASCADE
);

-- Scraping job tracking
CREATE TABLE IF NOT EXISTS scraping_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  coupon_family_id INT,
  status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
  items_to_scrape INT,
  items_scraped INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coupon_family_id) REFERENCES coupon_families(id) ON DELETE CASCADE
);

-- ============================================
-- SALES ANALYTICS & COMPARISON TABLES
-- ============================================

-- Merchant POS/sales data
CREATE TABLE IF NOT EXISTS merchant_sales_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  merchant_id INT,
  coupon_item_id INT, -- Link to coupon item sold
  sale_date DATE,
  quantity_sold INT,
  unit_price DECIMAL(10,2),
  total_amount DECIMAL(15,2),
  cost_price DECIMAL(10,2),
  profit_margin DECIMAL(5,2),
  customer_count INT,
  transaction_id VARCHAR(100),
  pos_system VARCHAR(100),
  additional_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  FOREIGN KEY (coupon_item_id) REFERENCES coupon_items(id) ON DELETE CASCADE
);

-- Price comparison analytics
CREATE TABLE IF NOT EXISTS price_comparison (
  id INT AUTO_INCREMENT PRIMARY KEY,
  coupon_item_id INT,
  merchant_id INT,
  scraped_product_id INT,
  merchant_price DECIMAL(10,2),
  online_price DECIMAL(10,2),
  price_difference DECIMAL(10,2),
  price_difference_percent DECIMAL(5,2),
  is_merchant_cheaper BOOLEAN,
  competitiveness_score DECIMAL(5,2), -- 0-100 score
  recommendation TEXT, -- Suggested action
  compared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coupon_item_id) REFERENCES coupon_items(id) ON DELETE CASCADE,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  FOREIGN KEY (scraped_product_id) REFERENCES scraped_products(id) ON DELETE SET NULL
);

-- Sales analytics summary per coupon/item
CREATE TABLE IF NOT EXISTS sales_analytics_summary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  merchant_id INT,
  coupon_family_id INT,
  coupon_item_id INT,
  period_start DATE,
  period_end DATE,
  total_quantity_sold INT,
  total_revenue DECIMAL(15,2),
  total_profit DECIMAL(15,2),
  average_unit_price DECIMAL(10,2),
  total_transactions INT,
  unique_customers INT,
  market_position VARCHAR(50), -- Premium, Competitive, Budget
  growth_rate DECIMAL(5,2), -- Percentage growth
  recommendations JSON,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  FOREIGN KEY (coupon_family_id) REFERENCES coupon_families(id) ON DELETE CASCADE,
  FOREIGN KEY (coupon_item_id) REFERENCES coupon_items(id) ON DELETE CASCADE
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_email_automation_merchant ON email_automation(merchant_id);
CREATE INDEX IF NOT EXISTS idx_email_automation_user ON email_automation(user_id);
CREATE INDEX IF NOT EXISTS idx_email_automation_processed ON email_automation(is_processed);
CREATE INDEX IF NOT EXISTS idx_email_attachments_email ON email_attachments(email_id);
CREATE INDEX IF NOT EXISTS idx_coupon_families_attachment ON coupon_families(attachment_id);
CREATE INDEX IF NOT EXISTS idx_coupon_items_family ON coupon_items(family_id);
CREATE INDEX IF NOT EXISTS idx_coupon_items_active ON coupon_items(is_active);
CREATE INDEX IF NOT EXISTS idx_scraped_products_item ON scraped_products(coupon_item_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_family ON scraping_jobs(coupon_family_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_merchant_sales_merchant ON merchant_sales_data(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_sales_item ON merchant_sales_data(coupon_item_id);
CREATE INDEX IF NOT EXISTS idx_merchant_sales_date ON merchant_sales_data(sale_date);
CREATE INDEX IF NOT EXISTS idx_price_comparison_item ON price_comparison(coupon_item_id);
CREATE INDEX IF NOT EXISTS idx_price_comparison_merchant ON price_comparison(merchant_id);
CREATE INDEX IF NOT EXISTS idx_sales_analytics_merchant ON sales_analytics_summary(merchant_id);
CREATE INDEX IF NOT EXISTS idx_sales_analytics_family ON sales_analytics_summary(coupon_family_id);