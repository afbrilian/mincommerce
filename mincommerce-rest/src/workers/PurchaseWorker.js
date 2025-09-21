/**
 * PurchaseWorker
 * Processes purchase jobs from the queue
 * Handles the actual business logic for purchase processing
 */

const logger = require('../utils/logger')
const PurchaseService = require('../services/PurchaseService')
const CONSTANTS = require('../constants')

class PurchaseWorker {
  constructor() {
    this.purchaseService = new PurchaseService()
    this.isProcessing = false
  }

  /**
   * Process a purchase job
   * @param {Object} job - Bull job object
   * @returns {Promise<Object>} Processing result
   */
  async processPurchaseJob(job) {
    const { jobId, userId } = job.data

    logger.info(`Processing purchase job ${jobId} for user ${userId}`)

    try {
      // Update job status to processing
      await this.updateJobStatus(jobId, CONSTANTS.PURCHASE_JOB_STATUS.PROCESSING, {
        userId,
        startedAt: new Date().toISOString()
      })

      // Process the purchase using existing business logic
      const result = await this.purchaseService.attemptPurchase(userId)

      // Update job status to completed
      await this.updateJobStatus(jobId, CONSTANTS.PURCHASE_JOB_STATUS.COMPLETED, {
        userId,
        result,
        completedAt: new Date().toISOString()
      })

      logger.info(`Purchase job ${jobId} completed successfully for user ${userId}`)

      return {
        success: true,
        jobId,
        userId,
        result,
        processedAt: new Date().toISOString()
      }
    } catch (error) {
      logger.error(`Purchase job ${jobId} failed for user ${userId}:`, error)

      // Update job status to failed
      await this.updateJobStatus(jobId, CONSTANTS.PURCHASE_JOB_STATUS.FAILED, {
        userId,
        error: error.message,
        failedAt: new Date().toISOString()
      })

      // Re-throw error for Bull to handle retry logic
      throw error
    }
  }

  /**
   * Update job status in Redis
   * @param {string} jobId - Job ID
   * @param {string} status - Job status
   * @param {Object} data - Additional data
   */
  async updateJobStatus(jobId, status, data = {}) {
    try {
      const { getRedisClient } = require('../config/redis')
      const redis = getRedisClient()
      
      const jobKey = CONSTANTS.REDIS_KEYS.PURCHASE_JOB(jobId)
      const jobData = {
        jobId,
        status,
        timestamp: new Date().toISOString(),
        ...data
      }

      await redis.setEx(
        jobKey,
        CONSTANTS.CACHE_TTL.PURCHASE_JOB,
        JSON.stringify(jobData)
      )

      // Update user status if job data contains userId
      if (data.userId) {
        const statusKey = CONSTANTS.REDIS_KEYS.PURCHASE_STATUS(data.userId)
        const userStatus = {
          jobId,
          status,
          timestamp: new Date().toISOString(),
          ...data
        }

        await redis.setEx(
          statusKey,
          CONSTANTS.CACHE_TTL.PURCHASE_STATUS,
          JSON.stringify(userStatus)
        )
      }
    } catch (error) {
      logger.error('Failed to update job status:', error)
    }
  }

  /**
   * Start processing jobs from the centralized queue
   */
  async startProcessing() {
    try {
      logger.info('Starting purchase worker...')

      const { getQueueFactory } = require('../config/queue')
      const queueFactory = getQueueFactory()
      const queue = queueFactory.getDefaultProvider()

      // Process jobs with concurrency control
      queue.process(
        CONSTANTS.QUEUE.JOB_TYPES.PURCHASE_PROCESSING,
        CONSTANTS.QUEUE.CONCURRENCY.PURCHASE_WORKERS,
        async (job) => {
          return this.processPurchaseJob(job)
        }
      )

      this.isProcessing = true
      logger.info(`Purchase worker started with ${CONSTANTS.QUEUE.CONCURRENCY.PURCHASE_WORKERS} concurrent workers`)
    } catch (error) {
      logger.error('Failed to start purchase worker:', error)
      throw error
    }
  }

  /**
   * Stop processing jobs
   */
  async stopProcessing() {
    try {
      this.isProcessing = false
      logger.info('Purchase worker stopped')
    } catch (error) {
      logger.error('Error stopping purchase worker:', error)
    }
  }

  /**
   * Get worker health status
   * @returns {Object} Worker health information
   */
  getHealthStatus() {
    return {
      isProcessing: this.isProcessing,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  }
}

module.exports = PurchaseWorker
