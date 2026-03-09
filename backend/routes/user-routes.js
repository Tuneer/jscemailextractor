const express = require('express');
const dbService = require('../services/db-service');

const router = express.Router();

// User authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    // For now, we'll just verify the token exists
    // In production, you'd verify the JWT token
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// Get all business verticals
router.get('/business-verticals', authenticateUser, async (req, res) => {
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

// Get merchants by business vertical
router.get('/merchants/vertical/:verticalId', authenticateUser, async (req, res) => {
  try {
    const { verticalId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    const merchants = await dbService.getMerchantsByVertical(
      parseInt(verticalId), 
      parseInt(limit), 
      parseInt(offset)
    );
    
    res.json({
      success: true,
      data: merchants
    });
  } catch (error) {
    console.error('Error fetching merchants by vertical:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch merchants'
    });
  }
});

// Get merchant details
router.get('/merchants/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    // This would need to be implemented in db-service
    // For now, returning a placeholder
    res.json({
      success: true,
      data: {
        id: parseInt(id),
        business_name: 'Sample Merchant',
        business_vertical_id: 1,
        contact_person: 'John Doe',
        email: 'john@sample.com'
      }
    });
  } catch (error) {
    console.error('Error fetching merchant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch merchant'
    });
  }
});

// Get applications for a specific merchant
router.get('/merchants/:merchantId/applications', authenticateUser, async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    const applications = await dbService.getMerchantApplications(parseInt(merchantId));
    
    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('Error fetching merchant applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch merchant applications'
    });
  }
});

module.exports = router;