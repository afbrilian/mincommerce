const cluster = require('cluster');
const os = require('os');
require('dotenv').config();

if (cluster.isMaster) {
  // Fork workers
  const numCPUs = os.cpus().length;
  console.log(`Master ${process.pid} is running`);
  console.log(`Starting ${numCPUs} workers...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log('Starting a new worker');
    cluster.fork();
  });

  cluster.on('online', (worker) => {
    console.log(`Worker ${worker.process.pid} is online`);
  });

} else {
  // Worker processes
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

  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : "*",
      methods: ["GET", "POST"]
    }
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
      error: 'Too many requests from this IP, please try again later.'
    }
  });
  app.use('/api/', limiter);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    next();
  });

  // Routes
  app.use('/api/health', healthRoutes);
  app.use('/api/flash-sale', flashSaleRoutes);
  app.use('/api/purchase', purchaseRoutes);

  // WebSocket connection handling
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    socket.on('join-sale-room', (saleId) => {
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
        logger.info(`Worker ${process.pid} listening on port ${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV}`);
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info(`Worker ${process.pid} received SIGTERM`);
    server.close(() => {
      logger.info(`Worker ${process.pid} closed`);
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info(`Worker ${process.pid} received SIGINT`);
    server.close(() => {
      logger.info(`Worker ${process.pid} closed`);
      process.exit(0);
    });
  });

  startServer();
}
