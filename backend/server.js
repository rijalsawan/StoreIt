const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const subscriptionRoutes = require('./routes/subscriptions');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy setting (required for rate limiting and getting real IPs)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Increase timeout for large file uploads
app.use((req, res, next) => {
  // Set timeout to 30 minutes for file uploads
  if (req.path.includes('/files/upload')) {
    req.setTimeout(30 * 60 * 1000); // 30 minutes
    res.setTimeout(30 * 60 * 1000); // 30 minutes
  }
  next();
});

// CORS configuration to support multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  process.env.CLIENT_URL || 'http://localhost:3000',
  process.env.FRONTEND_URL || 'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting - more lenient for file uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Allow fewer uploads but more data
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many upload requests, please try again later.'
  }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests to static files
  skip: (req, res) => res.statusCode < 400,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

// Apply different rate limits
app.use('/api/files/upload', uploadLimiter);
app.use(generalLimiter);

// Body parsing middleware
// Special handling for Stripe webhooks - they need raw body
app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));

// Skip JSON/URL parsing for file uploads (multer handles the body)
app.use('/api/files/upload', (req, res, next) => {
  // Skip body parsing for file uploads - multer will handle it
  next();
});

// For other routes, use standard body parsing with increased limits
app.use(express.json({ limit: '50mb' })); // Increased for large requests
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ 
      error: 'File too large', 
      message: 'The uploaded file exceeds the maximum allowed size.' 
    });
  }
  
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://0.0.0.0:${PORT}/api/health`);
  console.log(`📡 Server listening on all interfaces (0.0.0.0:${PORT})`);
  
  // Log file upload configuration
  const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 1073741824;
  const maxFileSizeMB = Math.round(maxFileSize / 1024 / 1024);
  console.log(`📁 File upload config:`);
  console.log(`   MAX_FILE_SIZE: ${process.env.MAX_FILE_SIZE || 'not set (using default)'}`);
  console.log(`   File size limit: ${maxFileSizeMB}MB (${maxFileSize} bytes)`);
  console.log(`   Storage provider: ${process.env.STORAGE_PROVIDER || 'not set'}`);
  console.log(`   Railway environment: ${process.env.RAILWAY_ENVIRONMENT || 'not detected'}`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`🛑 ${signal} received, shutting down gracefully...`);
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds if graceful shutdown takes too long
  setTimeout(() => {
    console.error('⚠️ Forced shutdown after 10 seconds timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});
