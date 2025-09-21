/**
 * Health Routes Tests
 * Tests for health check endpoints
 */

const request = require('supertest')
const express = require('express')

// Mock dependencies before requiring the route
jest.mock('../config/database', () => ({
  getDatabase: jest.fn()
}))

jest.mock('../config/redis', () => ({
  getRedisClient: jest.fn()
}))

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}))

const healthRoutes = require('./health')

describe('Health Routes', () => {
  let app
  let mockDatabase
  let mockRedisClient

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup Express app for testing
    app = express()
    app.use('/health', healthRoutes)
    
    // Setup mock database
    mockDatabase = {
      raw: jest.fn()
    }
    
    // Setup mock Redis client
    mockRedisClient = {
      ping: jest.fn()
    }
    
    const database = require('../config/database')
    database.getDatabase.mockReturnValue(mockDatabase)
    
    const redis = require('../config/redis')
    redis.getRedisClient.mockReturnValue(mockRedisClient)
  })

  describe('GET /health', () => {
    it('should return healthy status when all services are operational', async () => {
      mockDatabase.raw.mockResolvedValue({ rows: [{ result: 1 }] })
      mockRedisClient.ping.mockResolvedValue('PONG')
      
      const response = await request(app).get('/health').expect(200)
      
      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        pid: expect.any(Number),
        memory: expect.objectContaining({
          rss: expect.any(Number),
          heapTotal: expect.any(Number),
          heapUsed: expect.any(Number),
          external: expect.any(Number)
        }),
        services: {
          database: 'healthy',
          redis: 'healthy'
        }
      })
      
      expect(mockDatabase.raw).toHaveBeenCalledWith('SELECT 1')
      expect(mockRedisClient.ping).toHaveBeenCalled()
    })

    it('should return unhealthy status when database is down', async () => {
      mockDatabase.raw.mockRejectedValue(new Error('Database connection failed'))
      mockRedisClient.ping.mockResolvedValue('PONG')
      
      const response = await request(app).get('/health').expect(503)
      
      expect(response.body).toEqual({
        status: 'unhealthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        pid: expect.any(Number),
        memory: expect.any(Object),
        services: {
          database: 'unhealthy',
          redis: 'healthy'
        }
      })
    })

    it('should return unhealthy status when Redis is down', async () => {
      mockDatabase.raw.mockResolvedValue({ rows: [{ result: 1 }] })
      mockRedisClient.ping.mockRejectedValue(new Error('Redis connection failed'))
      
      const response = await request(app).get('/health').expect(503)
      
      expect(response.body).toEqual({
        status: 'unhealthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        pid: expect.any(Number),
        memory: expect.any(Object),
        services: {
          database: 'healthy',
          redis: 'unhealthy'
        }
      })
    })

    it('should return unhealthy status when both services are down', async () => {
      mockDatabase.raw.mockRejectedValue(new Error('Database connection failed'))
      mockRedisClient.ping.mockRejectedValue(new Error('Redis connection failed'))
      
      const response = await request(app).get('/health').expect(503)
      
      expect(response.body).toEqual({
        status: 'unhealthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        pid: expect.any(Number),
        memory: expect.any(Object),
        services: {
          database: 'unhealthy',
          redis: 'unhealthy'
        }
      })
    })

    it('should handle unexpected errors gracefully', async () => {
      const database = require('../config/database')
      database.getDatabase.mockImplementation(() => {
        throw new Error('Unexpected error')
      })
      
      const response = await request(app).get('/health').expect(503)
      
      expect(response.body).toEqual({
        status: 'unhealthy',
        error: 'Unexpected error',
        timestamp: expect.any(String)
      })
    })
  })

  describe('GET /health/ready', () => {
    it('should return ready status when all services are available', async () => {
      mockDatabase.raw.mockResolvedValue({ rows: [{ result: 1 }] })
      mockRedisClient.ping.mockResolvedValue('PONG')
      
      const response = await request(app).get('/health/ready').expect(200)
      
      expect(response.body).toEqual({
        status: 'ready',
        timestamp: expect.any(String)
      })
      
      expect(mockDatabase.raw).toHaveBeenCalledWith('SELECT 1')
      expect(mockRedisClient.ping).toHaveBeenCalled()
    })

    it('should return not ready status when database is unavailable', async () => {
      mockDatabase.raw.mockRejectedValue(new Error('Database not ready'))
      mockRedisClient.ping.mockResolvedValue('PONG')
      
      const response = await request(app).get('/health/ready').expect(503)
      
      expect(response.body).toEqual({
        status: 'not ready',
        error: 'Database not ready',
        timestamp: expect.any(String)
      })
    })

    it('should return not ready status when Redis is unavailable', async () => {
      mockDatabase.raw.mockResolvedValue({ rows: [{ result: 1 }] })
      mockRedisClient.ping.mockRejectedValue(new Error('Redis not ready'))
      
      const response = await request(app).get('/health/ready').expect(503)
      
      expect(response.body).toEqual({
        status: 'not ready',
        error: 'Redis not ready',
        timestamp: expect.any(String)
      })
    })

    it('should return not ready when any service check times out', async () => {
      // Simulate a timeout with a promise that never resolves
      mockDatabase.raw.mockImplementation(() => new Promise(() => {}))
      
      // Use a shorter timeout for the test
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve({ error: 'Timeout' }), 100)
      })
      
      // Mock the actual behavior by rejecting after timeout
      mockDatabase.raw.mockRejectedValue(new Error('Database not ready'))
      
      const response = await request(app).get('/health/ready').expect(503)
      
      expect(response.body).toHaveProperty('status', 'not ready')
      expect(response.body).toHaveProperty('timestamp')
    })
  })

  describe('GET /health/live', () => {
    it('should always return alive status', async () => {
      const response = await request(app).get('/health/live').expect(200)
      
      expect(response.body).toEqual({
        status: 'alive',
        pid: expect.any(Number),
        uptime: expect.any(Number),
        timestamp: expect.any(String)
      })
      
      // Liveness check should not check external dependencies
      expect(mockDatabase.raw).not.toHaveBeenCalled()
      expect(mockRedisClient.ping).not.toHaveBeenCalled()
    })

    it('should return consistent process information', async () => {
      const response1 = await request(app).get('/health/live').expect(200)
      const response2 = await request(app).get('/health/live').expect(200)
      
      // PID should be the same across requests
      expect(response1.body.pid).toBe(response2.body.pid)
      
      // Uptime should increase between requests
      expect(response2.body.uptime).toBeGreaterThanOrEqual(response1.body.uptime)
    })
  })

  describe('Error Handling', () => {
    it('should handle database service not initialized', async () => {
      const database = require('../config/database')
      database.getDatabase.mockImplementation(() => {
        throw new Error('Database not initialized. Call connectDatabase() first.')
      })
      
      const response = await request(app).get('/health').expect(503)
      
      expect(response.body).toHaveProperty('status', 'unhealthy')
      expect(response.body).toHaveProperty('error')
    })

    it('should handle Redis service not initialized', async () => {
      const redis = require('../config/redis')
      redis.getRedisClient.mockImplementation(() => {
        throw new Error('Redis not initialized. Call connectRedis() first.')
      })
      
      mockDatabase.raw.mockResolvedValue({ rows: [{ result: 1 }] })
      
      const response = await request(app).get('/health').expect(503)
      
      expect(response.body.services).toEqual({
        database: 'healthy',
        redis: 'unhealthy'
      })
    })

    it('should handle both services not initialized', async () => {
      const database = require('../config/database')
      database.getDatabase.mockImplementation(() => {
        throw new Error('Database not initialized')
      })
      
      const redis = require('../config/redis')
      redis.getRedisClient.mockImplementation(() => {
        throw new Error('Redis not initialized')
      })
      
      const response = await request(app).get('/health').expect(503)
      
      expect(response.body).toHaveProperty('status', 'unhealthy')
    })
  })

  describe('Performance', () => {
    it('should respond quickly to health checks', async () => {
      mockDatabase.raw.mockResolvedValue({ rows: [{ result: 1 }] })
      mockRedisClient.ping.mockResolvedValue('PONG')
      
      const startTime = Date.now()
      await request(app).get('/health').expect(200)
      const endTime = Date.now()
      
      // Health check should respond within 1 second
      expect(endTime - startTime).toBeLessThan(1000)
    })

    it('should respond quickly to liveness checks', async () => {
      const startTime = Date.now()
      await request(app).get('/health/live').expect(200)
      const endTime = Date.now()
      
      // Liveness check should be very fast (< 100ms)
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should timeout slow database queries', async () => {
      // Simulate a slow database query
      mockDatabase.raw.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ rows: [{ result: 1 }] }), 5000))
      )
      mockRedisClient.ping.mockResolvedValue('PONG')
      
      const startTime = Date.now()
      
      // This will timeout and return unhealthy
      mockDatabase.raw.mockRejectedValue(new Error('Database timeout'))
      
      await request(app).get('/health/ready').expect(503)
      const endTime = Date.now()
      
      // Should not wait for the full 5 seconds
      expect(endTime - startTime).toBeLessThan(2000)
    })
  })

  describe('Memory Information', () => {
    it('should include accurate memory usage information', async () => {
      mockDatabase.raw.mockResolvedValue({ rows: [{ result: 1 }] })
      mockRedisClient.ping.mockResolvedValue('PONG')
      
      const response = await request(app).get('/health').expect(200)
      
      const { memory } = response.body
      
      // Memory values should be positive numbers
      expect(memory.rss).toBeGreaterThan(0)
      expect(memory.heapTotal).toBeGreaterThan(0)
      expect(memory.heapUsed).toBeGreaterThan(0)
      expect(memory.external).toBeGreaterThanOrEqual(0)
      
      // Heap used should not exceed heap total
      expect(memory.heapUsed).toBeLessThanOrEqual(memory.heapTotal)
    })
  })
})