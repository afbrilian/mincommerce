const express = require('express')
const PurchaseService = require('../services/PurchaseService')
const PurchaseQueueService = require('../services/PurchaseQueueService')
const AuthService = require('../services/AuthService')
const logger = require('../utils/logger')
const CONSTANTS = require('../constants')

const router = express.Router()

// Lazy initialization to avoid Redis connection issues during tests
let purchaseService = null
let purchaseQueueService = null
const authService = new AuthService()

const getPurchaseService = () => {
  if (!purchaseService) {
    purchaseService = new PurchaseService()
  }
  return purchaseService
}

const getPurchaseQueueService = () => {
  if (!purchaseQueueService) {
    purchaseQueueService = new PurchaseQueueService()
  }
  return purchaseQueueService
}

/**
 * POST /purchase
 * Queue a purchase request for processing
 */
router.post('/', authService.authenticateMiddleware.bind(authService), async (req, res) => {
  try {
    const { userId } = req.user

    logger.info(`POST /purchase`, {
      ip: req.ip,
      userId
    })

    // Queue the purchase request
    const result = await getPurchaseQueueService().queuePurchase(userId)

    logger.info(`Purchase queued successfully`, {
      ip: req.ip,
      userId,
      jobId: result.jobId
    })

    // Return 202 Accepted for queued request
    res.status(202).json({
      success: true,
      message: result.message,
      data: {
        jobId: result.jobId,
        status: result.status,
        estimatedWaitTime: result.estimatedWaitTime
      }
    })
  } catch (error) {
    logger.error('Failed to queue purchase:', error)

    if (error.message === 'User already has a pending purchase request') {
      return res.status(409).json({
        success: false,
        error: error.message
      })
    }

    res.status(500).json({
      success: false,
      error: 'Failed to queue purchase request'
    })
  }
})

/**
 * GET /purchase/status
 * Check user's purchase status (both queue and completed purchases)
 */
router.get('/status', authService.authenticateMiddleware.bind(authService), async (req, res) => {
  try {
    const { userId } = req.user

    logger.info(`GET /purchase/status`, {
      ip: req.ip,
      userId
    })

    // Check for queued purchase first
    const queueStatus = await getPurchaseQueueService().getUserPurchaseStatus(userId)
    
    if (queueStatus) {
      // User has a queued or processing purchase
      return res.status(200).json({
        success: true,
        data: {
          status: queueStatus.status,
          jobId: queueStatus.jobId,
          timestamp: queueStatus.timestamp,
          message: queueStatus.message || 'Purchase request is being processed'
        }
      })
    }

    // Check for completed purchase
    const result = await getPurchaseService().checkPurchaseStatus(userId)

    res.status(200).json({
      success: true,
      data: result.data
    })
  } catch (error) {
    logger.error('Failed to check purchase status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to check purchase status'
    })
  }
})

/**
 * GET /purchase/job/:jobId
 * Check purchase job status by job ID
 */
router.get('/job/:jobId', authService.authenticateMiddleware.bind(authService), async (req, res) => {
  try {
    const { jobId } = req.params
    const { userId } = req.user

    logger.info(`GET /purchase/job/${jobId}`, {
      ip: req.ip,
      userId,
      jobId
    })

    // Get job status
    const jobStatus = await getPurchaseQueueService().getJobStatus(jobId)
    
    if (!jobStatus) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      })
    }

    res.status(200).json({
      success: true,
      data: jobStatus
    })
  } catch (error) {
    logger.error('Failed to get job status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get job status'
    })
  }
})

/**
 * GET /purchase/user/:userId
 * Get user's orders (admin endpoint)
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    if (!CONSTANTS.UUID_REGEX.test(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      })
    }

    const result = await getPurchaseService().getUserOrders(userId)
    res.json(result)
  } catch (error) {
    logger.error('Failed to get user orders:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get user orders'
    })
  }
})

module.exports = router