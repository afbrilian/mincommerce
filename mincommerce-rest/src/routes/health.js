const express = require('express');
const { getDatabase } = require('../config/database');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid,
      memory: process.memoryUsage(),
      services: {},
    };

    // Check database connection
    try {
      const db = getDatabase();
      await db.raw('SELECT 1');
      health.services.database = 'healthy';
    } catch (error) {
      health.services.database = 'unhealthy';
      health.status = 'unhealthy';
    }

    // Check Redis connection
    try {
      const redis = getRedisClient();
      await redis.ping();
      health.services.redis = 'healthy';
    } catch (error) {
      health.services.redis = 'unhealthy';
      health.status = 'unhealthy';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Readiness probe
router.get('/ready', async (req, res) => {
  try {
    const db = getDatabase();
    const redis = getRedisClient();

    // Check if services are ready
    await Promise.all([db.raw('SELECT 1'), redis.ping()]);

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Liveness probe
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    pid: process.pid,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
