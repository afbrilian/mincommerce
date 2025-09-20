require('dotenv').config();

// Cloud-native single process server
// Let container orchestration (AWS ECS, Kubernetes) handle scaling
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

const logger = require('./utils/logger');
const { connectDatabase } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeQueue } = require('./config/queue');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Import routes
const flashSaleRoutes = require('./routes/flashSale');
const purchaseRoutes = require('./routes/purchase');
const healthRoutes = require('./routes/health');
const queueRoutes = require('./routes/queue');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/flash-sale', flashSaleRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/queue', queueRoutes);

// WebSocket connection handling
io.on('connection', socket => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-sale-room', saleId => {
    socket.join(`sale-${saleId}`);
    logger.info(`Client ${socket.id} joined sale room: sale-${saleId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Initialize services
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected successfully');

    // Initialize queue
    await initializeQueue();
    logger.info('Queue initialized successfully');

    // Start server
    server.listen(PORT, () => {
      logger.info(`Server ${process.pid} listening on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info('Cloud-native single process - scaling handled by container orchestration');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info(`Server ${process.pid} received SIGTERM`);
  server.close(() => {
    logger.info(`Server ${process.pid} closed gracefully`);
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info(`Server ${process.pid} received SIGINT`);
  server.close(() => {
    logger.info(`Server ${process.pid} closed gracefully`);
    process.exit(0);
  });
});

startServer();
