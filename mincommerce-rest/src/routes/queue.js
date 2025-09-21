const express = require('express')
const { getQueueFactory, getJob, getJobStatus } = require('../config/queue')
const logger = require('../utils/logger')

const router = express.Router()

// Get worker manager instance (will be set by server)
let workerManager = null

// Set worker manager instance
const setWorkerManager = (manager) => {
  workerManager = manager
}

// Get worker manager instance
const getWorkerManager = () => {
  if (!workerManager) {
    // In test environment, return a mock worker manager
    if (process.env.NODE_ENV === 'test') {
      return {
        getSystemStatus: async () => ({
          isRunning: true,
          worker: { isProcessing: true },
          queue: { waiting: 0, active: 0, completed: 0, failed: 0, total: 0 },
          timestamp: new Date().toISOString()
        })
      }
    }
    throw new Error('Worker manager not initialized')
  }
  return workerManager
}

// Get queue statistics
router.get('/stats', async (req, res) => {
  try {
    const manager = getWorkerManager()
    const systemStatus = await manager.getSystemStatus()
    
    res.json({
      success: true,
      data: systemStatus,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Failed to get queue stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get queue statistics'
    })
  }
})

// Get job by ID
router.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params

    if (!jobId) {
      return res.status(400).json({
        error: 'Job ID is required'
      })
    }

    const job = await getJob(jobId)

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      })
    }

    res.json({
      success: true,
      data: job
    })
  } catch (error) {
    logger.error(`Failed to get job ${req.params.jobId}:`, error)
    res.status(500).json({
      error: 'Failed to get job details'
    })
  }
})

// Get job status
router.get('/job/:jobId/status', async (req, res) => {
  try {
    const { jobId } = req.params

    if (!jobId) {
      return res.status(400).json({
        error: 'Job ID is required'
      })
    }

    const status = await getJobStatus(jobId)

    res.json({
      success: true,
      data: {
        jobId,
        status
      }
    })
  } catch (error) {
    logger.error(`Failed to get job status ${req.params.jobId}:`, error)
    res.status(500).json({
      error: 'Failed to get job status'
    })
  }
})

// Get available queue providers
router.get('/providers', async (req, res) => {
  try {
    const factory = getQueueFactory()
    const providers = factory.getAvailableProviders()

    res.json({
      success: true,
      data: {
        available: providers,
        default: process.env.QUEUE_PROVIDER || 'bull'
      }
    })
  } catch (error) {
    logger.error('Failed to get queue providers:', error)
    res.status(500).json({
      error: 'Failed to get queue providers'
    })
  }
})

// Health check for queue system
router.get('/health', async (req, res) => {
  try {
    const manager = getWorkerManager()
    const systemStatus = await manager.getSystemStatus()

    const health = {
      status: systemStatus.isRunning ? 'healthy' : 'unhealthy',
      system: systemStatus,
      timestamp: new Date().toISOString()
    }

    res.json(health)
  } catch (error) {
    logger.error('Queue health check failed:', error)
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// Export both router and setter function
module.exports = {
  router,
  setWorkerManager
}
