const express = require('express');
const { getQueueFactory, getJob, getJobStatus, getQueueStats } = require('../config/queue');
const logger = require('../utils/logger');

const router = express.Router();

// Get queue statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    res.status(500).json({
      error: 'Failed to get queue statistics',
    });
  }
});

// Get job by ID
router.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({
        error: 'Job ID is required',
      });
    }

    const job = await getJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    logger.error(`Failed to get job ${req.params.jobId}:`, error);
    res.status(500).json({
      error: 'Failed to get job details',
    });
  }
});

// Get job status
router.get('/job/:jobId/status', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({
        error: 'Job ID is required',
      });
    }

    const status = await getJobStatus(jobId);
    
    res.json({
      success: true,
      data: {
        jobId,
        status,
      },
    });
  } catch (error) {
    logger.error(`Failed to get job status ${req.params.jobId}:`, error);
    res.status(500).json({
      error: 'Failed to get job status',
    });
  }
});

// Get available queue providers
router.get('/providers', async (req, res) => {
  try {
    const factory = getQueueFactory();
    const providers = factory.getAvailableProviders();
    
    res.json({
      success: true,
      data: {
        available: providers,
        default: process.env.QUEUE_PROVIDER || 'bull',
      },
    });
  } catch (error) {
    logger.error('Failed to get queue providers:', error);
    res.status(500).json({
      error: 'Failed to get queue providers',
    });
  }
});

// Health check for queue system
router.get('/health', async (req, res) => {
  try {
    const factory = getQueueFactory();
    const stats = await getQueueStats();
    
    const health = {
      status: 'healthy',
      providers: factory.getAvailableProviders(),
      stats: stats,
      timestamp: new Date().toISOString(),
    };

    res.json(health);
  } catch (error) {
    logger.error('Queue health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
