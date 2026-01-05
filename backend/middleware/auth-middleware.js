const authService = require('../services/auth-service');

function authMiddleware(req, res, next) {
  const token = authService.extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No authentication token provided'
    });
  }

  const result = authService.verifyToken(token);

  if (!result.valid) {
    return res.status(401).json({
      success: false,
      message: result.message || 'Authentication failed'
    });
  }

  req.user = result.data;
  next();
}

module.exports = authMiddleware;
