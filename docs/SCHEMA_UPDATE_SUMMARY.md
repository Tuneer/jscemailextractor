# Updated Database Schema Summary

## Single Schema File
The database schema has been consolidated into one file: `backend/db/schema.sql`

## Company Business Verticals
5 specific business categories for your company:
1. **Salon** - Hair salons, beauty parlors, personal care services
2. **Restaurant** - Dining establishments, cafes, food service businesses
3. **Grocery** - Food retail stores, supermarkets, grocery shops
4. **Liquor** - Alcohol retail stores, bars, liquor distribution
5. **Boutique** - Fashion retail stores, clothing boutiques, specialty shops

## Key Features
- Comprehensive table structure with proper relationships
- Indexes for optimal performance
- Sample data for all business verticals
- Pre-configured admin user (admin@jscglobalsolutions.info / admin123)
- Sample merchants and applications for each vertical
- Database views for business reporting
- Stored procedures for maintenance

## Ready for Merchant Excel Upload
- `merchants` table includes `additional_data` JSON field for dynamic Excel columns
- Bulk upload functionality handles extra columns automatically
- Proper foreign key relationships to business verticals
- All necessary indexes for efficient querying

## Database Views Included
1. `merchant_business_view` - Complete merchant business overview
2. `merchant_applications_view` - Active applications per merchant

## How to Use
1. Run the single schema file to set up the complete database
2. Use the existing admin interface to upload your merchant Excel file
3. System will automatically map standard columns and store extras in JSON
4. Merchants will be categorized under appropriate business verticals

The schema is now ready for your merchant data upload with all company-specific business categories properly configured.