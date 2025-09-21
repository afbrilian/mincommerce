/**
 * Express Server Setup
 * Main server file for the MinCommerce REST API
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Import routes
const healthRoutes = require('./routes/health');
const flashSaleRoutes = require('./routes/flashSale');
const purchaseRoutes = require('./routes/purchase');
const queueRoutes = require('./routes/queue');

// Import configuration
const logger = require('./utils/logger');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeQueue } = require('./config/queue');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Health check route (no auth required)
app.use('/health', healthRoutes);

// API routes
app.use('/admin', require('./routes/admin'));
app.use('/flash-sale', flashSaleRoutes);
app.use('/purchase', purchaseRoutes);
app.use('/queue', queueRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async signal => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Close database connection
    const { closeDatabase } = require('./config/database');
    await closeDatabase();

    // Close Redis connection
    const { closeRedis } = require('./config/redis');
    await closeRedis();

    // Close queue connections
    const { closeQueue } = require('./config/queue');
    await closeQueue();

    logger.info('All connections closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const startServer = async () => {
    try {
      // Connect to services
      await connectDatabase();
      await connectRedis();
      await initializeQueue();

      app.listen(PORT, () => {
        logger.info(`Server ${process.pid} listening on port ${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info('Cloud-native single process - scaling handled by container orchestration');
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  };

  startServer();
}

module.exports = app;
