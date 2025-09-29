/**
 * PurchaseWorker Unit Tests
 * Tests for background purchase job processing worker
 */

const PurchaseWorker = require('./PurchaseWorker')
const CONSTANTS = require('../constants')

// Mock dependencies
jest.mock('../services/PurchaseService')
jest.mock('../services/PurchaseQueueService')
jest.mock('../config/queue', () => ({
  getQueueFactory: jest.fn()
}))
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}))

const PurchaseService = require('../services/PurchaseService')
const PurchaseQueueService = require('../services/PurchaseQueueService')

describe('PurchaseWorker', () => {
  let purchaseWorker
  let mockPurchaseService
  let mockPurchaseQueueService
  let mockQueueFactory
  let mockProvider

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup mock services
    mockPurchaseService = {
      attemptPurchase: jest.fn()
    }
    
    mockPurchaseQueueService = {
      updateJobStatus: jest.fn(),
      setUserPurchaseStatus: jest.fn()
    }
    
    // Setup mock queue provider
    mockProvider = {
      process: jest.fn()
    }
    
    mockQueueFactory = {
      getDefaultProvider: jest.fn().mockReturnValue(mockProvider)
    }
    
    // Configure mocks
    PurchaseService.mockImplementation(() => mockPurchaseService)
    PurchaseQueueService.mockImplementation(() => mockPurchaseQueueService)
    
    const queue = require('../config/queue')
    queue.getQueueFactory.mockReturnValue(mockQueueFactory)
    
    purchaseWorker = new PurchaseWorker()
  })

  describe('processPurchaseJob', () => {
    it('should process successful purchase job', async () => {
      const job = {
        id: 'job-123',
        data: {
          userId: 'user-456',
          saleId: 'sale-789',
          timestamp: new Date().toISOString()
        }
      }
      
      const purchaseResult = {
        success: true,
        data: {
          orderId: 'order-111',
          purchasedAt: new Date().toISOString()
        }
      }
      
      mockPurchaseService.attemptPurchase.mockResolvedValue(purchaseResult)
      
      const result = await purchaseWorker.processPurchaseJob(job)
      
      expect(result).toEqual({
        success: true,
        orderId: purchaseResult.data.orderId,
        purchasedAt: purchaseResult.data.purchasedAt
      })
      
      // Verify status updates
      expect(mockPurchaseQueueService.updateJobStatus).toHaveBeenCalledTimes(2)
      
      // First call - processing status
      expect(mockPurchaseQueueService.updateJobStatus).toHaveBeenNthCalledWith(
        1,
        job.id,
        CONSTANTS.PURCHASE_JOB_STATUS.PROCESSING,
        { userId: job.data.userId }
      )
      
      // Second call - completed status
      expect(mockPurchaseQueueService.updateJobStatus).toHaveBeenNthCalledWith(
        2,
        job.id,
        CONSTANTS.PURCHASE_JOB_STATUS.COMPLETED,
        {
          userId: job.data.userId,
          success: true,
          orderId: purchaseResult.data.orderId,
          purchasedAt: purchaseResult.data.purchasedAt
        }
      )
    })

    it('should handle failed purchase due to out of stock', async () => {
      const job = {
        id: 'job-123',
        data: {
          userId: 'user-456',
          saleId: 'sale-789'
        }
      }
      
      const purchaseResult = {
        success: false,
        reason: CONSTANTS.RESPONSE_CODES.OUT_OF_STOCK
      }
      
      mockPurchaseService.attemptPurchase.mockResolvedValue(purchaseResult)
      
      const result = await purchaseWorker.processPurchaseJob(job)
      
      expect(result).toEqual({
        success: false,
        reason: CONSTANTS.RESPONSE_CODES.OUT_OF_STOCK
      })
      
      expect(mockPurchaseQueueService.updateJobStatus).toHaveBeenNthCalledWith(
        2,
        job.id,
        CONSTANTS.PURCHASE_JOB_STATUS.FAILED,
        {
          userId: job.data.userId,
          success: false,
          reason: CONSTANTS.RESPONSE_CODES.OUT_OF_STOCK
        }
      )
    })

    it('should handle already purchased error', async () => {
      const job = {
        id: 'job-123',
        data: {
          userId: 'user-456',
          saleId: 'sale-789'
        }
      }
      
      const purchaseResult = {
        success: false,
        reason: CONSTANTS.RESPONSE_CODES.ALREADY_PURCHASED
      }
      
      mockPurchaseService.attemptPurchase.mockResolvedValue(purchaseResult)
      
      const result = await purchaseWorker.processPurchaseJob(job)
      
      expect(result).toEqual({
        success: false,
        reason: CONSTANTS.RESPONSE_CODES.ALREADY_PURCHASED
      })
      
      expect(mockPurchaseQueueService.updateJobStatus).toHaveBeenCalledWith(
        job.id,
        CONSTANTS.PURCHASE_JOB_STATUS.FAILED,
        expect.objectContaining({
          reason: CONSTANTS.RESPONSE_CODES.ALREADY_PURCHASED
        })
      )
    })

    it('should handle sale not active error', async () => {
      const job = {
        id: 'job-123',
        data: {
          userId: 'user-456',
          saleId: 'sale-789'
        }
      }
      
      const purchaseResult = {
        success: false,
        reason: CONSTANTS.RESPONSE_CODES.SALE_NOT_ACTIVE
      }
      
      mockPurchaseService.attemptPurchase.mockResolvedValue(purchaseResult)
      
      const result = await purchaseWorker.processPurchaseJob(job)
      
      expect(result.success).toBe(false)
      expect(result.reason).toBe(CONSTANTS.RESPONSE_CODES.SALE_NOT_ACTIVE)
    })

    it('should handle service exceptions gracefully', async () => {
      const job = {
        id: 'job-123',
        data: {
          userId: 'user-456',
          saleId: 'sale-789'
        }
      }
      
      mockPurchaseService.attemptPurchase.mockRejectedValue(
        new Error('Database connection failed')
      )
      
      await expect(purchaseWorker.processPurchaseJob(job)).rejects.toThrow(
        'Database connection failed'
      )
      
      expect(mockPurchaseQueueService.updateJobStatus).toHaveBeenCalledWith(
        job.id,
        CONSTANTS.PURCHASE_JOB_STATUS.FAILED,
        expect.objectContaining({
          success: false,
          error: 'Database connection failed'
        })
      )
    })

    it('should validate job data', async () => {
      const invalidJob = {
        id: 'job-123',
        data: {
          // Missing userId
          saleId: 'sale-789'
        }
      }
      
      await expect(purchaseWorker.processPurchaseJob(invalidJob)).rejects.toThrow()
      
      expect(mockPurchaseService.attemptPurchase).not.toHaveBeenCalled()
    })

    it('should track processing metrics', async () => {
      const job = {
        id: 'job-123',
        data: {
          userId: 'user-456',
          saleId: 'sale-789'
        }
      }
      
      mockPurchaseService.attemptPurchase.mockResolvedValue({
        success: true,
        data: { orderId: 'order-111' }
      })
      
      await purchaseWorker.processPurchaseJob(job)
      
      const health = purchaseWorker.getHealthStatus()
      
      expect(health.jobsProcessed).toBe(1)
      expect(health.isHealthy).toBe(true)
    })
  })

  describe('startProcessing', () => {
    it('should start job processing', async () => {
      await purchaseWorker.startProcessing()
      
      expect(purchaseWorker.isProcessing).toBe(true)
      expect(mockProvider.process).toHaveBeenCalledWith(
        CONSTANTS.QUEUE.JOB_TYPES.PURCHASE_PROCESSING,
        CONSTANTS.QUEUE.CONCURRENCY.PURCHASE_WORKERS,
        expect.any(Function)
      )
    })

    it('should not start if already processing', async () => {
      await purchaseWorker.startProcessing()
      await purchaseWorker.startProcessing() // Second call
      
      expect(mockProvider.process).toHaveBeenCalledTimes(1)
    })

    it('should handle queue initialization errors', async () => {
      mockProvider.process.mockImplementation(() => {
        throw new Error('Queue not available')
      })
      
      await expect(purchaseWorker.startProcessing()).rejects.toThrow('Queue not available')
      
      expect(purchaseWorker.isProcessing).toBe(false)
    })

    it('should process jobs with configured concurrency', async () => {
      await purchaseWorker.startProcessing()
      
      expect(mockProvider.process).toHaveBeenCalledWith(
        CONSTANTS.QUEUE.JOB_TYPES.PURCHASE_PROCESSING,
        CONSTANTS.QUEUE.CONCURRENCY.PURCHASE_WORKERS,
        expect.any(Function)
      )
    })
  })

  describe('stopProcessing', () => {
    it('should stop job processing gracefully', async () => {
      await purchaseWorker.startProcessing()
      await purchaseWorker.stopProcessing()
      
      expect(purchaseWorker.isProcessing).toBe(false)
    })

    it('should handle stop when not processing', async () => {
      // Should not throw when not processing
      await expect(purchaseWorker.stopProcessing()).resolves.not.toThrow()
      
      expect(purchaseWorker.isProcessing).toBe(false)
    })

    it('should wait for current job to complete', async () => {
      const job = {
        id: 'job-123',
        data: {
          userId: 'user-456',
          saleId: 'sale-789'
        }
      }
      
      // Simulate a slow job
      mockPurchaseService.attemptPurchase.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: { orderId: 'order-111' }
        }), 100))
      )
      
      await purchaseWorker.startProcessing()
      
      // Start processing a job
      const processingPromise = purchaseWorker.processPurchaseJob(job)
      
      // Stop processing
      const stopPromise = purchaseWorker.stopProcessing()
      
      // Both should complete
      await Promise.all([processingPromise, stopPromise])
      
      expect(purchaseWorker.isProcessing).toBe(false)
    })
  })

  describe('getHealthStatus', () => {
    it('should return healthy status for new worker', () => {
      const health = purchaseWorker.getHealthStatus()
      
      expect(health).toEqual({
        isHealthy: true,
        isProcessing: false,
        jobsProcessed: 0,
        jobsFailed: 0,
        lastProcessedAt: null,
        uptime: expect.any(Number)
      })
    })

    it('should track job processing metrics', async () => {
      const job = {
        id: 'job-123',
        data: {
          userId: 'user-456',
          saleId: 'sale-789'
        }
      }
      
      // Process successful job
      mockPurchaseService.attemptPurchase.mockResolvedValue({
        success: true,
        data: { orderId: 'order-111' }
      })
      
      await purchaseWorker.processPurchaseJob(job)
      
      let health = purchaseWorker.getHealthStatus()
      expect(health.jobsProcessed).toBe(1)
      expect(health.jobsFailed).toBe(0)
      expect(health.lastProcessedAt).not.toBeNull()
      
      // Process failed job
      mockPurchaseService.attemptPurchase.mockResolvedValue({
        success: false,
        reason: CONSTANTS.RESPONSE_CODES.OUT_OF_STOCK
      })
      
      await purchaseWorker.processPurchaseJob(job)
      
      health = purchaseWorker.getHealthStatus()
      expect(health.jobsProcessed).toBe(2)
      expect(health.jobsFailed).toBe(1)
    })

    it('should calculate uptime correctly', async () => {
      const initialHealth = purchaseWorker.getHealthStatus()
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const laterHealth = purchaseWorker.getHealthStatus()
      
      expect(laterHealth.uptime).toBeGreaterThan(initialHealth.uptime)
    })

    it('should reflect processing status', async () => {
      let health = purchaseWorker.getHealthStatus()
      expect(health.isProcessing).toBe(false)
      
      await purchaseWorker.startProcessing()
      
      health = purchaseWorker.getHealthStatus()
      expect(health.isProcessing).toBe(true)
      
      await purchaseWorker.stopProcessing()
      
      health = purchaseWorker.getHealthStatus()
      expect(health.isProcessing).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle malformed job data', async () => {
      const malformedJob = {
        id: 'job-123',
        // data is completely missing
      }
      
      await expect(purchaseWorker.processPurchaseJob(malformedJob)).rejects.toThrow()
    })

    it('should handle job with null userId', async () => {
      const job = {
        id: 'job-123',
        data: {
          userId: null,
          saleId: 'sale-789'
        }
      }
      
      await expect(purchaseWorker.processPurchaseJob(job)).rejects.toThrow()
    })

    it('should handle very long running jobs', async () => {
      const job = {
        id: 'job-123',
        data: {
          userId: 'user-456',
          saleId: 'sale-789'
        }
      }
      
      // Simulate very slow purchase process
      mockPurchaseService.attemptPurchase.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: { orderId: 'order-111' }
        }), 5000))
      )
      
      // This should still work but take time
      const result = await purchaseWorker.processPurchaseJob(job)
      
      expect(result.success).toBe(true)
    }, 10000) // Increase timeout for this test

    it('should handle concurrent job processing', async () => {
      const jobs = Array(5).fill().map((_, i) => ({
        id: `job-${i}`,
        data: {
          userId: `user-${i}`,
          saleId: 'sale-789'
        }
      }))
      
      mockPurchaseService.attemptPurchase.mockResolvedValue({
        success: true,
        data: { orderId: 'order-111' }
      })
      
      // Process jobs concurrently
      const results = await Promise.all(
        jobs.map(job => purchaseWorker.processPurchaseJob(job))
      )
      
      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result.success).toBe(true)
      })
      
      const health = purchaseWorker.getHealthStatus()
      expect(health.jobsProcessed).toBe(5)
    })

    it('should recover from queue service failures', async () => {
      const job = {
        id: 'job-123',
        data: {
          userId: 'user-456',
          saleId: 'sale-789'
        }
      }
      
      // First update fails
      mockPurchaseQueueService.updateJobStatus
        .mockRejectedValueOnce(new Error('Redis connection lost'))
        .mockResolvedValue()
      
      mockPurchaseService.attemptPurchase.mockResolvedValue({
        success: true,
        data: { orderId: 'order-111' }
      })
      
      // Should still process the job despite status update failure
      const result = await purchaseWorker.processPurchaseJob(job)
      
      expect(result.success).toBe(true)
    })
  })
})