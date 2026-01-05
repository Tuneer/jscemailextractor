const express = require('express');
const router = express.Router();
const gmailService = require('../services/gmail-imap');
const authMiddleware = require('../middleware/auth-middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Search emails
router.post('/emails', async (req, res) => {
  try {
    const { query, senderEmail, maxResults } = req.body;

    const options = {
      query: query || 'has:attachment',
      senderEmail: senderEmail || '',
      maxResults: maxResults || 50
    };

    const emails = await gmailService.searchEmails(options);

    res.json({
      success: true,
      emails: emails,
      count: emails.length
    });
  } catch (error) {
    console.error('Error searching emails:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search emails',
      error: error.message
    });
  }
});

// Process selected emails
router.post('/process', async (req, res) => {
  try {
    const { emailIds, senderEmail } = req.body;

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Email IDs are required'
      });
    }

    const result = await gmailService.processEmails(emailIds, { senderEmail });

    res.json(result);
  } catch (error) {
    console.error('Error processing emails:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process emails',
      error: error.message
    });
  }
});

// Test IMAP connection
router.get('/test-connection', async (req, res) => {
  try {
    await gmailService.connect();
    res.json({
      success: true,
      message: 'Gmail IMAP connection successful'
    });
  } catch (error) {
    console.error('Connection test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Gmail IMAP connection failed',
      error: error.message
    });
  }
});

module.exports = router;
