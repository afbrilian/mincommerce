/**
 * PurchaseQueueService
 * Handles queuing and status tracking for purchase requests
 * Provides immediate response while processing asynchronously
 */

const { v4: uuidv4 } = require('uuid')
const logger = require('../utils/logger')
const { getRedisClient } = require('../config/redis')
const { getQueueFactory } = require('../config/queue')
const CONSTANTS = require('../constants')

class PurchaseQueueService {
  constructor() {
    this.redis = null
    this.queueFactory = null
    this.queue = null
  }

  getRedis() {
    if (!this.redis) {
      this.redis = getRedisClient()
    }
    return this.redis
  }

  getQueue() {
    if (!this.queue) {
      this.queueFactory = getQueueFactory()
      this.queue = this.queueFactory.getDefaultProvider()
    }
    return this.queue
  }

  /**
   * Queue a purchase request
   * @param {string} userId - User ID
   * @param {string} saleId - Flash sale ID (optional)
   * @returns {Promise<Object>} Job information with status
   */
  async queuePurchase(userId, saleId = null) {
    try {
      // Check if user already has a pending purchase
      const existingJob = await this.getUserPurchaseStatus(userId)
      if (existingJob && existingJob.status === CONSTANTS.PURCHASE_JOB_STATUS.QUEUED) {
        throw new Error('User already has a pending purchase request')
      }

      // Generate unique job ID
      const jobId = uuidv4()

      // Create job data
      const jobData = {
        jobId,
        userId,
        saleId,
        timestamp: new Date().toISOString()
      }

      // Add job to queue with high priority for flash sales
      await this.getQueue().addJob(CONSTANTS.QUEUE.JOB_TYPES.PURCHASE_PROCESSING, jobData, {
        priority: CONSTANTS.QUEUE.JOB_OPTIONS.PRIORITY_HIGH,
        jobId: jobId,
        delay: 0
      })

      // Store initial job status in Redis
      await this.updateJobStatus(jobId, CONSTANTS.PURCHASE_JOB_STATUS.QUEUED, {
        message: 'Purchase request queued successfully',
        estimatedWaitTime: await this.getEstimatedWaitTime()
      })

      // Store user purchase status
      await this.setUserPurchaseStatus(userId, {
        jobId,
        status: CONSTANTS.PURCHASE_JOB_STATUS.QUEUED,
        timestamp: new Date().toISOString()
      })

      logger.info(`Purchase queued for user ${userId}, job ID: ${jobId}`)

      return {
        success: true,
        jobId,
        status: CONSTANTS.PURCHASE_JOB_STATUS.QUEUED,
        message: CONSTANTS.SUCCESS_MESSAGES.PURCHASE_QUEUED,
        estimatedWaitTime: await this.getEstimatedWaitTime()
      }
    } catch (error) {
      logger.error('Failed to queue purchase:', error)
      throw error
    }
  }

  /**
   * Get purchase status for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Purchase status
   */
  async getUserPurchaseStatus(userId) {
    try {
      const statusKey = CONSTANTS.REDIS_KEYS.PURCHASE_STATUS(userId)
      const status = await this.getRedis().get(statusKey)
      return status ? JSON.parse(status) : null
    } catch (error) {
      logger.error('Failed to get user purchase status:', error)
      return null
    }
  }

  /**
   * Get job status by job ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job status
   */
  async getJobStatus(jobId) {
    try {
      const jobKey = CONSTANTS.REDIS_KEYS.PURCHASE_JOB(jobId)
      const status = await this.getRedis().get(jobKey)
      return status ? JSON.parse(status) : null
    } catch (error) {
      logger.error('Failed to get job status:', error)
      return null
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
      const jobKey = CONSTANTS.REDIS_KEYS.PURCHASE_JOB(jobId)
      const jobData = {
        jobId,
        status,
        timestamp: new Date().toISOString(),
        ...data
      }

      await this.getRedis().setEx(jobKey, CONSTANTS.CACHE_TTL.PURCHASE_JOB, JSON.stringify(jobData))

      // Update user status if job data contains userId
      if (data.userId) {
        await this.setUserPurchaseStatus(data.userId, {
          jobId,
          status,
          timestamp: new Date().toISOString(),
          ...data
        })
      }
    } catch (error) {
      logger.error('Failed to update job status:', error)
    }
  }

  /**
   * Set user purchase status in Redis
   * @param {string} userId - User ID
   * @param {Object} status - Status data
   */
  async setUserPurchaseStatus(userId, status) {
    try {
      const statusKey = CONSTANTS.REDIS_KEYS.PURCHASE_STATUS(userId)
      await this.getRedis().setEx(
        statusKey,
        CONSTANTS.CACHE_TTL.PURCHASE_STATUS,
        JSON.stringify(status)
      )
    } catch (error) {
      logger.error('Failed to set user purchase status:', error)
    }
  }

  /**
   * Get estimated wait time for queue
   * @returns {Promise<number>} Estimated wait time in seconds
   */
  async getEstimatedWaitTime() {
    try {
      const stats = await this.getQueue().getStats()
      const totalJobs = (stats.waiting || 0) + (stats.active || 0)

      // Estimate 2 seconds per job (conservative estimate)
      return Math.max(0, totalJobs * 2)
    } catch (error) {
      logger.error('Failed to get estimated wait time:', error)
      return 0
    }
  }

  /**
   * Get queue statistics
   * @returns {Promise<Object>} Queue statistics
   */
  async getQueueStats() {
    try {
      return await this.getQueue().getStats()
    } catch (error) {
      logger.error('Failed to get queue stats:', error)
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        total: 0
      }
    }
  }

  /**
   * Clean up completed jobs older than specified time
   * @param {number} olderThanHours - Hours to keep completed jobs
   */
  async cleanupOldJobs(olderThanHours = 24) {
    try {
      // Note: Cleanup is handled by the centralized queue factory
      logger.info(`Cleanup for jobs older than ${olderThanHours} hours is handled by queue factory`)
    } catch (error) {
      logger.error('Failed to cleanup old jobs:', error)
    }
  }

  /**
   * Gracefully shutdown the queue
   */
  async shutdown() {
    try {
      // Note: Shutdown is handled by the centralized queue factory
      logger.info('Purchase queue shutdown is handled by queue factory')
    } catch (error) {
      logger.error('Error during queue shutdown:', error)
    }
  }
}

module.exports = PurchaseQueueService
