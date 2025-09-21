/**
 * API Integration Tests
 * Tests the complete system end-to-end including:
 * - Authentication flow
 * - Admin operations
 * - User operations
 * - Queue processing
 * - Error handling
 */

const request = require('supertest')
const app = require('../../src/server')
const { dbHelpers, redisHelpers } = require('../utils/testHelpers')
const CONSTANTS = require('../../src/constants')

describe('API Integration Tests', () => {
  let adminToken
  let userToken
  let testUser
  let testProduct
  let testFlashSale

  beforeAll(async () => {
    // Clear all test data
    await dbHelpers.clearAllData()
    await redisHelpers.clearAll()
  })

  beforeEach(async () => {
    // Clear data between tests
    await dbHelpers.clearAllData()
    await redisHelpers.clearAll()

    // Create admin user first
    await dbHelpers.createUser({
      email: 'admin@brilian.af',
      role: 'admin'
    })

    // Create test user
    testUser = await dbHelpers.createUser({
      email: 'integration-test@example.com',
      role: 'user'
    })

    // Create test product with stock
    const productData = await dbHelpers.createProductWithStock(
      {
        name: 'Integration Test Product',
        description: 'Product for integration testing',
        price: 99.99
      },
      {
        total_quantity: 100,
        available_quantity: 100,
        reserved_quantity: 0
      }
    )
    testProduct = productData.product

    // Get authentication tokens
    const authResponse = await request(app)
      .post('/auth/login')
      .send({ email: 'integration-test@example.com' })

    userToken = authResponse.body.token

    const adminResponse = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@brilian.af' })

    adminToken = adminResponse.body.token
  })

  afterEach(async () => {
    await dbHelpers.clearAllData()
    await redisHelpers.clearAll()
  })

  describe('Complete Flash Sale Flow', () => {
    it('should handle complete flash sale lifecycle from admin creation to user purchase', async () => {
      // Step 1: Admin creates flash sale
      const flashSaleResponse = await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.product_id,
          startTime: new Date(Date.now() - 60000), // Started 1 minute ago
          endTime: new Date(Date.now() + 7200000), // Ends in 2 hours
          status: CONSTANTS.SALE_STATUS.ACTIVE
        })
        .expect(200)

      expect(flashSaleResponse.body.success).toBe(true)
      expect(flashSaleResponse.body.data.saleId).toBeDefined()
      testFlashSale = flashSaleResponse.body.data

      // Step 2: User checks flash sale status
      const statusResponse = await request(app)
        .get('/flash-sale/status')
        .expect(200)

      expect(statusResponse.body.success).toBe(true)
      expect(statusResponse.body.data.status).toBe(CONSTANTS.SALE_STATUS.ACTIVE)
      expect(statusResponse.body.data.productId).toBe(testProduct.product_id)

      // Step 3: User attempts purchase
      const purchaseResponse = await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(202)

      expect(purchaseResponse.body.success).toBe(true)
      expect(purchaseResponse.body.data.jobId).toBeDefined()
      expect(purchaseResponse.body.data.status).toBe(CONSTANTS.PURCHASE_JOB_STATUS.QUEUED)

      // Step 4: User checks purchase status
      const purchaseStatusResponse = await request(app)
        .get('/purchase/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(purchaseStatusResponse.body.success).toBe(true)
      expect(purchaseStatusResponse.body.data.status).toBe(CONSTANTS.PURCHASE_JOB_STATUS.QUEUED)
      expect(purchaseStatusResponse.body.data.jobId).toBe(purchaseResponse.body.data.jobId)

      // Step 5: User checks job status by ID
      const jobStatusResponse = await request(app)
        .get(`/purchase/job/${purchaseResponse.body.data.jobId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(jobStatusResponse.body.success).toBe(true)
      expect(jobStatusResponse.body.data.jobId).toBe(purchaseResponse.body.data.jobId)

      // Step 6: Admin checks flash sale statistics
      const statsResponse = await request(app)
        .get(`/admin/flash-sale/${testFlashSale.saleId}/stats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(statsResponse.body.success).toBe(true)
      expect(statsResponse.body.data.totalQuantity).toBe(100)
    })

    it('should handle multiple users attempting purchase simultaneously', async () => {
      // Create flash sale
      const flashSaleResponse = await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.product_id,
          startTime: new Date(Date.now() - 60000),
          endTime: new Date(Date.now() + 7200000),
          status: CONSTANTS.SALE_STATUS.ACTIVE
        })
        .expect(200)

      // Create multiple test users
      const users = []
      const tokens = []
      for (let i = 0; i < 5; i++) {
        const user = await dbHelpers.createUser({
          email: `user${i}@integration.com`,
          role: 'user'
        })
        users.push(user)

        const authResponse = await request(app)
          .post('/auth/login')
          .send({ email: `user${i}@integration.com` })
        tokens.push(authResponse.body.token)
      }

      // All users attempt purchase simultaneously
      const purchasePromises = tokens.map(token =>
        request(app)
          .post('/purchase')
          .set('Authorization', `Bearer ${token}`)
          .expect(202)
      )

      const responses = await Promise.all(purchasePromises)

      // All should be queued successfully
      expect(responses.length).toBe(5)
      responses.forEach(response => {
        expect(response.body.success).toBe(true)
        expect(response.body.data.jobId).toBeDefined()
        expect(response.body.data.status).toBe(CONSTANTS.PURCHASE_JOB_STATUS.QUEUED)
      })

      // Verify no duplicate job IDs
      const jobIds = responses.map(r => r.body.data.jobId)
      const uniqueJobIds = [...new Set(jobIds)]
      expect(uniqueJobIds.length).toBe(5)
    })

    it('should handle sale lifecycle transitions correctly', async () => {
      // Create upcoming sale
      const upcomingResponse = await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.product_id,
          startTime: new Date(Date.now() + 60000), // Starts in 1 minute
          endTime: new Date(Date.now() + 7200000), // Ends in 2 hours
          status: CONSTANTS.SALE_STATUS.UPCOMING
        })
        .expect(200)

      // Check upcoming status
      const upcomingStatus = await request(app)
        .get('/flash-sale/status')
        .expect(200)

      expect(upcomingStatus.body.data.status).toBe(CONSTANTS.SALE_STATUS.UPCOMING)
      expect(upcomingStatus.body.data.timeUntilStart).toBeGreaterThan(0)

      // Update to active
      const activeResponse = await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          saleId: upcomingResponse.body.data.saleId,
          productId: testProduct.product_id,
          startTime: new Date(Date.now() - 60000), // Started 1 minute ago
          endTime: new Date(Date.now() + 7200000), // Ends in 2 hours
          status: CONSTANTS.SALE_STATUS.ACTIVE
        })
        .expect(200)

      // Check active status
      const activeStatus = await request(app)
        .get('/flash-sale/status')
        .expect(200)

      expect(activeStatus.body.data.status).toBe(CONSTANTS.SALE_STATUS.ACTIVE)

      // Update to ended
      const endedResponse = await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          saleId: upcomingResponse.body.data.saleId,
          productId: testProduct.product_id,
          startTime: new Date(Date.now() - 60000), // Started 1 minute ago
          endTime: new Date(Date.now() - 30000), // Ended 30 seconds ago
          status: CONSTANTS.SALE_STATUS.ENDED
        })
        .expect(200)

      // Check ended status
      const endedStatus = await request(app)
        .get('/flash-sale/status')
        .expect(200)

      expect(endedStatus.body.data.status).toBe(CONSTANTS.SALE_STATUS.ENDED)
    })
  })

  describe('Authentication Integration', () => {
    it('should handle admin and user authentication flows correctly', async () => {
      // Test admin authentication
      const adminResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'admin@brilian.af' })
        .expect(200)

      expect(adminResponse.body.success).toBe(true)
      expect(adminResponse.body.token).toBeDefined()
      expect(adminResponse.body.userType).toBe('admin')

      // Test user authentication
      const userResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'integration-test@example.com' })
        .expect(200)

      expect(userResponse.body.success).toBe(true)
      expect(userResponse.body.token).toBeDefined()
      expect(userResponse.body.userType).toBe('user')

      // Test auto user creation
      const newUserResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'newuser@integration.com' })
        .expect(200)

      expect(newUserResponse.body.success).toBe(true)
      expect(newUserResponse.body.userType).toBe('user')

      // Verify user was created
      const users = await dbHelpers.getUsers()
      const newUser = users.find(u => u.email === 'newuser@integration.com')
      expect(newUser).toBeDefined()
    })

    it('should protect admin endpoints correctly', async () => {
      // Test without token
      await request(app)
        .post('/admin/flash-sale')
        .send({ productId: testProduct.product_id })
        .expect(401)

      // Test with user token (should fail)
      await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ productId: testProduct.product_id })
        .expect(403)

      // Test with admin token (should succeed)
      await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.product_id,
          startTime: new Date(Date.now() - 60000),
          endTime: new Date(Date.now() + 7200000),
          status: CONSTANTS.SALE_STATUS.ACTIVE
        })
        .expect(200)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle invalid requests gracefully across all endpoints', async () => {
      // Invalid product ID
      await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: 'invalid-uuid',
          startTime: new Date(Date.now() - 60000),
          endTime: new Date(Date.now() + 7200000),
          status: CONSTANTS.SALE_STATUS.ACTIVE
        })
        .expect(400)

      // Invalid flash sale ID
      await request(app)
        .get('/admin/flash-sale/invalid-uuid/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400)

      // Non-existent job ID
      await request(app)
        .get('/purchase/job/non-existent-job-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404)

      // Invalid token
      await request(app)
        .get('/purchase/status')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
    })

    it('should handle database constraints and business logic errors', async () => {
      // Create flash sale
      await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.product_id,
          startTime: new Date(Date.now() - 60000),
          endTime: new Date(Date.now() + 7200000),
          status: CONSTANTS.SALE_STATUS.ACTIVE
        })
        .expect(200)

      // First purchase should be queued
      await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(202)

      // Second purchase from same user should fail
      await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(409)

      // Create flash sale for product without stock
      const productWithoutStock = await dbHelpers.createProduct({
        name: 'No Stock Product',
        price: 50.00
      })

      await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: productWithoutStock.product_id,
          startTime: new Date(Date.now() - 60000),
          endTime: new Date(Date.now() + 7200000),
          status: CONSTANTS.SALE_STATUS.ACTIVE
        })
        .expect(400)
    })
  })

  describe('Queue System Integration', () => {
    it('should process queue jobs and update status correctly', async () => {
      // Create flash sale
      await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.product_id,
          startTime: new Date(Date.now() - 60000),
          endTime: new Date(Date.now() + 7200000),
          status: CONSTANTS.SALE_STATUS.ACTIVE
        })
        .expect(200)

      // Queue purchase
      const purchaseResponse = await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(202)

      const jobId = purchaseResponse.body.data.jobId

      // Check queue statistics
      const queueStats = await request(app)
        .get('/queue/stats')
        .expect(200)

      expect(queueStats.body.success).toBe(true)
      expect(queueStats.body.data.queue).toBeDefined()

      // Check queue health
      const queueHealth = await request(app)
        .get('/queue/health')
        .expect(200)

      expect(queueHealth.body.status).toBe('healthy')
      expect(queueHealth.body.system.isRunning).toBe(true)

      // Verify job is tracked in Redis
      const jobStatus = await redisHelpers.getRedisClient().get(
        CONSTANTS.REDIS_KEYS.PURCHASE_JOB(jobId)
      )
      expect(jobStatus).toBeDefined()

      const userStatus = await redisHelpers.getRedisClient().get(
        CONSTANTS.REDIS_KEYS.PURCHASE_STATUS(testUser.user_id)
      )
      expect(userStatus).toBeDefined()
    })
  })

  describe('Performance Integration', () => {
    it('should handle rapid consecutive requests without issues', async () => {
      // Create flash sale
      await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.product_id,
          startTime: new Date(Date.now() - 60000),
          endTime: new Date(Date.now() + 7200000),
          status: CONSTANTS.SALE_STATUS.ACTIVE
        })
        .expect(200)

      // Make rapid consecutive status checks
      const statusPromises = Array(10).fill().map(() =>
        request(app).get('/flash-sale/status')
      )

      const responses = await Promise.all(statusPromises)

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })
    })

    it('should maintain data consistency under concurrent operations', async () => {
      // Create multiple users
      const users = []
      const tokens = []
      for (let i = 0; i < 3; i++) {
        const user = await dbHelpers.createUser({
          email: `concurrent${i}@integration.com`,
          role: 'user'
        })
        users.push(user)

        const authResponse = await request(app)
          .post('/auth/login')
          .send({ email: `concurrent${i}@integration.com` })
        tokens.push(authResponse.body.token)
      }

      // Create flash sale
      await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.product_id,
          startTime: new Date(Date.now() - 60000),
          endTime: new Date(Date.now() + 7200000),
          status: CONSTANTS.SALE_STATUS.ACTIVE
        })
        .expect(200)

      // Concurrent purchases
      const purchasePromises = tokens.map(token =>
        request(app)
          .post('/purchase')
          .set('Authorization', `Bearer ${token}`)
          .expect(202)
      )

      const responses = await Promise.all(purchasePromises)

      // All should be queued
      expect(responses.length).toBe(3)
      responses.forEach(response => {
        expect(response.body.success).toBe(true)
        expect(response.body.data.status).toBe(CONSTANTS.PURCHASE_JOB_STATUS.QUEUED)
      })

      // Verify no duplicate job IDs
      const jobIds = responses.map(r => r.body.data.jobId)
      const uniqueJobIds = [...new Set(jobIds)]
      expect(uniqueJobIds.length).toBe(3)
    })
  })
})
