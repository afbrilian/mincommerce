/**
 * Flash Sale Routes Tests
 * Tests for public flash sale endpoints
 */

const request = require('supertest')
const express = require('express')
const CONSTANTS = require('../constants')

// Mock dependencies
jest.mock('../services/FlashSaleService')
jest.mock('../services/AuthService')
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}))

const flashSaleRoutes = require('./flashSale')
const FlashSaleService = require('../services/FlashSaleService')
const AuthService = require('../services/AuthService')

describe('Flash Sale Routes', () => {
  let app
  let mockFlashSaleService
  let mockAuthService

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup Express app for testing
    app = express()
    app.use(express.json())
    app.use('/flash-sale', flashSaleRoutes)
    
    // Setup mock services
    mockFlashSaleService = {
      getSaleStatus: jest.fn(),
      checkUserPurchaseEligibility: jest.fn(),
      getSaleStatistics: jest.fn()
    }
    
    mockAuthService = {
      optionalAuthenticateMiddleware: jest.fn((req, res, next) => {
        // Default to no authentication
        req.user = null
        next()
      }),
      verifyToken: jest.fn()
    }
    
    FlashSaleService.mockImplementation(() => mockFlashSaleService)
    AuthService.mockImplementation(() => mockAuthService)
  })

  describe('GET /flash-sale/status', () => {
    it('should return active flash sale status without authentication', async () => {
      const mockSaleStatus = {
        saleId: 'sale-123',
        status: CONSTANTS.SALE_STATUS.ACTIVE,
        productId: 'product-456',
        productName: 'Limited Edition Item',
        productDescription: 'Amazing product',
        productPrice: 99.99,
        availableQuantity: 100,
        timeUntilStart: -3600, // Started 1 hour ago
        timeUntilEnd: 3600 // Ends in 1 hour
      }
      
      mockFlashSaleService.getSaleStatus.mockResolvedValue(mockSaleStatus)
      
      const response = await request(app)
        .get('/flash-sale/status')
        .expect(200)
      
      expect(response.body).toEqual({
        success: true,
        data: {
          ...mockSaleStatus,
          userPurchaseEligibility: null
        }
      })
      
      expect(mockFlashSaleService.getSaleStatus).toHaveBeenCalled()
      expect(mockFlashSaleService.checkUserPurchaseEligibility).not.toHaveBeenCalled()
    })

    it('should include user purchase eligibility when authenticated', async () => {
      const userId = 'user-123'
      const mockSaleStatus = {
        saleId: 'sale-123',
        status: CONSTANTS.SALE_STATUS.ACTIVE,
        productId: 'product-456',
        productName: 'Limited Edition Item',
        productDescription: 'Amazing product',
        productPrice: 99.99,
        availableQuantity: 100
      }
      
      const mockEligibility = {
        eligible: true,
        hasPurchased: false,
        reason: null
      }
      
      // Setup authenticated request
      mockAuthService.optionalAuthenticateMiddleware.mockImplementation((req, res, next) => {
        req.user = { userId, email: 'user@example.com', userType: 'user' }
        next()
      })
      
      mockFlashSaleService.getSaleStatus.mockResolvedValue(mockSaleStatus)
      mockFlashSaleService.checkUserPurchaseEligibility.mockResolvedValue(mockEligibility)
      
      const response = await request(app)
        .get('/flash-sale/status')
        .set('Authorization', 'Bearer valid-token')
        .expect(200)
      
      expect(response.body).toEqual({
        success: true,
        data: {
          ...mockSaleStatus,
          userPurchaseEligibility: mockEligibility
        }
      })
      
      expect(mockFlashSaleService.checkUserPurchaseEligibility).toHaveBeenCalledWith(userId)
    })

    it('should return upcoming sale status', async () => {
      const mockSaleStatus = {
        saleId: 'sale-123',
        status: CONSTANTS.SALE_STATUS.UPCOMING,
        productId: 'product-456',
        productName: 'Limited Edition Item',
        productPrice: 99.99,
        availableQuantity: 100,
        timeUntilStart: 3600, // Starts in 1 hour
        timeUntilEnd: 7200 // Ends in 2 hours
      }
      
      mockFlashSaleService.getSaleStatus.mockResolvedValue(mockSaleStatus)
      
      const response = await request(app)
        .get('/flash-sale/status')
        .expect(200)
      
      expect(response.body.data.status).toBe(CONSTANTS.SALE_STATUS.UPCOMING)
      expect(response.body.data.timeUntilStart).toBeGreaterThan(0)
    })

    it('should return ended sale status', async () => {
      const mockSaleStatus = {
        saleId: 'sale-123',
        status: CONSTANTS.SALE_STATUS.ENDED,
        productId: 'product-456',
        productName: 'Limited Edition Item',
        productPrice: 99.99,
        availableQuantity: 0,
        timeUntilStart: -7200, // Started 2 hours ago
        timeUntilEnd: -3600 // Ended 1 hour ago
      }
      
      mockFlashSaleService.getSaleStatus.mockResolvedValue(mockSaleStatus)
      
      const response = await request(app)
        .get('/flash-sale/status')
        .expect(200)
      
      expect(response.body.data.status).toBe(CONSTANTS.SALE_STATUS.ENDED)
      expect(response.body.data.timeUntilEnd).toBeLessThan(0)
    })

    it('should handle no active flash sale', async () => {
      mockFlashSaleService.getSaleStatus.mockResolvedValue(null)
      
      const response = await request(app)
        .get('/flash-sale/status')
        .expect(200)
      
      expect(response.body).toEqual({
        success: true,
        data: null,
        message: 'No active flash sale found'
      })
    })

    it('should handle service error gracefully', async () => {
      mockFlashSaleService.getSaleStatus.mockRejectedValue(new Error('Database error'))
      
      const response = await request(app)
        .get('/flash-sale/status')
        .expect(500)
      
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to get flash sale status'
      })
    })

    it('should handle "No flash sale found" error', async () => {
      mockFlashSaleService.getSaleStatus.mockRejectedValue(new Error('No flash sale found'))
      
      const response = await request(app)
        .get('/flash-sale/status')
        .expect(200)
      
      expect(response.body).toEqual({
        success: true,
        data: null,
        message: 'No flash sale found'
      })
    })

    it('should handle invalid authentication token gracefully', async () => {
      // Mock auth middleware to simulate invalid token (but optional, so continues)
      mockAuthService.optionalAuthenticateMiddleware.mockImplementation((req, res, next) => {
        req.user = null // Invalid token results in no user
        next()
      })
      
      const mockSaleStatus = {
        saleId: 'sale-123',
        status: CONSTANTS.SALE_STATUS.ACTIVE,
        productId: 'product-456'
      }
      
      mockFlashSaleService.getSaleStatus.mockResolvedValue(mockSaleStatus)
      
      const response = await request(app)
        .get('/flash-sale/status')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200)
      
      expect(response.body.data.userPurchaseEligibility).toBeNull()
      expect(mockFlashSaleService.checkUserPurchaseEligibility).not.toHaveBeenCalled()
    })
  })

  describe('GET /flash-sale/stats', () => {
    it('should return flash sale statistics with valid saleId', async () => {
      const saleId = 'sale-123'
      const mockStats = {
        totalOrders: 150,
        confirmedOrders: 145,
        pendingOrders: 5,
        totalQuantity: 1000,
        availableQuantity: 850,
        revenue: 14950.55
      }
      
      mockFlashSaleService.getSaleStatistics.mockResolvedValue(mockStats)
      
      const response = await request(app)
        .get('/flash-sale/stats')
        .query({ saleId })
        .expect(200)
      
      expect(response.body).toEqual(mockStats)
      expect(mockFlashSaleService.getSaleStatistics).toHaveBeenCalledWith(saleId)
    })

    it('should require saleId query parameter', async () => {
      const response = await request(app)
        .get('/flash-sale/stats')
        .expect(400)
      
      expect(response.body).toEqual({
        success: false,
        error: 'saleId query parameter is required'
      })
      
      expect(mockFlashSaleService.getSaleStatistics).not.toHaveBeenCalled()
    })

    it('should handle non-existent flash sale', async () => {
      const saleId = 'non-existent-sale'
      
      mockFlashSaleService.getSaleStatistics.mockRejectedValue(
        new Error('Flash sale not found')
      )
      
      const response = await request(app)
        .get('/flash-sale/stats')
        .query({ saleId })
        .expect(404)
      
      expect(response.body).toEqual({
        success: false,
        error: 'Flash sale not found'
      })
    })

    it('should handle service errors', async () => {
      const saleId = 'sale-123'
      
      mockFlashSaleService.getSaleStatistics.mockRejectedValue(
        new Error('Database connection failed')
      )
      
      const response = await request(app)
        .get('/flash-sale/stats')
        .query({ saleId })
        .expect(500)
      
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to get flash sale statistics'
      })
    })

    it('should handle invalid saleId format', async () => {
      const saleId = 'invalid-format'
      
      mockFlashSaleService.getSaleStatistics.mockRejectedValue(
        new Error('Invalid sale ID format')
      )
      
      const response = await request(app)
        .get('/flash-sale/stats')
        .query({ saleId })
        .expect(500)
      
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to get flash sale statistics'
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty flash sale data gracefully', async () => {
      mockFlashSaleService.getSaleStatus.mockResolvedValue({})
      
      const response = await request(app)
        .get('/flash-sale/status')
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual({ userPurchaseEligibility: null })
    })

    it('should handle malformed sale status data', async () => {
      mockFlashSaleService.getSaleStatus.mockResolvedValue({
        saleId: 'sale-123',
        // Missing required fields
        productName: undefined,
        availableQuantity: null
      })
      
      const response = await request(app)
        .get('/flash-sale/status')
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.saleId).toBe('sale-123')
    })

    it('should handle eligibility check failure gracefully', async () => {
      const mockSaleStatus = {
        saleId: 'sale-123',
        status: CONSTANTS.SALE_STATUS.ACTIVE
      }
      
      mockAuthService.optionalAuthenticateMiddleware.mockImplementation((req, res, next) => {
        req.user = { userId: 'user-123' }
        next()
      })
      
      mockFlashSaleService.getSaleStatus.mockResolvedValue(mockSaleStatus)
      mockFlashSaleService.checkUserPurchaseEligibility.mockRejectedValue(
        new Error('Eligibility check failed')
      )
      
      const response = await request(app)
        .get('/flash-sale/status')
        .set('Authorization', 'Bearer token')
        .expect(200)
      
      // Should still return sale status even if eligibility check fails
      expect(response.body.success).toBe(true)
      expect(response.body.data.saleId).toBe('sale-123')
    })

    it('should handle concurrent requests', async () => {
      const mockSaleStatus = {
        saleId: 'sale-123',
        status: CONSTANTS.SALE_STATUS.ACTIVE,
        availableQuantity: 100
      }
      
      mockFlashSaleService.getSaleStatus.mockResolvedValue(mockSaleStatus)
      
      // Simulate concurrent requests
      const requests = Array(10).fill().map(() => 
        request(app).get('/flash-sale/status')
      )
      
      const responses = await Promise.all(requests)
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.data.saleId).toBe('sale-123')
      })
      
      // Service should be called for each request
      expect(mockFlashSaleService.getSaleStatus).toHaveBeenCalledTimes(10)
    })
  })

  describe('Performance', () => {
    it('should respond quickly to status requests', async () => {
      mockFlashSaleService.getSaleStatus.mockResolvedValue({
        saleId: 'sale-123',
        status: CONSTANTS.SALE_STATUS.ACTIVE
      })
      
      const startTime = Date.now()
      await request(app).get('/flash-sale/status').expect(200)
      const endTime = Date.now()
      
      // Should respond within 500ms
      expect(endTime - startTime).toBeLessThan(500)
    })

    it('should cache status results appropriately', async () => {
      // Note: This is testing expected behavior, actual caching is in service layer
      const mockSaleStatus = {
        saleId: 'sale-123',
        status: CONSTANTS.SALE_STATUS.ACTIVE
      }
      
      mockFlashSaleService.getSaleStatus.mockResolvedValue(mockSaleStatus)
      
      // Multiple rapid requests
      await request(app).get('/flash-sale/status').expect(200)
      await request(app).get('/flash-sale/status').expect(200)
      await request(app).get('/flash-sale/status').expect(200)
      
      // Service is called each time (caching is handled by service)
      expect(mockFlashSaleService.getSaleStatus).toHaveBeenCalledTimes(3)
    })
  })
})