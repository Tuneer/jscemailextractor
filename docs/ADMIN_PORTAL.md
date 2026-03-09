# Admin Portal Documentation

## Overview
The Admin Portal provides business management capabilities for managing business verticals and merchant records through bulk upload functionality.

## Default Admin Credentials
- **Username**: admin
- **Password**: admin123
- **Email**: admin@jscglobalsolutions.info

*Note: In production, please change the default password immediately.*

## Features

### 1. Business Verticals Management
- Create, read, update, and delete business verticals
- Pre-loaded with 15 common business categories:
  - Retail
  - E-commerce
  - Finance
  - Healthcare
  - Technology
  - Manufacturing
  - Real Estate
  - Education
  - Food & Beverage
  - Automotive
  - Fashion & Apparel
  - Travel & Tourism
  - Energy & Utilities
  - Telecommunications
  - Media & Entertainment

### 2. Merchant Management
- Manual merchant creation
- Bulk upload via Excel/CSV files
- Dynamic column handling for additional data
- Automatic business vertical assignment

### 3. Bulk Upload Functionality
- Supports Excel (.xlsx, .xls) and CSV files
- Handles dynamic columns automatically
- Standard fields are mapped to database columns
- Additional columns are stored in `additional_data` JSON field
- Sample template provided for reference

## Database Schema

### business_verticals Table
```sql
CREATE TABLE business_verticals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### merchants Table
```sql
CREATE TABLE merchants (
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
```

### admin_users Table
```sql
CREATE TABLE admin_users (
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
```

## API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login

### Business Verticals
- `GET /api/admin/business-verticals` - Get all business verticals
- `POST /api/admin/business-verticals` - Create business vertical
- `PUT /api/admin/business-verticals/:id` - Update business vertical
- `DELETE /api/admin/business-verticals/:id` - Delete business vertical

### Merchants
- `GET /api/admin/merchants` - Get all merchants
- `POST /api/admin/merchants` - Create merchant
- `PUT /api/admin/merchants/:id` - Update merchant
- `DELETE /api/admin/merchants/:id` - Delete merchant
- `POST /api/admin/merchants/bulk-upload` - Bulk upload merchants
- `GET /api/admin/merchants/sample-template` - Download sample template

## Sample Excel Template
A sample CSV template is provided in `docs/merchant-template.csv` with the following columns:
- Business Name (Required)
- Business Vertical ID (Required - reference business_verticals table)
- Contact Person
- Email
- Phone
- Address
- City
- State
- Country
- Postal Code
- Website
- Business Type (retail, wholesale, manufacturer, service, other)
- Annual Revenue
- Employee Count
- Established Year
- Tax ID
- Custom Field 1 (Example of dynamic column)
- Custom Field 2 (Example of dynamic column)
- Notes (Example of dynamic column)

## Dynamic Column Handling
Any column in the Excel/CSV file that doesn't match standard field names will be automatically stored in the `additional_data` JSON field. This allows for flexible data storage without requiring schema changes.

## Security
- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control (super_admin, admin, manager)
- Input validation and sanitization
- SQL injection protection through parameterized queries

## Setup Instructions
1. Run the admin schema: `backend/db/admin-schema.sql`
2. Access admin portal at: `http://localhost:4202/admin/login`
3. Use default credentials to login
4. Change default password immediately in production

## Future Enhancements
- User role management
- Audit logging
- Advanced reporting and analytics
- Merchant categorization and tagging
- Integration with email extraction system
- API rate limiting
- Multi-factor authentication