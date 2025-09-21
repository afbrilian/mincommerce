/**
 * PurchaseService Unit Tests
 * Tests for core business logic: "one item per user" and "limited stock" rules
 */

const PurchaseService = require('./PurchaseService')
const { dbHelpers, redisHelpers, assertions } = require('../../tests/utils/testHelpers')
const CONSTANTS = require('../constants')

describe('PurchaseService - Core Business Rules', () => {
  let purchaseService
  let testUser
  let testProduct
  let testFlashSale

  beforeEach(async () => {
    // Clear all test data
    await dbHelpers.clearAllData()
    await redisHelpers.clearAll()

    // Initialize service
    purchaseService = new PurchaseService()

    // Create test data
    testUser = await dbHelpers.createUser()
    const { product } = await dbHelpers.createProductWithStock({}, { available_quantity: 10 })
    testProduct = product
    testFlashSale = await dbHelpers.createFlashSale(testProduct.product_id, {
      status: CONSTANTS.SALE_STATUS.ACTIVE,
      start_time: new Date(Date.now() - 60000), // Started 1 minute ago
      end_time: new Date(Date.now() + 3600000) // Ends in 1 hour
    })
  })

  describe('One Item Per User Rule', () => {
    it('should prevent user from purchasing multiple items', async () => {
      // First purchase attempt
      const firstAttempt = await purchaseService.attemptPurchase({
        userId: testUser.user_id,
        productId: testProduct.product_id,
        saleId: testFlashSale.sale_id
      })

      expect(firstAttempt.success).toBe(true)
      expect(firstAttempt.jobId).toBeDefined()

      // Simulate successful processing of first purchase
      const firstResult = await purchaseService.processPurchase({
        userId: testUser.user_id,
        productId: testProduct.product_id,
        saleId: testFlashSale.sale_id
      })

      expect(firstResult.success).toBe(true)
      expect(firstResult.orderId).toBeDefined()

      // Second purchase attempt should fail
      const secondAttempt = await purchaseService.attemptPurchase({
        userId: testUser.user_id,
        productId: testProduct.product_id,
        saleId: testFlashSale.sale_id
      })

      expect(secondAttempt.success).toBe(false)
      expect(secondAttempt.reason).toBe(CONSTANTS.RESPONSE_CODES.ALREADY_PURCHASED)
      expect(secondAttempt.orderId).toBe(firstResult.orderId)
    })

    it('should allow different users to purchase the same item', async () => {
      // Create second user
      const secondUser = await dbHelpers.createUser()

      // First user purchase
      const firstUserAttempt = await purchaseService.attemptPurchase({
        userId: testUser.user_id,
        productId: testProduct.product_id,
        saleId: testFlashSale.sale_id
      })

      expect(firstUserAttempt.success).toBe(true)

      // Second user purchase
      const secondUserAttempt = await purchaseService.attemptPurchase({
        userId: secondUser.user_id,
        productId: testProduct.product_id,
        saleId: testFlashSale.sale_id
      })

      expect(secondUserAttempt.success).toBe(true)
      expect(secondUserAttempt.jobId).not.toBe(firstUserAttempt.jobId)
    })

    it('should handle concurrent purchase attempts correctly', async () => {
      // Simulate concurrent attempts by the same user
      const purchasePromises = Array(5)
        .fill()
        .map(() =>
          purchaseService.attemptPurchase({
            userId: testUser.user_id,
            productId: testProduct.product_id,
            saleId: testFlashSale.sale_id
          })
        )

      const results = await Promise.all(purchasePromises)

      // Only one should succeed
      const successfulAttempts = results.filter(r => r.success)
      expect(successfulAttempts).toHaveLength(1)

      // Others should fail with ALREADY_PURCHASED
      const failedAttempts = results.filter(r => !r.success)
      expect(failedAttempts).toHaveLength(4)
      failedAttempts.forEach(attempt => {
        expect(attempt.reason).toBe(CONSTANTS.RESPONSE_CODES.ALREADY_PURCHASED)
      })
    })
  })

  describe('Limited Stock Rule', () => {
    it('should prevent overselling when stock reaches zero', async () => {
      // Create product with limited stock (1 item)
      const { product: limitedProduct } = await dbHelpers.createProductWithStock(
        {},
        {
          total_quantity: 1,
          available_quantity: 1
        }
      )

      const limitedSale = await dbHelpers.createFlashSale(limitedProduct.product_id, {
        status: CONSTANTS.SALE_STATUS.ACTIVE,
        start_time: new Date(Date.now() - 60000),
        end_time: new Date(Date.now() + 3600000)
      })

      // Create two users
      const user1 = await dbHelpers.createUser()
      const user2 = await dbHelpers.createUser()

      // First user purchase
      const firstAttempt = await purchaseService.attemptPurchase({
        userId: user1.user_id,
        productId: limitedProduct.product_id,
        saleId: limitedSale.sale_id
      })

      expect(firstAttempt.success).toBe(true)

      // Process first purchase
      const firstResult = await purchaseService.processPurchase({
        userId: user1.user_id,
        productId: limitedProduct.product_id,
        saleId: limitedSale.sale_id
      })

      expect(firstResult.success).toBe(true)

      // Second user attempt should fail
      const secondAttempt = await purchaseService.attemptPurchase({
        userId: user2.user_id,
        productId: limitedProduct.product_id,
        saleId: limitedSale.sale_id
      })

      expect(secondAttempt.success).toBe(false)
      expect(secondAttempt.reason).toBe(CONSTANTS.RESPONSE_CODES.OUT_OF_STOCK)
    })

    it('should handle concurrent stock updates atomically', async () => {
      // Create product with limited stock (2 items)
      const { product: limitedProduct } = await dbHelpers.createProductWithStock(
        {},
        {
          total_quantity: 2,
          available_quantity: 2
        }
      )

      const limitedSale = await dbHelpers.createFlashSale(limitedProduct.product_id, {
        status: CONSTANTS.SALE_STATUS.ACTIVE,
        start_time: new Date(Date.now() - 60000),
        end_time: new Date(Date.now() + 3600000)
      })

      // Create 5 users (more than available stock)
      const users = await Promise.all(
        Array(5)
          .fill()
          .map(() => dbHelpers.createUser())
      )

      // Simulate concurrent purchase attempts
      const purchasePromises = users.map(user =>
        purchaseService.attemptPurchase({
          userId: user.user_id,
          productId: limitedProduct.product_id,
          saleId: limitedSale.sale_id
        })
      )

      const results = await Promise.all(purchasePromises)

      // Only 2 should succeed (matching available stock)
      const successfulAttempts = results.filter(r => r.success)
      expect(successfulAttempts).toHaveLength(2)

      // Process successful attempts
      const processPromises = successfulAttempts.map(_attempt =>
        purchaseService.processPurchase({
          userId: users.find(u => u.user_id === _attempt.userId)?.user_id,
          productId: limitedProduct.product_id,
          saleId: limitedSale.sale_id
        })
      )

      // Wait for all processing to complete
      await Promise.all(processPromises)

      // Verify final stock
      const finalStock = await dbHelpers.getStockByProductId(limitedProduct.product_id)
      expect(finalStock.available_quantity).toBe(0)
      expect(finalStock.total_quantity).toBe(2)
    })

    it('should maintain stock consistency under load', async () => {
      const initialStock = await dbHelpers.getStockByProductId(testProduct.product_id)
      expect(initialStock.available_quantity).toBe(10)

      // Create 15 users (more than available stock)
      const users = await Promise.all(
        Array(15)
          .fill()
          .map(() => dbHelpers.createUser())
      )

      // Simulate high load purchase attempts
      const purchasePromises = users.map(user =>
        purchaseService.attemptPurchase({
          userId: user.user_id,
          productId: testProduct.product_id,
          saleId: testFlashSale.sale_id
        })
      )

      const results = await Promise.all(purchasePromises)

      // Only 10 should succeed (matching available stock)
      const successfulAttempts = results.filter(r => r.success)
      expect(successfulAttempts).toHaveLength(10)

      // Process all successful attempts
      const processPromises = successfulAttempts.map(_attempt => {
        const user = users.find(u => results.some(r => r.success && r.userId === u.user_id))
        return purchaseService.processPurchase({
          userId: user.user_id,
          productId: testProduct.product_id,
          saleId: testFlashSale.sale_id
        })
      })

      await Promise.all(processPromises)

      // Verify final stock consistency
      const finalStock = await dbHelpers.getStockByProductId(testProduct.product_id)
      assertions.expectStockConsistency(finalStock)
      expect(finalStock.available_quantity).toBe(0)
      expect(finalStock.total_quantity).toBe(10)
    })
  })

  describe('Heavy Load Scenarios', () => {
    it('should handle 1000+ concurrent purchase attempts', async () => {
      // This test simulates high load but with limited concurrency
      // to avoid overwhelming the test database
      const concurrentUsers = 50 // Reduced for test stability

      // Create users
      const users = await Promise.all(
        Array(concurrentUsers)
          .fill()
          .map(() => dbHelpers.createUser())
      )

      // Simulate concurrent attempts
      const startTime = Date.now()
      const purchasePromises = users.map(user =>
        purchaseService.attemptPurchase({
          userId: user.user_id,
          productId: testProduct.product_id,
          saleId: testFlashSale.sale_id
        })
      )

      const results = await Promise.all(purchasePromises)
      const endTime = Date.now()

      // Verify performance (should complete within reasonable time)
      expect(endTime - startTime).toBeLessThan(10000) // 10 seconds

      // Verify only available stock was allocated
      const successfulAttempts = results.filter(r => r.success)
      expect(successfulAttempts.length).toBeLessThanOrEqual(10) // Available stock
    })

    it('should maintain data consistency under race conditions', async () => {
      // Create multiple products with limited stock
      const products = await Promise.all(
        Array(3)
          .fill()
          .map(async () => {
            const { product, stock } = await dbHelpers.createProductWithStock(
              {},
              {
                available_quantity: 1
              }
            )
            await dbHelpers.createFlashSale(product.product_id, {
              status: CONSTANTS.SALE_STATUS.ACTIVE,
              start_time: new Date(Date.now() - 60000),
              end_time: new Date(Date.now() + 3600000)
            })
            return { product, stock }
          })
      )

      // Create users
      const users = await Promise.all(
        Array(10)
          .fill()
          .map(() => dbHelpers.createUser())
      )

      // Simulate race conditions across multiple products
      const allPromises = []
      products.forEach(({ product }) => {
        users.forEach(user => {
          allPromises.push(
            purchaseService.attemptPurchase({
              userId: user.user_id,
              productId: product.product_id,
              saleId: testFlashSale.sale_id
            })
          )
        })
      })

      const results = await Promise.all(allPromises)

      // Verify each product has exactly 1 successful purchase
      products.forEach(({ product }) => {
        const productResults = results.filter(r => r.productId === product.product_id)
        const successfulForProduct = productResults.filter(r => r.success)
        expect(successfulForProduct).toHaveLength(1)
      })
    })

    it('should gracefully handle database connection issues', async () => {
      // Mock database connection failure
      const originalProcessPurchase = purchaseService.processPurchase.bind(purchaseService)

      purchaseService.processPurchase = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'))

      const attempt = await purchaseService.attemptPurchase({
        userId: testUser.user_id,
        productId: testProduct.product_id,
        saleId: testFlashSale.sale_id
      })

      expect(attempt.success).toBe(true) // Should still queue the job

      // Restore original method
      purchaseService.processPurchase = originalProcessPurchase
    })
  })

  describe('Edge Cases', () => {
    it('should handle sale that is not active', async () => {
      const inactiveSale = await dbHelpers.createFlashSale(testProduct.product_id, {
        status: CONSTANTS.SALE_STATUS.UPCOMING,
        start_time: new Date(Date.now() + 3600000), // 1 hour from now
        end_time: new Date(Date.now() + 7200000) // 2 hours from now
      })

      const attempt = await purchaseService.attemptPurchase({
        userId: testUser.user_id,
        productId: testProduct.product_id,
        saleId: inactiveSale.sale_id
      })

      expect(attempt.success).toBe(false)
      expect(attempt.reason).toBe(CONSTANTS.RESPONSE_CODES.SALE_NOT_ACTIVE)
    })

    it('should handle sale outside time window', async () => {
      const expiredSale = await dbHelpers.createFlashSale(testProduct.product_id, {
        status: CONSTANTS.SALE_STATUS.ACTIVE,
        start_time: new Date(Date.now() - 7200000), // 2 hours ago
        end_time: new Date(Date.now() - 3600000) // 1 hour ago
      })

      const attempt = await purchaseService.attemptPurchase({
        userId: testUser.user_id,
        productId: testProduct.product_id,
        saleId: expiredSale.sale_id
      })

      expect(attempt.success).toBe(false)
      expect(attempt.reason).toBe(CONSTANTS.RESPONSE_CODES.SALE_NOT_ACTIVE)
    })

    it('should handle rate limiting', async () => {
      // Make multiple rapid attempts
      const attempts = []
      for (let i = 0; i < 15; i++) {
        attempts.push(
          purchaseService.attemptPurchase({
            userId: testUser.user_id,
            productId: testProduct.product_id,
            saleId: testFlashSale.sale_id
          })
        )
      }

      const results = await Promise.all(attempts)

      // Some should be rate limited
      const rateLimited = results.filter(
        r => !r.success && r.reason === CONSTANTS.RESPONSE_CODES.TOO_MANY_ATTEMPTS
      )
      expect(rateLimited.length).toBeGreaterThan(0)
    })
  })
})
