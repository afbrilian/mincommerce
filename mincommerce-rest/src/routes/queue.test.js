/**
 * Queue Routes Tests
 * Tests for queue monitoring and management endpoints
 */

const request = require('supertest')
const express = require('express')

// Mock dependencies
jest.mock('../config/queue', () => ({
  getQueueFactory: jest.fn(),
  getJob: jest.fn(),
  getJobStatus: jest.fn()
}))

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}))

const { router: queueRoutes, setWorkerManager } = require('./queue')

describe('Queue Routes', () => {
  let app
  let mockWorkerManager
  let mockQueueFactory

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup Express app for testing
    app = express()
    app.use(express.json())
    app.use('/queue', queueRoutes)
    
    // Setup mock worker manager
    mockWorkerManager = {
      getSystemStatus: jest.fn(),
      start: jest.fn(),
      stop: jest.fn()
    }
    
    // Setup mock queue factory
    mockQueueFactory = {
      getDefaultProvider: jest.fn(),
      getAvailableProviders: jest.fn(),
      getStats: jest.fn(),
      getJob: jest.fn()
    }
    
    // Set the worker manager
    setWorkerManager(mockWorkerManager)
    
    const queue = require('../config/queue')
    queue.getQueueFactory.mockReturnValue(mockQueueFactory)
  })

  describe('GET /queue/stats', () => {
    it('should return queue statistics successfully', async () => {
      const mockSystemStatus = {
        isRunning: true,
        worker: {
          isProcessing: true,
          currentJob: 'job-123'
        },
        queue: {
          waiting: 10,
          active: 2,
          completed: 100,
          failed: 3,
          total: 115
        },
        performance: {
          averageProcessingTime: 1.5,
          jobsPerSecond: 0.5
        },
        timestamp: new Date().toISOString()
      }
      
      mockWorkerManager.getSystemStatus.mockResolvedValue(mockSystemStatus)
      
      const response = await request(app)
        .get('/queue/stats')
        .expect(200)
      
      expect(response.body).toEqual({
        success: true,
        data: mockSystemStatus,
        timestamp: expect.any(String)
      })
      
      expect(mockWorkerManager.getSystemStatus).toHaveBeenCalled()
    })

    it('should handle worker manager errors', async () => {
      mockWorkerManager.getSystemStatus.mockRejectedValue(
        new Error('Worker manager unavailable')
      )
      
      const response = await request(app)
        .get('/queue/stats')
        .expect(500)
      
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to get queue statistics'
      })
    })

    it('should return minimal stats when system is idle', async () => {
      const mockIdleStatus = {
        isRunning: false,
        worker: {
          isProcessing: false
        },
        queue: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          total: 0
        },
        timestamp: new Date().toISOString()
      }
      
      mockWorkerManager.getSystemStatus.mockResolvedValue(mockIdleStatus)
      
      const response = await request(app)
        .get('/queue/stats')
        .expect(200)
      
      expect(response.body.data.queue.total).toBe(0)
      expect(response.body.data.isRunning).toBe(false)
    })
  })

  describe('GET /queue/job/:jobId', () => {
    it('should return job details successfully', async () => {
      const jobId = 'job-123'
      const mockJob = {
        id: jobId,
        status: 'completed',
        data: {
          userId: 'user-456',
          saleId: 'sale-789'
        },
        progress: 100,
        result: {
          success: true,
          orderId: 'order-111'
        }
      }
      
      const queue = require('../config/queue')
      queue.getJob.mockResolvedValue(mockJob)
      
      const response = await request(app)
        .get(`/queue/job/${jobId}`)
        .expect(200)
      
      expect(response.body).toEqual({
        success: true,
        data: mockJob
      })
      
      expect(queue.getJob).toHaveBeenCalledWith(jobId)
    })

    it('should handle non-existent job', async () => {
      const jobId = 'non-existent-job'
      
      const queue = require('../config/queue')
      queue.getJob.mockResolvedValue(null)
      
      const response = await request(app)
        .get(`/queue/job/${jobId}`)
        .expect(404)
      
      expect(response.body).toEqual({
        error: 'Job not found'
      })
    })

    it('should validate jobId parameter', async () => {
      const response = await request(app)
        .get('/queue/job/')
        .expect(404) // Express will return 404 for missing route param
      
      // The route won't match without jobId
      expect(response.body).toBeDefined()
    })

    it('should handle job retrieval errors', async () => {
      const jobId = 'job-123'
      
      const queue = require('../config/queue')
      queue.getJob.mockRejectedValue(new Error('Database error'))
      
      const response = await request(app)
        .get(`/queue/job/${jobId}`)
        .expect(500)
      
      expect(response.body).toEqual({
        error: 'Failed to get job details'
      })
    })
  })

  describe('GET /queue/job/:jobId/status', () => {
    it('should return job status successfully', async () => {
      const jobId = 'job-123'
      const status = 'processing'
      
      const queue = require('../config/queue')
      queue.getJobStatus.mockResolvedValue(status)
      
      const response = await request(app)
        .get(`/queue/job/${jobId}/status`)
        .expect(200)
      
      expect(response.body).toEqual({
        success: true,
        data: {
          jobId,
          status
        }
      })
      
      expect(queue.getJobStatus).toHaveBeenCalledWith(jobId)
    })

    it('should handle status retrieval errors', async () => {
      const jobId = 'job-123'
      
      const queue = require('../config/queue')
      queue.getJobStatus.mockRejectedValue(new Error('Queue unavailable'))
      
      const response = await request(app)
        .get(`/queue/job/${jobId}/status`)
        .expect(500)
      
      expect(response.body).toEqual({
        error: 'Failed to get job status'
      })
    })

    it('should return not_found status for non-existent job', async () => {
      const jobId = 'non-existent-job'
      
      const queue = require('../config/queue')
      queue.getJobStatus.mockResolvedValue('not_found')
      
      const response = await request(app)
        .get(`/queue/job/${jobId}/status`)
        .expect(200)
      
      expect(response.body.data.status).toBe('not_found')
    })
  })

  describe('GET /queue/providers', () => {
    it('should return available queue providers', async () => {
      mockQueueFactory.getAvailableProviders.mockReturnValue(['bull', 'default'])
      
      const response = await request(app)
        .get('/queue/providers')
        .expect(200)
      
      expect(response.body).toEqual({
        success: true,
        data: {
          available: ['bull', 'default'],
          default: 'bull'
        }
      })
      
      expect(mockQueueFactory.getAvailableProviders).toHaveBeenCalled()
    })

    it('should handle provider retrieval errors', async () => {
      mockQueueFactory.getAvailableProviders.mockImplementation(() => {
        throw new Error('Queue factory not initialized')
      })
      
      const response = await request(app)
        .get('/queue/providers')
        .expect(500)
      
      expect(response.body).toEqual({
        error: 'Failed to get queue providers'
      })
    })

    it('should use environment variable for default provider', async () => {
      const originalEnv = process.env.QUEUE_PROVIDER
      process.env.QUEUE_PROVIDER = 'kafka'
      
      mockQueueFactory.getAvailableProviders.mockReturnValue(['bull', 'kafka', 'sqs'])
      
      const response = await request(app)
        .get('/queue/providers')
        .expect(200)
      
      expect(response.body.data.default).toBe('kafka')
      
      // Restore original env
      process.env.QUEUE_PROVIDER = originalEnv
    })
  })

  describe('GET /queue/health', () => {
    it('should return healthy status when system is running', async () => {
      const mockHealthStatus = {
        isRunning: true,
        worker: {
          isProcessing: true
        },
        queue: {
          waiting: 5,
          active: 2,
          completed: 50,
          failed: 1,
          total: 58
        }
      }
      
      mockWorkerManager.getSystemStatus.mockResolvedValue(mockHealthStatus)
      
      const response = await request(app)
        .get('/queue/health')
        .expect(200)
      
      expect(response.body).toEqual({
        status: 'healthy',
        system: mockHealthStatus,
        timestamp: expect.any(String)
      })
    })

    it('should return unhealthy status when system is not running', async () => {
      const mockUnhealthyStatus = {
        isRunning: false,
        worker: {
          isProcessing: false
        },
        queue: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          total: 0
        }
      }
      
      mockWorkerManager.getSystemStatus.mockResolvedValue(mockUnhealthyStatus)
      
      const response = await request(app)
        .get('/queue/health')
        .expect(200)
      
      expect(response.body.status).toBe('unhealthy')
    })

    it('should handle health check failures', async () => {
      mockWorkerManager.getSystemStatus.mockRejectedValue(
        new Error('Worker manager crashed')
      )
      
      const response = await request(app)
        .get('/queue/health')
        .expect(503)
      
      expect(response.body).toEqual({
        status: 'unhealthy',
        error: 'Worker manager crashed',
        timestamp: expect.any(String)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle worker manager not initialized', async () => {
      // Reset worker manager to null
      setWorkerManager(null)
      
      const response = await request(app)
        .get('/queue/stats')
        .expect(500)
      
      expect(response.body.error).toBe('Failed to get queue statistics')
    })

    it('should handle concurrent stats requests', async () => {
      const mockStatus = {
        isRunning: true,
        queue: { waiting: 10, active: 2, completed: 100, failed: 3, total: 115 }
      }
      
      mockWorkerManager.getSystemStatus.mockResolvedValue(mockStatus)
      
      // Simulate concurrent requests
      const requests = Array(5).fill().map(() => 
        request(app).get('/queue/stats')
      )
      
      const responses = await Promise.all(requests)
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.data.queue.total).toBe(115)
      })
      
      expect(mockWorkerManager.getSystemStatus).toHaveBeenCalledTimes(5)
    })

    it('should handle malformed queue stats', async () => {
      mockWorkerManager.getSystemStatus.mockResolvedValue({
        // Missing expected fields
        isRunning: true
      })
      
      const response = await request(app)
        .get('/queue/stats')
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.isRunning).toBe(true)
    })

    it('should handle queue factory initialization errors', async () => {
      const queue = require('../config/queue')
      queue.getQueueFactory.mockImplementation(() => {
        throw new Error('Queue factory not initialized')
      })
      
      const response = await request(app)
        .get('/queue/providers')
        .expect(500)
      
      expect(response.body.error).toBe('Failed to get queue providers')
    })
  })

  describe('Performance', () => {
    it('should respond quickly to health checks', async () => {
      mockWorkerManager.getSystemStatus.mockResolvedValue({
        isRunning: true,
        worker: { isProcessing: true },
        queue: { waiting: 0, active: 0, completed: 0, failed: 0, total: 0 }
      })
      
      const startTime = Date.now()
      await request(app).get('/queue/health').expect(200)
      const endTime = Date.now()
      
      // Should respond within 200ms
      expect(endTime - startTime).toBeLessThan(200)
    })

    it('should handle slow worker status retrieval', async () => {
      // Simulate slow response
      mockWorkerManager.getSystemStatus.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          isRunning: true,
          queue: { waiting: 10, active: 2, completed: 100, failed: 3, total: 115 }
        }), 100))
      )
      
      const response = await request(app)
        .get('/queue/stats')
        .expect(200)
      
      expect(response.body.success).toBe(true)
    })
  })

  describe('Test Environment Behavior', () => {
    it('should use mock worker manager in test environment', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'test'
      
      // Re-require the module to get test behavior
      jest.resetModules()
      const { router: testQueueRoutes } = require('./queue')
      
      const testApp = express()
      testApp.use('/queue', testQueueRoutes)
      
      // Should work without setting worker manager in test env
      request(testApp)
        .get('/queue/stats')
        .expect(200)
        .then(response => {
          expect(response.body).toBeDefined()
        })
      
      process.env.NODE_ENV = originalEnv
    })
  })
})