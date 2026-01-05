const express = require('express');
const router = express.Router();
const emailService = require('../services/email-service');
const authService = require('../services/auth-service');

// Request OTP for login
router.post('/request-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email
    const validation = authService.validateEmail(email);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    // Send OTP
    const result = await emailService.sendOTP(email);
    
    res.json({
      success: true,
      message: 'OTP sent to your email. Please check your inbox.'
    });
  } catch (error) {
    console.error('Error requesting OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
});

// Verify OTP and login
router.post('/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Verify OTP
    const result = emailService.verifyOTP(email, otp);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Generate JWT token
    const token = authService.generateToken(email);

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: { email }
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP. Please try again.'
    });
  }
});

// Validate current token
router.get('/validate', (req, res) => {
  const token = authService.extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  const result = authService.verifyToken(token);

  if (!result.valid) {
    return res.status(401).json({
      success: false,
      message: result.message
    });
  }

  res.json({
    success: true,
    user: { email: result.data.email }
  });
});

module.exports = router;
