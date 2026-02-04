const jwt = require('jsonwebtoken');

// Database service will be injected
let dbService = null;

class AuthService {
  constructor(databaseService = null) {
    this.jwtSecret = process.env.JWT_SECRET;
    this.allowedDomains = process.env.ALLOWED_DOMAINS 
      ? process.env.ALLOWED_DOMAINS.split(',').map(d => d.trim())
      : [];
    
    if (databaseService) {
      dbService = databaseService;
    }
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Invalid email format' };
    }

    if (this.allowedDomains.length > 0) {
      const domain = email.split('@')[1];
      if (!this.allowedDomains.includes(domain)) {
        return { 
          valid: false, 
          message: `Only emails from ${this.allowedDomains.join(', ')} are allowed` 
        };
      }
    }

    return { valid: true };
  }

  async generateToken(email, ipAddress = null, userAgent = null) {
    // Save login history to database if database service is available
    if (dbService) {
      try {
        await dbService.saveLoginHistory(email, ipAddress, userAgent);
      } catch (error) {
        console.error('Error saving login history:', error.message);
      }
    }
    
    return jwt.sign(
      { email, loginTime: Date.now() },
      this.jwtSecret,
      { expiresIn: '24h' }
    );
  }

  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return { valid: true, data: decoded };
    } catch (error) {
      return { valid: false, message: 'Invalid or expired token' };
    }
  }

  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

module.exports = new AuthService();
