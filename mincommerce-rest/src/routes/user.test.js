/**
 * User Routes Unit Tests
 * Tests for user endpoints covering flash sale status and purchase
 */

const request = require('supertest')
const app = require('../../src/server')
const { dbHelpers, redisHelpers } = require('../../tests/utils/testHelpers')
const CONSTANTS = require('../constants')

describe('User Routes - Flash Sale Access', () => {
  let userToken
  let testUser
  let testProduct

  beforeEach(async () => {
    // Clear all test data
    await dbHelpers.clearAllData()
    await redisHelpers.clearAll()

    // Create test user
    testUser = await dbHelpers.createUser({
      email: 'user@example.com',
      role: 'user'
    })

    // Create test product with stock
    const productData = await dbHelpers.createProductWithStock(
      {
        name: 'Test Product',
        description: 'A test product for flash sale testing',
        price: 99.99
      },
      {
        total_quantity: 100,
        available_quantity: 100
      }
    )
    testProduct = productData.product

    // Create test flash sale
    await dbHelpers.createFlashSale(testProduct.product_id, {
      start_time: new Date(Date.now() - 60000), // Started 1 minute ago
      end_time: new Date(Date.now() + 7200000), // Ends in 2 hours
      status: CONSTANTS.SALE_STATUS.ACTIVE
    })

    // Create user token
    userToken = await createUserTokenForUser(testUser)
  })

  afterEach(async () => {
    await dbHelpers.cleanupTestDatabase()
  })

  // Helper function to create user token
  async function createUserTokenForUser(user) {
    const AuthService = require('../services/AuthService')
    const authService = new AuthService()
    const result = await authService.authenticateUser(user.email)
    return result.token
  }

  describe('GET /flash-sale/status', () => {
    it('should get current flash sale status', async () => {
      const response = await request(app).get('/flash-sale/status').expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(response.body.data.status).toBe(CONSTANTS.SALE_STATUS.ACTIVE)
      expect(response.body.data.productId).toBe(testProduct.product_id)
      expect(response.body.data.productName).toBe(testProduct.name)
      expect(response.body.data.productDescription).toBe(testProduct.description)
      expect(response.body.data.productPrice).toBe(testProduct.price)
      expect(response.body.data.totalQuantity).toBe(100)
      expect(response.body.data.availableQuantity).toBe(100)
      expect(response.body.data.soldQuantity).toBe(0)
      expect(response.body.data.timeUntilEnd).toBeGreaterThan(0)
    })

    it('should return upcoming sale status', async () => {
      // Update flash sale to upcoming status
      await dbHelpers.createFlashSale(testProduct.product_id, {
        start_time: new Date(Date.now() + 60000), // Starts in 1 minute
        end_time: new Date(Date.now() + 7200000), // Ends in 2 hours
        status: CONSTANTS.SALE_STATUS.UPCOMING
      })

      const response = await request(app).get('/flash-sale/status').expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe(CONSTANTS.SALE_STATUS.UPCOMING)
      expect(response.body.data.timeUntilStart).toBeGreaterThan(0)
      expect(response.body.data.timeUntilEnd).toBeGreaterThan(0)
    })

    it('should return ended sale status', async () => {
      // Update flash sale to ended status
      await dbHelpers.createFlashSale(testProduct.product_id, {
        start_time: new Date(Date.now() - 7200000), // Started 2 hours ago
        end_time: new Date(Date.now() - 60000), // Ended 1 minute ago
        status: CONSTANTS.SALE_STATUS.ENDED
      })

      const response = await request(app).get('/flash-sale/status').expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe(CONSTANTS.SALE_STATUS.ENDED)
      expect(response.body.data.timeUntilStart).toBeLessThan(0)
      expect(response.body.data.timeUntilEnd).toBeLessThan(0)
    })

    it('should return no active sale when no flash sale exists', async () => {
      // Clear flash sales
      await dbHelpers.clearAllData()
      await dbHelpers.createUser({ email: 'testuser@example.com' })

      const response = await request(app).get('/flash-sale/status').expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeNull()
      expect(response.body.message).toContain('No flash sale')
    })

    it('should cache sale status in Redis', async () => {
      await request(app).get('/flash-sale/status').expect(200)

      // Verify status is cached in Redis
      const cachedStatus = await redisHelpers.getFlashSaleStatus()
      expect(cachedStatus).toBeDefined()
      expect(cachedStatus.saleId).toBeDefined()
      expect(cachedStatus.status).toBe(CONSTANTS.SALE_STATUS.ACTIVE)
    })
  })

  describe('POST /purchase', () => {
    it('should queue purchase request and return 202 Accepted', async () => {
      const response = await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(202)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe(CONSTANTS.SUCCESS_MESSAGES.PURCHASE_QUEUED)
      expect(response.body.data.jobId).toBeDefined()
      expect(response.body.data.status).toBe(CONSTANTS.PURCHASE_JOB_STATUS.QUEUED)
      expect(response.body.data.estimatedWaitTime).toBeDefined()
    })

    it('should track purchase status in Redis', async () => {
      const purchaseResponse = await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(202)

      const jobId = purchaseResponse.body.data.jobId

      // Check job status in Redis
      const jobStatus = await redisHelpers
        .getRedisClient()
        .get(CONSTANTS.REDIS_KEYS.PURCHASE_JOB(jobId))

      expect(jobStatus).toBeDefined()
      const parsedStatus = JSON.parse(jobStatus)
      expect(parsedStatus.status).toBe(CONSTANTS.PURCHASE_JOB_STATUS.QUEUED)

      // Check user purchase status
      const userStatus = await redisHelpers
        .getRedisClient()
        .get(CONSTANTS.REDIS_KEYS.PURCHASE_STATUS(testUser.user_id))

      expect(userStatus).toBeDefined()
      const parsedUserStatus = JSON.parse(userStatus)
      expect(parsedUserStatus.status).toBe(CONSTANTS.PURCHASE_JOB_STATUS.QUEUED)
      expect(parsedUserStatus.jobId).toBe(jobId)
    })

    it('should prevent duplicate purchase requests', async () => {
      // First purchase request
      await request(app).post('/purchase').set('Authorization', `Bearer ${userToken}`).expect(202)

      // Second purchase request should fail
      const response = await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(409)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('User already has a pending purchase request')
    })

    it('should return purchase status with job information', async () => {
      const purchaseResponse = await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(202)

      const jobId = purchaseResponse.body.data.jobId

      // Check purchase status
      const statusResponse = await request(app)
        .get('/purchase/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(statusResponse.body.success).toBe(true)
      expect(statusResponse.body.data.status).toBe(CONSTANTS.PURCHASE_JOB_STATUS.QUEUED)
      expect(statusResponse.body.data.jobId).toBe(jobId)
      expect(statusResponse.body.data.message).toContain('being processed')
    })

    it('should return job status by job ID', async () => {
      const purchaseResponse = await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(202)

      const jobId = purchaseResponse.body.data.jobId

      // Check job status by ID
      const jobResponse = await request(app)
        .get(`/purchase/job/${jobId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(jobResponse.body.success).toBe(true)
      expect(jobResponse.body.data.jobId).toBe(jobId)
      expect(jobResponse.body.data.status).toBe(CONSTANTS.PURCHASE_JOB_STATUS.QUEUED)
    })

    it('should return 404 for non-existent job', async () => {
      const fakeJobId = 'non-existent-job-id'

      const response = await request(app)
        .get(`/purchase/job/${fakeJobId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Job not found')
    })

    it('should queue purchase request even when sale has ended (validation happens in worker)', async () => {
      // Update flash sale to ended status
      await dbHelpers.createFlashSale(testProduct.product_id, {
        start_time: new Date(Date.now() - 7200000),
        end_time: new Date(Date.now() - 60000),
        status: CONSTANTS.SALE_STATUS.ENDED
      })

      // In queue-based system, validation happens in worker, so we still get 202
      const response = await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(202)

      expect(response.body.success).toBe(true)
      expect(response.body.data.jobId).toBeDefined()
      expect(response.body.data.status).toBe(CONSTANTS.PURCHASE_JOB_STATUS.QUEUED)
    })

    it('should queue purchase request even when sale has not started (validation happens in worker)', async () => {
      // Update flash sale to upcoming status
      await dbHelpers.createFlashSale(testProduct.product_id, {
        start_time: new Date(Date.now() + 60000),
        end_time: new Date(Date.now() + 7200000),
        status: CONSTANTS.SALE_STATUS.UPCOMING
      })

      // In queue-based system, validation happens in worker, so we still get 202
      const response = await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(202)

      expect(response.body.success).toBe(true)
      expect(response.body.data.jobId).toBeDefined()
      expect(response.body.data.status).toBe(CONSTANTS.PURCHASE_JOB_STATUS.QUEUED)
    })

    it('should queue purchase requests even when stock is exhausted (validation happens in worker)', async () => {
      // Create flash sale with limited stock
      await dbHelpers.createStock(testProduct.product_id, {
        total_quantity: 1,
        available_quantity: 1
      })

      // Create flash sale for the product with limited stock
      await dbHelpers.createFlashSale(testProduct.product_id, {
        start_time: new Date(Date.now() - 60000), // Started 1 minute ago
        end_time: new Date(Date.now() + 7200000), // Ends in 2 hours
        status: CONSTANTS.SALE_STATUS.ACTIVE
      })

      // First user purchases the only item
      const firstUser = await dbHelpers.createUser({ email: 'firstuser@example.com' })
      const firstUserToken = await createUserTokenForUser(firstUser)

      // Both requests will be queued (validation happens in worker)
      await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${firstUserToken}`)
        .expect(202)

      // Second user request will also be queued
      const response = await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(202)

      expect(response.body.success).toBe(true)
      expect(response.body.data.jobId).toBeDefined()
      expect(response.body.data.status).toBe(CONSTANTS.PURCHASE_JOB_STATUS.QUEUED)
    })

    it('should require authentication', async () => {
      const response = await request(app).post('/purchase').expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Authentication required')
    })

    it('should queue all concurrent purchase attempts (validation happens in worker)', async () => {
      // Create multiple users
      const users = []
      const tokens = []
      for (let i = 0; i < 5; i++) {
        const user = await dbHelpers.createUser({ email: `user${i}@example.com` })
        const token = await createUserTokenForUser(user)
        users.push(user)
        tokens.push(token)
      }

      // Create flash sale with limited stock (only 2 items available)
      await dbHelpers.createStock(testProduct.product_id, {
        total_quantity: 2,
        available_quantity: 2
      })

      // Attempt concurrent purchases - all should be queued
      const purchasePromises = tokens.map(token =>
        request(app).post('/purchase').set('Authorization', `Bearer ${token}`).expect(202)
      )

      const responses = await Promise.all(purchasePromises)

      // All requests should be queued successfully
      expect(responses.length).toBe(5)
      responses.forEach(response => {
        expect(response.body.success).toBe(true)
        expect(response.body.data.jobId).toBeDefined()
        expect(response.body.data.status).toBe(CONSTANTS.PURCHASE_JOB_STATUS.QUEUED)
      })
    })
  })

  describe('GET /purchase/status', () => {
    it('should return purchase status for user who has queued purchase', async () => {
      // Queue a purchase first
      await request(app).post('/purchase').set('Authorization', `Bearer ${userToken}`).expect(202)

      const response = await request(app)
        .get('/purchase/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(response.body.data.status).toBe(CONSTANTS.PURCHASE_JOB_STATUS.QUEUED)
      expect(response.body.data.jobId).toBeDefined()
      expect(response.body.data.message).toContain('being processed')
    })

    it('should return no purchase for user who has not purchased', async () => {
      const response = await request(app)
        .get('/purchase/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.hasPurchased).toBe(false)
      expect(response.body.data.orderId).toBeNull()
    })

    it('should require authentication', async () => {
      const response = await request(app).get('/purchase/status').expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Authentication required')
    })
  })

  describe('Queue Monitoring', () => {
    it('should return queue statistics', async () => {
      const response = await request(app).get('/queue/stats').expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(response.body.data.isRunning).toBe(true)
      expect(response.body.data.queue).toBeDefined()
    })

    it('should return queue health status', async () => {
      const response = await request(app).get('/queue/health').expect(200)

      expect(response.body.status).toBe('healthy')
      expect(response.body.system).toBeDefined()
      expect(response.body.system.isRunning).toBe(true)
    })
  })
})
