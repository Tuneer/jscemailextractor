const jwt = require('jsonwebtoken');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.allowedDomains = process.env.ALLOWED_DOMAINS 
      ? process.env.ALLOWED_DOMAINS.split(',').map(d => d.trim())
      : [];
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

  generateToken(email) {
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
