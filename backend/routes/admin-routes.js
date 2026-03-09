const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dbService = require('../services/db-service');
const multer = require('multer');
const xlsx = require('xlsx');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'admin-secret-key';

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const adminUser = await dbService.getAdminUserByUsername(decoded.username);
    
    if (!adminUser) {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }

    req.adminUser = adminUser;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const adminUser = await dbService.getAdminUserByUsername(username);
    if (!adminUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, adminUser.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await dbService.updateAdminLastLogin(adminUser.id);

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: adminUser.id, 
        username: adminUser.username, 
        role: adminUser.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        fullName: adminUser.full_name,
        role: adminUser.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

// Get all business verticals
router.get('/business-verticals', authenticateAdmin, async (req, res) => {
  try {
    const verticals = await dbService.getAllBusinessVerticals();
    res.json({
      success: true,
      data: verticals
    });
  } catch (error) {
    console.error('Error fetching business verticals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch business verticals'
    });
  }
});

// Create business vertical
router.post('/business-verticals', authenticateAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Business vertical name is required'
      });
    }

    const id = await dbService.createBusinessVertical(name, description);
    res.status(201).json({
      success: true,
      message: 'Business vertical created successfully',
      id: id
    });
  } catch (error) {
    console.error('Error creating business vertical:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create business vertical'
    });
  }
});

// Update business vertical
router.put('/business-verticals/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Business vertical name is required'
      });
    }

    const success = await dbService.updateBusinessVertical(id, name, description, is_active);
    
    if (success) {
      res.json({
        success: true,
        message: 'Business vertical updated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Business vertical not found'
      });
    }
  } catch (error) {
    console.error('Error updating business vertical:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update business vertical'
    });
  }
});

// Delete business vertical
router.delete('/business-verticals/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await dbService.deleteBusinessVertical(id);
    
    if (success) {
      res.json({
        success: true,
        message: 'Business vertical deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Business vertical not found'
      });
    }
  } catch (error) {
    console.error('Error deleting business vertical:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete business vertical'
    });
  }
});

// Get all merchants
router.get('/merchants', authenticateAdmin, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const merchants = await dbService.getAllMerchants(parseInt(limit), parseInt(offset));
    res.json({
      success: true,
      data: merchants
    });
  } catch (error) {
    console.error('Error fetching merchants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch merchants'
    });
  }
});

// Create merchant
router.post('/merchants', authenticateAdmin, async (req, res) => {
  try {
    const merchantData = req.body;
    
    if (!merchantData.business_name) {
      return res.status(400).json({
        success: false,
        message: 'Business name is required'
      });
    }

    const id = await dbService.createMerchant(merchantData);
    res.status(201).json({
      success: true,
      message: 'Merchant created successfully',
      id: id
    });
  } catch (error) {
    console.error('Error creating merchant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create merchant'
    });
  }
});

// Update merchant
router.put('/merchants/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const merchantData = req.body;

    const success = await dbService.updateMerchant(id, merchantData);
    
    if (success) {
      res.json({
        success: true,
        message: 'Merchant updated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }
  } catch (error) {
    console.error('Error updating merchant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update merchant'
    });
  }
});

// Delete merchant
router.delete('/merchants/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await dbService.deleteMerchant(id);
    
    if (success) {
      res.json({
        success: true,
        message: 'Merchant deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }
  } catch (error) {
    console.error('Error deleting merchant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete merchant'
    });
  }
});

// Bulk upload merchants from Excel/CSV
router.post('/merchants/bulk-upload', authenticateAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Parse Excel/CSV file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data found in the uploaded file'
      });
    }

    // Map Excel columns to database fields
    const merchants = data.map(row => {
      // Handle dynamic columns - any column not in standard fields goes to additional_data
      const standardFields = [
        'business_name', 'business_vertical_id', 'contact_person', 'email', 'phone',
        'address', 'city', 'state', 'country', 'postal_code', 'website', 'business_type',
        'annual_revenue', 'employee_count', 'established_year', 'tax_id'
      ];
      
      const merchantData = {};
      const additionalData = {};
      
      Object.keys(row).forEach(key => {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
        const value = row[key];
        
        if (standardFields.includes(normalizedKey)) {
          merchantData[normalizedKey] = value;
        } else {
          additionalData[key] = value;
        }
      });
      
      merchantData.additional_data = Object.keys(additionalData).length > 0 ? additionalData : null;
      
      return merchantData;
    });

    // Bulk insert merchants
    const results = await dbService.bulkCreateMerchants(merchants);
    
    res.json({
      success: true,
      message: `${results.length} merchants uploaded successfully`,
      count: results.length
    });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process file upload'
    });
  }
});

// Get sample Excel template
router.get('/merchants/sample-template', authenticateAdmin, (req, res) => {
  try {
    // Create sample data
    const sampleData = [
      {
        'Business Name': 'Sample Retail Store',
        'Business Vertical ID': 1,
        'Contact Person': 'John Doe',
        'Email': 'john@samplestore.com',
        'Phone': '+1234567890',
        'Address': '123 Main Street',
        'City': 'New York',
        'State': 'NY',
        'Country': 'USA',
        'Postal Code': '10001',
        'Website': 'www.samplestore.com',
        'Business Type': 'retail',
        'Annual Revenue': 500000,
        'Employee Count': 15,
        'Established Year': 2020,
        'Tax ID': 'TAX123456',
        'Custom Field 1': 'Additional info',
        'Custom Field 2': 'More data'
      }
    ];

    // Create workbook
    const ws = xlsx.utils.json_to_sheet(sampleData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Merchants');

    // Generate buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="merchant-template.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template'
    });
  }
});

module.exports = router;