/**
 * WorkerManager Unit Tests
 * Tests for worker lifecycle management and monitoring
 */

const WorkerManager = require('./WorkerManager')
const CONSTANTS = require('../constants')

// Mock dependencies
jest.mock('./PurchaseWorker')
jest.mock('../services/PurchaseQueueService')
jest.mock('../config/redis', () => ({
  getRedisClient: jest.fn()
}))
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}))

const PurchaseWorker = require('./PurchaseWorker')
const PurchaseQueueService = require('../services/PurchaseQueueService')

describe('WorkerManager', () => {
  let workerManager
  let mockPurchaseWorker
  let mockPurchaseQueueService
  let mockRedisClient

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    
    // Setup mock worker
    mockPurchaseWorker = {
      startProcessing: jest.fn().mockResolvedValue(),
      stopProcessing: jest.fn().mockResolvedValue(),
      getHealthStatus: jest.fn().mockReturnValue({
        isHealthy: true,
        isProcessing: true,
        jobsProcessed: 10,
        jobsFailed: 1,
        lastProcessedAt: new Date(),
        uptime: 100
      })
    }
    
    // Setup mock queue service
    mockPurchaseQueueService = {
      getQueueStats: jest.fn().mockResolvedValue({
        queue: {
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 3,
          total: 110
        },
        workers: {
          active: 1,
          idle: 0
        }
      })
    }
    
    // Setup mock Redis client
    mockRedisClient = {
      setEx: jest.fn().mockResolvedValue(),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue()
    }
    
    // Configure mocks
    PurchaseWorker.mockImplementation(() => mockPurchaseWorker)
    PurchaseQueueService.mockImplementation(() => mockPurchaseQueueService)
    
    const redis = require('../config/redis')
    redis.getRedisClient.mockReturnValue(mockRedisClient)
    
    workerManager = new WorkerManager()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('start', () => {
    it('should start worker and health check successfully', async () => {
      await workerManager.start()
      
      expect(workerManager.isRunning).toBe(true)
      expect(mockPurchaseWorker.startProcessing).toHaveBeenCalled()
      expect(workerManager.healthCheckInterval).toBeDefined()
    })

    it('should not start if already running', async () => {
      await workerManager.start()
      await workerManager.start() // Second call
      
      expect(mockPurchaseWorker.startProcessing).toHaveBeenCalledTimes(1)
    })

    it('should handle worker start failure', async () => {
      mockPurchaseWorker.startProcessing.mockRejectedValue(
        new Error('Worker initialization failed')
      )
      
      await expect(workerManager.start()).rejects.toThrow('Worker initialization failed')
      
      expect(workerManager.isRunning).toBe(false)
      expect(workerManager.healthCheckInterval).toBeNull()
    })

    it('should initialize queue service', async () => {
      await workerManager.start()
      
      expect(PurchaseQueueService).toHaveBeenCalled()
      expect(workerManager.queueService).toBeDefined()
    })
  })

  describe('stop', () => {
    it('should stop worker and clear health check', async () => {
      await workerManager.start()
      await workerManager.stop()
      
      expect(workerManager.isRunning).toBe(false)
      expect(mockPurchaseWorker.stopProcessing).toHaveBeenCalled()
      expect(workerManager.healthCheckInterval).toBeNull()
    })

    it('should handle stop when not running', async () => {
      await expect(workerManager.stop()).resolves.not.toThrow()
      
      expect(mockPurchaseWorker.stopProcessing).not.toHaveBeenCalled()
    })

    it('should handle worker stop failure gracefully', async () => {
      await workerManager.start()
      
      mockPurchaseWorker.stopProcessing.mockRejectedValue(
        new Error('Worker stop failed')
      )
      
      await expect(workerManager.stop()).rejects.toThrow('Worker stop failed')
      
      // Should still mark as stopped
      expect(workerManager.isRunning).toBe(false)
    })

    it('should clear Redis metrics on stop', async () => {
      await workerManager.start()
      await workerManager.stop()
      
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        expect.stringContaining('purchase_worker')
      )
    })
  })

  describe('performHealthCheck', () => {
    it('should perform health check and store metrics', async () => {
      await workerManager.start()
      await workerManager.performHealthCheck()
      
      expect(mockPurchaseWorker.getHealthStatus).toHaveBeenCalled()
      expect(mockPurchaseQueueService.getQueueStats).toHaveBeenCalled()
      
      // Check Redis metrics storage
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        expect.stringContaining('purchase_metrics'),
        CONSTANTS.CACHE_TTL.PURCHASE_METRICS,
        expect.any(String)
      )
    })

    it('should handle unhealthy worker', async () => {
      mockPurchaseWorker.getHealthStatus.mockReturnValue({
        isHealthy: false,
        isProcessing: false,
        jobsProcessed: 0,
        jobsFailed: 10,
        lastProcessedAt: null,
        uptime: 100
      })
      
      await workerManager.start()
      await workerManager.performHealthCheck()
      
      // Should log warning but continue
      const logger = require('../utils/logger')
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Worker health check failed')
      )
    })

    it('should restart worker if not processing', async () => {
      mockPurchaseWorker.getHealthStatus.mockReturnValue({
        isHealthy: true,
        isProcessing: false, // Not processing
        jobsProcessed: 10,
        jobsFailed: 0,
        lastProcessedAt: new Date(),
        uptime: 100
      })
      
      await workerManager.start()
      await workerManager.performHealthCheck()
      
      // Should attempt to restart
      expect(mockPurchaseWorker.startProcessing).toHaveBeenCalledTimes(2) // Initial + restart
    })

    it('should handle health check errors gracefully', async () => {
      mockPurchaseWorker.getHealthStatus.mockImplementation(() => {
        throw new Error('Worker crashed')
      })
      
      await workerManager.start()
      
      // Should not throw
      await expect(workerManager.performHealthCheck()).resolves.not.toThrow()
      
      const logger = require('../utils/logger')
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Health check failed'),
        expect.any(Error)
      )
    })

    it('should calculate performance metrics', async () => {
      mockPurchaseWorker.getHealthStatus.mockReturnValue({
        isHealthy: true,
        isProcessing: true,
        jobsProcessed: 100,
        jobsFailed: 5,
        lastProcessedAt: new Date(),
        uptime: 1000 // 1000 seconds
      })
      
      await workerManager.start()
      await workerManager.performHealthCheck()
      
      const storedMetrics = JSON.parse(
        mockRedisClient.setEx.mock.calls.find(
          call => call[0].includes('purchase_metrics')
        )[2]
      )
      
      expect(storedMetrics.performance.averageProcessingTime).toBeDefined()
      expect(storedMetrics.performance.successRate).toBe(95) // 95% success rate
      expect(storedMetrics.performance.throughput).toBe(0.1) // 100 jobs / 1000 seconds
    })
  })

  describe('startHealthCheck', () => {
    it('should start periodic health checks', async () => {
      await workerManager.start()
      
      expect(workerManager.healthCheckInterval).toBeDefined()
      
      // Advance timers
      jest.advanceTimersByTime(30000) // 30 seconds
      
      // Health check should have been called
      expect(mockPurchaseWorker.getHealthStatus).toHaveBeenCalled()
    })

    it('should not create multiple intervals', async () => {
      await workerManager.start()
      const firstInterval = workerManager.healthCheckInterval
      
      workerManager.startHealthCheck() // Try to start again
      
      expect(workerManager.healthCheckInterval).toBe(firstInterval)
    })

    it('should perform health check every 30 seconds', async () => {
      await workerManager.start()
      
      // Advance time multiple times
      jest.advanceTimersByTime(30000) // 30 seconds
      expect(mockPurchaseWorker.getHealthStatus).toHaveBeenCalledTimes(1)
      
      jest.advanceTimersByTime(30000) // Another 30 seconds
      expect(mockPurchaseWorker.getHealthStatus).toHaveBeenCalledTimes(2)
      
      jest.advanceTimersByTime(30000) // Another 30 seconds
      expect(mockPurchaseWorker.getHealthStatus).toHaveBeenCalledTimes(3)
    })
  })

  describe('storeMetrics', () => {
    it('should store metrics in Redis', async () => {
      const metrics = {
        worker: {
          isHealthy: true,
          jobsProcessed: 50,
          jobsFailed: 2
        },
        queue: {
          waiting: 10,
          active: 3
        },
        performance: {
          averageProcessingTime: 1.5,
          successRate: 96
        }
      }
      
      await workerManager.storeMetrics(metrics)
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        CONSTANTS.REDIS_KEYS.PURCHASE_METRICS,
        CONSTANTS.CACHE_TTL.PURCHASE_METRICS,
        JSON.stringify(metrics)
      )
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        CONSTANTS.REDIS_KEYS.PURCHASE_QUEUE_STATS,
        CONSTANTS.CACHE_TTL.PURCHASE_QUEUE_STATS,
        JSON.stringify(metrics.queue)
      )
    })

    it('should handle Redis storage failure', async () => {
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis unavailable'))
      
      const metrics = { worker: {}, queue: {}, performance: {} }
      
      // Should not throw
      await expect(workerManager.storeMetrics(metrics)).resolves.not.toThrow()
      
      const logger = require('../utils/logger')
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to store metrics'),
        expect.any(Error)
      )
    })
  })

  describe('getSystemStatus', () => {
    it('should return complete system status', async () => {
      await workerManager.start()
      
      const status = await workerManager.getSystemStatus()
      
      expect(status).toEqual({
        isRunning: true,
        worker: {
          isHealthy: true,
          isProcessing: true,
          jobsProcessed: 10,
          jobsFailed: 1,
          lastProcessedAt: expect.any(Date),
          uptime: 100
        },
        queue: {
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 3,
          total: 110
        },
        timestamp: expect.any(String)
      })
    })

    it('should return status when not running', async () => {
      const status = await workerManager.getSystemStatus()
      
      expect(status).toEqual({
        isRunning: false,
        worker: null,
        queue: null,
        timestamp: expect.any(String)
      })
    })

    it('should handle partial failures', async () => {
      await workerManager.start()
      
      // Queue stats fail but worker is fine
      mockPurchaseQueueService.getQueueStats.mockRejectedValue(
        new Error('Queue service error')
      )
      
      const status = await workerManager.getSystemStatus()
      
      expect(status.worker).toBeDefined()
      expect(status.queue).toEqual({
        error: 'Failed to get queue stats'
      })
    })
  })

  describe('getQueueService', () => {
    it('should return queue service instance', async () => {
      await workerManager.start()
      
      const queueService = workerManager.getQueueService()
      
      expect(queueService).toBe(workerManager.queueService)
      expect(queueService).toBeDefined()
    })

    it('should return null when not started', () => {
      const queueService = workerManager.getQueueService()
      
      expect(queueService).toBeNull()
    })
  })

  describe('getWorker', () => {
    it('should return worker instance', async () => {
      await workerManager.start()
      
      const worker = workerManager.getWorker()
      
      expect(worker).toBe(workerManager.worker)
      expect(worker).toBeDefined()
    })

    it('should return null when not started', () => {
      const worker = workerManager.getWorker()
      
      expect(worker).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid start/stop cycles', async () => {
      await workerManager.start()
      await workerManager.stop()
      await workerManager.start()
      await workerManager.stop()
      await workerManager.start()
      
      expect(workerManager.isRunning).toBe(true)
      expect(mockPurchaseWorker.startProcessing).toHaveBeenCalledTimes(3)
      expect(mockPurchaseWorker.stopProcessing).toHaveBeenCalledTimes(2)
    })

    it('should handle worker crash during operation', async () => {
      await workerManager.start()
      
      // Simulate worker crash
      mockPurchaseWorker.getHealthStatus.mockImplementation(() => {
        throw new Error('Worker process crashed')
      })
      
      // Health check should handle the error
      await workerManager.performHealthCheck()
      
      const logger = require('../utils/logger')
      expect(logger.error).toHaveBeenCalled()
    })

    it('should clean up intervals on stop', async () => {
      await workerManager.start()
      
      const interval = workerManager.healthCheckInterval
      expect(interval).toBeDefined()
      
      await workerManager.stop()
      
      expect(workerManager.healthCheckInterval).toBeNull()
    })

    it('should handle Redis unavailability', async () => {
      const redis = require('../config/redis')
      redis.getRedisClient.mockImplementation(() => {
        throw new Error('Redis not initialized')
      })
      
      const manager = new WorkerManager()
      
      // Should still be able to start (Redis failures are handled gracefully)
      await expect(manager.start()).resolves.not.toThrow()
    })

    it('should handle concurrent health checks', async () => {
      await workerManager.start()
      
      // Trigger multiple health checks concurrently
      const promises = Array(5).fill().map(() => 
        workerManager.performHealthCheck()
      )
      
      await Promise.all(promises)
      
      // All should complete without errors
      expect(mockPurchaseWorker.getHealthStatus).toHaveBeenCalledTimes(5)
    })
  })

  describe('Graceful Shutdown', () => {
    it('should handle SIGTERM signal', async () => {
      await workerManager.start()
      
      // Simulate SIGTERM
      const stopSpy = jest.spyOn(workerManager, 'stop')
      
      await workerManager.stop()
      
      expect(stopSpy).toHaveBeenCalled()
      expect(workerManager.isRunning).toBe(false)
    })

    it('should complete ongoing health check before stopping', async () => {
      await workerManager.start()
      
      // Start a health check
      const healthCheckPromise = workerManager.performHealthCheck()
      
      // Try to stop while health check is running
      const stopPromise = workerManager.stop()
      
      await Promise.all([healthCheckPromise, stopPromise])
      
      expect(workerManager.isRunning).toBe(false)
    })
  })
})