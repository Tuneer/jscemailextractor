const express = require('express');
const router = express.Router();
const emailAutomationService = require('../services/email-automation-service');
const webScrapingService = require('../services/web-scraping-service');
const dbService = require('../services/db-service');
const authMiddleware = require('../middleware/auth-middleware');

// Start email automation
router.post('/automate-emails', authMiddleware, async (req, res) => {
  try {
    const { userId, merchantId } = req.body;

    if (!userId || !merchantId) {
      return res.status(400).json({ success: false, message: 'userId and merchantId are required' });
    }

    const result = await emailAutomationService.automateEmailProcessing(userId, merchantId);

    res.json({
      success: true,
      message: 'Email automation completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in email automation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to automate emails',
      error: error.message
    });
  }
});

// Get coupon families from an attachment
router.get('/attachments/:attachmentId/families', authMiddleware, async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const db = await dbService.getConnection();

    const [attachments] = await db.query(
      `SELECT * FROM email_attachments WHERE id = ?`,
      [attachmentId]
    );

    if (!attachments || attachments.length === 0) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    const attachment = attachments[0];
    const excelData = attachment.excel_data ? JSON.parse(attachment.excel_data) : null;

    if (!excelData) {
      return res.status(400).json({ success: false, message: 'No Excel data found in attachment' });
    }

    const families = await emailAutomationService.identifyCouponFamilies(excelData);

    res.json({
      success: true,
      data: families
    });
  } catch (error) {
    console.error('Error getting families:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract families',
      error: error.message
    });
  }
});

// Save coupon families and items
router.post('/coupon-families/save', authMiddleware, async (req, res) => {
  try {
    const { attachmentId, families, items } = req.body;
    const db = await dbService.getConnection();

    const savedFamilies = [];

    // Insert families
    for (const family of families) {
      const [result] = await db.query(
        `INSERT INTO coupon_families 
         (attachment_id, family_name, family_code, brand, category, subcategory, pack_size, unit, base_price, discount_percent, valid_from, valid_until, additional_info) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          attachmentId,
          family.family_name,
          family.family_code || null,
          family.brand || null,
          family.category || null,
          family.subcategory || null,
          family.pack_size || null,
          family.unit || null,
          family.base_price || null,
          family.discount_percent || null,
          family.valid_from || null,
          family.valid_until || null,
          JSON.stringify(family.additional_info || {})
        ]
      );

      savedFamilies.push({ id: result.insertId, ...family });
    }

    // Insert items
    const savedItems = [];
    for (const item of items) {
      const family = savedFamilies.find(f => f.family_name === item.family_name);
      if (!family) continue;

      const [result] = await db.query(
        `INSERT INTO coupon_items 
         (family_id, item_name, item_code, sku, description, quantity, price, mrp, discount_amount, final_price, barcode, hsn_code, gst_percent) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          family.id,
          item.item_name || item.name,
          item.item_code || null,
          item.sku || null,
          item.description || null,
          item.quantity || null,
          item.price || null,
          item.mrp || null,
          item.discount_amount || null,
          item.final_price || null,
          item.barcode || null,
          item.hsn_code || null,
          item.gst_percent || null
        ]
      );

      savedItems.push({ id: result.insertId, ...item });
    }

    res.json({
      success: true,
      message: 'Coupon families and items saved successfully',
      data: {
        families: savedFamilies,
        items: savedItems
      }
    });
  } catch (error) {
    console.error('Error saving coupon families:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save coupon families',
      error: error.message
    });
  }
});

// Start scraping job for a coupon family
router.post('/scraping/start/:familyId', authMiddleware, async (req, res) => {
  try {
    const { familyId } = req.params;
    
    const result = await webScrapingService.executeScrapingJob(familyId);

    res.json({
      success: true,
      message: 'Scraping job started successfully',
      data: result
    });
  } catch (error) {
    console.error('Error starting scraping job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start scraping job',
      error: error.message
    });
  }
});

// Get scraping job status
router.get('/scraping/status/:jobId', authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;
    const db = await dbService.getConnection();

    const [jobs] = await db.query(
      `SELECT * FROM scraping_jobs WHERE id = ?`,
      [jobId]
    );

    if (!jobs || jobs.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    res.json({
      success: true,
      data: jobs[0]
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get job status',
      error: error.message
    });
  }
});

// Compare prices for a coupon item
router.post('/price-compare/:itemId/merchant/:merchantId', authMiddleware, async (req, res) => {
  try {
    const { itemId, merchantId } = req.params;
    
    const result = await webScrapingService.comparePrices(itemId, merchantId);

    res.json({
      success: true,
      message: 'Price comparison completed',
      data: result
    });
  } catch (error) {
    console.error('Error comparing prices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare prices',
      error: error.message
    });
  }
});

// Generate sales analytics
router.post('/analytics/generate/:merchantId/family/:familyId', authMiddleware, async (req, res) => {
  try {
    const { merchantId, familyId } = req.params;
    const { daysBack } = req.body;
    
    const result = await webScrapingService.generateSalesAnalytics(merchantId, familyId, daysBack || 30);

    res.json({
      success: true,
      message: 'Sales analytics generated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error generating analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics',
      error: error.message
    });
  }
});

// Get scraped products for a coupon item
router.get('/coupon-items/:itemId/products', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.params;
    const db = await dbService.getConnection();

    const [products] = await db.query(
      `SELECT * FROM scraped_products WHERE coupon_item_id = ? ORDER BY scraped_at DESC`,
      [itemId]
    );

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get products',
      error: error.message
    });
  }
});

// Get price comparisons
router.get('/price-comparisons/item/:itemId/merchant/:merchantId', authMiddleware, async (req, res) => {
  try {
    const { itemId, merchantId } = req.params;
    const db = await dbService.getConnection();

    const [comparisons] = await db.query(
      `SELECT * FROM price_comparison 
       WHERE coupon_item_id = ? AND merchant_id = ? 
       ORDER BY compared_at DESC`,
      [itemId, merchantId]
    );

    res.json({
      success: true,
      data: comparisons
    });
  } catch (error) {
    console.error('Error getting comparisons:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get comparisons',
      error: error.message
    });
  }
});

// Get sales analytics summary
router.get('/analytics/:merchantId/family/:familyId', authMiddleware, async (req, res) => {
  try {
    const { merchantId, familyId } = req.params;
    const db = await dbService.getConnection();

    const [summaries] = await db.query(
      `SELECT * FROM sales_analytics_summary 
       WHERE merchant_id = ? AND coupon_family_id = ? 
       ORDER BY generated_at DESC`,
      [merchantId, familyId]
    );

    res.json({
      success: true,
      data: summaries
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: error.message
    });
  }
});

module.exports = router;
