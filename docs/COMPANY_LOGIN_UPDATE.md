# Company-Specific Login and Business Verticals Update

## Changes Made

### 1. Unified Login System
- Single login page for both admin and regular users
- Admin login uses fixed credentials (no OTP required)
- Regular users use OTP-based authentication
- Easy switching between admin and user modes

### 2. Updated Business Verticals
Replaced generic business categories with your company's specific verticals:
- **Salon** - Hair salons, beauty parlors, personal care services
- **Restaurant** - Dining establishments, cafes, food service businesses  
- **Grocery** - Food retail stores, supermarkets, grocery shops
- **Liquor** - Alcohol retail stores, bars, liquor distribution
- **Boutique** - Fashion retail stores, clothing boutiques, specialty shops

### 3. Fixed Admin Login
- Admin email: admin@jscglobalsolutions.info
- Admin password: admin123
- Direct login without OTP verification
- Automatic redirect to admin dashboard

### 4. Database Updates
Created new schema with company-specific data:
- Business verticals table with 5 company categories
- Sample merchants for each vertical
- Pre-configured applications for each business type
- Proper relationships between all entities

## New Login Flow

### For Regular Users:
1. Navigate to /login
2. Enter email address
3. Receive OTP via email
4. Enter 6-digit OTP
5. Access user dashboard with business verticals

### For Admin Users:
1. Navigate to /login?admin=true or click "Switch to Admin Login"
2. Enter admin email: admin@jscglobalsolutions.info
3. Enter password: admin123
4. Access admin dashboard

## Business Vertical Navigation
Users can now browse:
1. **Dashboard** - Shows 5 company business verticals as buttons
2. **Select Vertical** - View merchants in that business category
3. **Select Merchant** - See applications specific to that merchant
4. **Launch Application** - Access email processing tools

## Sample Data Included
- 5 sample merchants (one per vertical)
- Pre-configured applications for each business type
- Realistic business names and contact information
- Proper categorization by business vertical

## Access Points
- **User Login**: http://localhost:4202/login
- **Admin Login**: http://localhost:4202/login?admin=true
- **Admin Dashboard**: http://localhost:4202/admin/dashboard (after admin login)

## Database Setup
Run the new schema file:
```bash
mysql -u JSCTuneer -p jsc_emailextractor < backend/db/company-schema.sql
```

This replaces the previous generic business categories with your company's specific verticals and creates a unified login experience for both admin and regular users.