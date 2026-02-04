require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const authRoutes = require('./routes/auth-routes');
const gmailRoutes = require('./routes/gmail-routes');
const dataRoutes = require('./routes/data-routes');
const emailService = require('./services/email-service');
const dbService = require('./services/db-service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from Angular build (for production)
const frontendPath = path.join(__dirname, '../frontend/dist/frontend/browser');
app.use(express.static(frontendPath));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Email Extractor API'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/data', dataRoutes);

// Serve Angular app for all non-API routes (SPA support)
app.get('*', (req, res) => {
  // Only serve index.html for non-API routes
  if (!req.url.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.status(404).json({
      success: false,
      message: 'API endpoint not found'
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize database service
(async () => {
  try {
    await dbService.initialize();
    console.log('Database service initialized successfully');
    
    // Initialize auth service with database service
    const authService = require('./services/auth-service');
    authService.constructor(dbService);
  } catch (error) {
    console.warn('Warning: Failed to initialize database service:', error.message);
    console.warn('Application will continue running without database functionality');
  }
})();

// Start OTP cleanup task
emailService.startCleanupTask();

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          EMAIL EXTRACTOR API SERVER                        ║
║          JSC Global Solutions PVT. LTD.                    ║
║                                                            ║
║  Server running on: http://localhost:${PORT}                  ║
║  Environment: ${process.env.NODE_ENV || 'development'}                             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
