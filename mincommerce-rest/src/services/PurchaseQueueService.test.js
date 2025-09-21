/**
 * PurchaseQueueService Unit Tests
 * Tests for queue-based purchase processing service
 */

const PurchaseQueueService = require('./PurchaseQueueService')
const CONSTANTS = require('../constants')

// Mock dependencies
jest.mock('../config/redis', () => ({
  getRedisClient: jest.fn()
}))

jest.mock('../config/queue', () => ({
  getQueueFactory: jest.fn()
}))

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}))

describe('PurchaseQueueService', () => {
  let purchaseQueueService
  let mockRedisClient
  let mockQueueFactory
  let mockQueue

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      scan: jest.fn().mockResolvedValue({ cursor: 0, keys: [] })
    }
    
    // Setup mock queue
    mockQueue = {
      addJob: jest.fn(),
      getJob: jest.fn(),
      getJobStatus: jest.fn(),
      getStats: jest.fn()
    }
    
    // Setup mock queue factory
    mockQueueFactory = {
      getDefaultProvider: jest.fn().mockReturnValue(mockQueue),
      addJob: jest.fn(),
      getJob: jest.fn()
    }
    
    // Configure mocks
    const redis = require('../config/redis')
    redis.getRedisClient.mockReturnValue(mockRedisClient)
    
    const queue = require('../config/queue')
    queue.getQueueFactory.mockReturnValue(mockQueueFactory)
    
    purchaseQueueService = new PurchaseQueueService()
  })

  describe('queuePurchase', () => {
    it('should queue purchase request successfully for first-time user', async () => {
      const userId = 'user-123'
      const saleId = 'sale-456'
      const jobId = 'job-789'
      
      // Mock no existing purchase status
      mockRedisClient.get.mockResolvedValue(null)
      
      // Mock queue job creation
      mockQueue.addJob.mockResolvedValue({
        id: jobId,
        status: 'queued',
        data: { userId, saleId }
      })
      
      // Mock stats for estimated wait time
      mockQueueFactory.getStats.mockResolvedValue({
        'purchase-processing': {
          waiting: 5,
          active: 2
        }
      })
      
      const result = await purchaseQueueService.queuePurchase(userId, saleId)
      
      expect(result).toEqual({
        success: true,
        jobId,
        status: CONSTANTS.PURCHASE_JOB_STATUS.QUEUED,
        message: CONSTANTS.SUCCESS_MESSAGES.PURCHASE_QUEUED,
        estimatedWaitTime: expect.any(Number)
      })
      
      expect(mockQueue.addJob).toHaveBeenCalledWith(
        CONSTANTS.QUEUE.JOB_TYPES.PURCHASE_PROCESSING,
        { userId, saleId, timestamp: expect.any(Date) },
        {
          priority: CONSTANTS.QUEUE.JOB_OPTIONS.PRIORITY_NORMAL,
          attempts: CONSTANTS.QUEUE.JOB_OPTIONS.MAX_ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: CONSTANTS.QUEUE.JOB_OPTIONS.BACKOFF_DELAY_MS
          },
          removeOnComplete: CONSTANTS.QUEUE.JOB_OPTIONS.REMOVE_ON_COMPLETE,
          removeOnFail: CONSTANTS.QUEUE.JOB_OPTIONS.REMOVE_ON_FAIL
        }
      )
      
      // Verify Redis cache updates
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        CONSTANTS.REDIS_KEYS.PURCHASE_JOB(jobId),
        CONSTANTS.CACHE_TTL.PURCHASE_JOB,
        expect.stringContaining(jobId)
      )
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        CONSTANTS.REDIS_KEYS.PURCHASE_STATUS(userId),
        CONSTANTS.CACHE_TTL.PURCHASE_STATUS,
        expect.stringContaining(jobId)
      )
    })

    it('should reject duplicate purchase request from same user', async () => {
      const userId = 'user-123'
      const saleId = 'sale-456'
      
      // Mock existing purchase status
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        status: CONSTANTS.PURCHASE_JOB_STATUS.QUEUED,
        jobId: 'existing-job-123',
        timestamp: new Date().toISOString()
      }))
      
      await expect(purchaseQueueService.queuePurchase(userId, saleId))
        .rejects.toThrow('User already has a pending purchase request')
      
      expect(mockQueue.addJob).not.toHaveBeenCalled()
    })

    it('should handle queue failure gracefully', async () => {
      const userId = 'user-123'
      const saleId = 'sale-456'
      
      mockRedisClient.get.mockResolvedValue(null)
      mockQueue.addJob.mockRejectedValue(new Error('Queue unavailable'))
      
      await expect(purchaseQueueService.queuePurchase(userId, saleId))
        .rejects.toThrow('Failed to queue purchase request')
      
      // Verify no Redis updates on failure
      expect(mockRedisClient.setEx).not.toHaveBeenCalled()
    })
  })

  describe('getUserPurchaseStatus', () => {
    it('should return queued purchase status', async () => {
      const userId = 'user-123'
      const jobId = 'job-789'
      
      const mockStatus = {
        status: CONSTANTS.PURCHASE_JOB_STATUS.QUEUED,
        jobId,
        timestamp: new Date().toISOString()
      }
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockStatus))
      
      const mockJob = {
        id: jobId,
        status: 'queued',
        data: { userId },
        progress: 0
      }
      
      mockQueueFactory.getJob.mockResolvedValue(mockJob)
      
      const result = await purchaseQueueService.getUserPurchaseStatus(userId)
      
      expect(result).toEqual({
        status: CONSTANTS.PURCHASE_JOB_STATUS.QUEUED,
        jobId,
        timestamp: mockStatus.timestamp,
        estimatedWaitTime: expect.any(Number)
      })
    })

    it('should return processing status', async () => {
      const userId = 'user-123'
      const jobId = 'job-789'
      
      const mockStatus = {
        status: CONSTANTS.PURCHASE_JOB_STATUS.PROCESSING,
        jobId,
        timestamp: new Date().toISOString()
      }
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockStatus))
      
      const result = await purchaseQueueService.getUserPurchaseStatus(userId)
      
      expect(result).toEqual({
        status: CONSTANTS.PURCHASE_JOB_STATUS.PROCESSING,
        jobId,
        timestamp: mockStatus.timestamp,
        message: 'Purchase is being processed'
      })
    })

    it('should return completed status with success details', async () => {
      const userId = 'user-123'
      const jobId = 'job-789'
      const orderId = 'order-456'
      
      const mockStatus = {
        status: CONSTANTS.PURCHASE_JOB_STATUS.COMPLETED,
        jobId,
        timestamp: new Date().toISOString(),
        success: true,
        orderId,
        purchasedAt: new Date().toISOString()
      }
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockStatus))
      
      const result = await purchaseQueueService.getUserPurchaseStatus(userId)
      
      expect(result).toEqual({
        status: CONSTANTS.PURCHASE_JOB_STATUS.COMPLETED,
        jobId,
        timestamp: mockStatus.timestamp,
        success: true,
        orderId,
        purchasedAt: mockStatus.purchasedAt
      })
    })

    it('should return failed status with reason', async () => {
      const userId = 'user-123'
      const jobId = 'job-789'
      
      const mockStatus = {
        status: CONSTANTS.PURCHASE_JOB_STATUS.FAILED,
        jobId,
        timestamp: new Date().toISOString(),
        success: false,
        reason: CONSTANTS.RESPONSE_CODES.OUT_OF_STOCK
      }
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockStatus))
      
      const result = await purchaseQueueService.getUserPurchaseStatus(userId)
      
      expect(result).toEqual({
        status: CONSTANTS.PURCHASE_JOB_STATUS.FAILED,
        jobId,
        timestamp: mockStatus.timestamp,
        success: false,
        reason: CONSTANTS.RESPONSE_CODES.OUT_OF_STOCK
      })
    })

    it('should return null when no purchase status exists', async () => {
      const userId = 'user-123'
      
      mockRedisClient.get.mockResolvedValue(null)
      
      const result = await purchaseQueueService.getUserPurchaseStatus(userId)
      
      expect(result).toBeNull()
    })
  })

  describe('getJobStatus', () => {
    it('should return job status successfully', async () => {
      const jobId = 'job-789'
      
      const mockJobData = {
        status: CONSTANTS.PURCHASE_JOB_STATUS.PROCESSING,
        jobId,
        timestamp: new Date().toISOString(),
        userId: 'user-123'
      }
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockJobData))
      
      const result = await purchaseQueueService.getJobStatus(jobId)
      
      expect(result).toEqual(mockJobData)
      expect(mockRedisClient.get).toHaveBeenCalledWith(CONSTANTS.REDIS_KEYS.PURCHASE_JOB(jobId))
    })

    it('should return null for non-existent job', async () => {
      const jobId = 'non-existent-job'
      
      mockRedisClient.get.mockResolvedValue(null)
      
      const result = await purchaseQueueService.getJobStatus(jobId)
      
      expect(result).toBeNull()
    })
  })

  describe('updateJobStatus', () => {
    it('should update job status to processing', async () => {
      const jobId = 'job-789'
      const userId = 'user-123'
      const status = CONSTANTS.PURCHASE_JOB_STATUS.PROCESSING
      
      await purchaseQueueService.updateJobStatus(jobId, status, { userId })
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        CONSTANTS.REDIS_KEYS.PURCHASE_JOB(jobId),
        CONSTANTS.CACHE_TTL.PURCHASE_JOB,
        expect.stringContaining(status)
      )
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        CONSTANTS.REDIS_KEYS.PURCHASE_STATUS(userId),
        CONSTANTS.CACHE_TTL.PURCHASE_STATUS,
        expect.stringContaining(status)
      )
    })

    it('should update job status to completed with order details', async () => {
      const jobId = 'job-789'
      const userId = 'user-123'
      const orderId = 'order-456'
      const status = CONSTANTS.PURCHASE_JOB_STATUS.COMPLETED
      
      await purchaseQueueService.updateJobStatus(jobId, status, { 
        userId, 
        success: true, 
        orderId,
        purchasedAt: new Date().toISOString()
      })
      
      const expectedData = expect.objectContaining({
        status,
        jobId,
        success: true,
        orderId,
        purchasedAt: expect.any(String)
      })
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        CONSTANTS.REDIS_KEYS.PURCHASE_JOB(jobId),
        CONSTANTS.CACHE_TTL.PURCHASE_JOB,
        JSON.stringify(expectedData)
      )
    })

    it('should update job status to failed with reason', async () => {
      const jobId = 'job-789'
      const userId = 'user-123'
      const status = CONSTANTS.PURCHASE_JOB_STATUS.FAILED
      const reason = CONSTANTS.RESPONSE_CODES.OUT_OF_STOCK
      
      await purchaseQueueService.updateJobStatus(jobId, status, { 
        userId, 
        success: false, 
        reason 
      })
      
      const expectedData = expect.objectContaining({
        status,
        jobId,
        success: false,
        reason
      })
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        CONSTANTS.REDIS_KEYS.PURCHASE_JOB(jobId),
        CONSTANTS.CACHE_TTL.PURCHASE_JOB,
        JSON.stringify(expectedData)
      )
    })
  })

  describe('getEstimatedWaitTime', () => {
    it('should calculate estimated wait time based on queue stats', async () => {
      mockQueueFactory.getStats.mockResolvedValue({
        'purchase-processing': {
          waiting: 10,
          active: 2,
          completed: 100,
          failed: 5
        }
      })
      
      const waitTime = await purchaseQueueService.getEstimatedWaitTime()
      
      expect(waitTime).toBe(60) // (10 + 2) * 5 seconds
      expect(mockQueueFactory.getStats).toHaveBeenCalled()
    })

    it('should return minimum wait time when queue is empty', async () => {
      mockQueueFactory.getStats.mockResolvedValue({
        'purchase-processing': {
          waiting: 0,
          active: 0,
          completed: 100,
          failed: 5
        }
      })
      
      const waitTime = await purchaseQueueService.getEstimatedWaitTime()
      
      expect(waitTime).toBe(5) // Minimum 5 seconds
    })

    it('should handle stats retrieval failure', async () => {
      mockQueueFactory.getStats.mockRejectedValue(new Error('Stats unavailable'))
      
      const waitTime = await purchaseQueueService.getEstimatedWaitTime()
      
      expect(waitTime).toBe(30) // Default wait time
    })
  })

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const mockStats = {
        'purchase-processing': {
          waiting: 10,
          active: 2,
          completed: 100,
          failed: 5,
          delayed: 0
        }
      }
      
      mockQueueFactory.getStats.mockResolvedValue(mockStats)
      
      const stats = await purchaseQueueService.getQueueStats()
      
      expect(stats).toEqual({
        queue: {
          waiting: 10,
          active: 2,
          completed: 100,
          failed: 5,
          total: 117
        },
        workers: {
          active: 2,
          idle: 0
        }
      })
    })

    it('should handle missing stats gracefully', async () => {
      mockQueueFactory.getStats.mockResolvedValue({})
      
      const stats = await purchaseQueueService.getQueueStats()
      
      expect(stats).toEqual({
        queue: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          total: 0
        },
        workers: {
          active: 0,
          idle: 0
        }
      })
    })
  })

  describe('cleanupOldJobs', () => {
    it('should cleanup old job entries from Redis', async () => {
      const oldJobKeys = [
        'purchase_job:old-job-1',
        'purchase_job:old-job-2',
        'purchase_status:user-1',
        'purchase_status:user-2'
      ]
      
      mockRedisClient.scan.mockResolvedValueOnce({ cursor: 1, keys: ['purchase_job:old-job-1'] })
        .mockResolvedValueOnce({ cursor: 0, keys: ['purchase_job:old-job-2'] })
      
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        timestamp: oldDate,
        status: 'completed'
      }))
      
      await purchaseQueueService.cleanupOldJobs(24)
      
      expect(mockRedisClient.del).toHaveBeenCalledTimes(2)
    })

    it('should not cleanup recent jobs', async () => {
      mockRedisClient.scan.mockResolvedValue({ cursor: 0, keys: ['purchase_job:recent-job'] })
      
      const recentDate = new Date().toISOString()
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        timestamp: recentDate,
        status: 'completed'
      }))
      
      await purchaseQueueService.cleanupOldJobs(24)
      
      expect(mockRedisClient.del).not.toHaveBeenCalled()
    })
  })

  describe('shutdown', () => {
    it('should close queue connections gracefully', async () => {
      const mockClose = jest.fn().mockResolvedValue()
      mockQueueFactory.close = mockClose
      
      await purchaseQueueService.shutdown()
      
      expect(mockClose).toHaveBeenCalled()
    })

    it('should handle shutdown errors gracefully', async () => {
      const mockClose = jest.fn().mockRejectedValue(new Error('Close failed'))
      mockQueueFactory.close = mockClose
      
      // Should not throw
      await expect(purchaseQueueService.shutdown()).resolves.not.toThrow()
    })
  })

  describe('Edge Cases', () => {
    it('should handle Redis connection failure', async () => {
      const userId = 'user-123'
      
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'))
      
      await expect(purchaseQueueService.getUserPurchaseStatus(userId))
        .rejects.toThrow('Failed to get user purchase status')
    })

    it('should handle malformed JSON in Redis', async () => {
      const userId = 'user-123'
      
      mockRedisClient.get.mockResolvedValue('invalid-json')
      
      await expect(purchaseQueueService.getUserPurchaseStatus(userId))
        .rejects.toThrow()
    })

    it('should handle queue factory not initialized', async () => {
      const queue = require('../config/queue')
      queue.getQueueFactory.mockImplementation(() => {
        throw new Error('Queue factory not initialized')
      })
      
      const service = new PurchaseQueueService()
      
      await expect(service.queuePurchase('user-123', 'sale-456'))
        .rejects.toThrow()
    })
  })
})