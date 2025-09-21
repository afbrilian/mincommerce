/**
 * WorkerManager
 * Manages purchase workers and queue processing
 * Provides centralized control over worker lifecycle
 */

const logger = require('../utils/logger')
const PurchaseWorker = require('./PurchaseWorker')
const PurchaseQueueService = require('../services/PurchaseQueueService')
const CONSTANTS = require('../constants')

class WorkerManager {
  constructor() {
    this.purchaseQueueService = new PurchaseQueueService()
    this.purchaseWorker = new PurchaseWorker()
    this.isRunning = false
    this.healthCheckInterval = null
  }

  /**
   * Start all workers
   */
  async start() {
    try {
      logger.info('Starting worker manager...')

      // Start purchase worker
      await this.purchaseWorker.startProcessing()

      // Start health check monitoring
      this.startHealthCheck()

      this.isRunning = true
      logger.info('Worker manager started successfully')
    } catch (error) {
      logger.error('Failed to start worker manager:', error)
      throw error
    }
  }

  /**
   * Stop all workers
   */
  async stop() {
    try {
      logger.info('Stopping worker manager...')

      // Stop health check
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval)
        this.healthCheckInterval = null
      }

      // Stop purchase worker
      await this.purchaseWorker.stopProcessing()

      // Shutdown queue service
      await this.purchaseQueueService.shutdown()

      this.isRunning = false
      logger.info('Worker manager stopped successfully')
    } catch (error) {
      logger.error('Error stopping worker manager:', error)
    }
  }

  /**
   * Start health check monitoring
   */
  startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck()
      } catch (error) {
        logger.error('Health check failed:', error)
      }
    }, CONSTANTS.QUEUE.PERFORMANCE.METRICS_UPDATE_INTERVAL_MS)
  }

  /**
   * Perform health check on workers and queue
   */
  async performHealthCheck() {
    try {
      const workerHealth = this.purchaseWorker.getHealthStatus()
      const queueStats = await this.purchaseQueueService.getQueueStats()

      // Log health status
      logger.debug('Worker health check:', {
        worker: workerHealth,
        queue: queueStats,
        timestamp: new Date().toISOString()
      })

      // Store metrics in Redis
      await this.storeMetrics({
        worker: workerHealth,
        queue: queueStats,
        timestamp: new Date().toISOString()
      })

      // Cleanup old jobs periodically
      if (Math.random() < 0.1) {
        // 10% chance to cleanup
        await this.purchaseQueueService.cleanupOldJobs(24) // Keep jobs for 24 hours
      }
    } catch (error) {
      logger.error('Health check error:', error)
    }
  }

  /**
   * Store metrics in Redis
   * @param {Object} metrics - Metrics data
   */
  async storeMetrics(metrics) {
    try {
      const { getRedisClient } = require('../config/redis')
      const redis = getRedisClient()

      const metricsKey = CONSTANTS.REDIS_KEYS.PURCHASE_METRICS
      await redis.setEx(metricsKey, CONSTANTS.CACHE_TTL.PURCHASE_METRICS, JSON.stringify(metrics))
    } catch (error) {
      logger.error('Failed to store metrics:', error)
    }
  }

  /**
   * Get system status
   * @returns {Promise<Object>} System status
   */
  async getSystemStatus() {
    try {
      const workerHealth = this.purchaseWorker.getHealthStatus()
      const queueStats = await this.purchaseQueueService.getQueueStats()

      return {
        isRunning: this.isRunning,
        worker: workerHealth,
        queue: queueStats,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      logger.error('Failed to get system status:', error)
      return {
        isRunning: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Get queue service instance
   * @returns {PurchaseQueueService} Queue service
   */
  getQueueService() {
    return this.purchaseQueueService
  }

  /**
   * Get worker instance
   * @returns {PurchaseWorker} Worker instance
   */
  getWorker() {
    return this.purchaseWorker
  }
}

module.exports = WorkerManager
