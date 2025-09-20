/**
 * User Routes Unit Tests
 * Tests for user endpoints covering flash sale status and purchase
 */

const request = require('supertest');
const app = require('../../src/server'); // We'll need to create this
const { generateTestData, dbHelpers, redisHelpers } = require('../../tests/utils/testHelpers');
const CONSTANTS = require('../constants');

describe('User Routes - Flash Sale Access', () => {
  let userToken;
  let testUser;
  let testProduct;
  let testStock;
  let testFlashSale;

  beforeEach(async () => {
    // Clear all test data
    await dbHelpers.clearAllData();
    await redisHelpers.clearAll();

    // Create test user
    testUser = await dbHelpers.createUser({
      email: 'testuser@example.com',
    });

    // Create test product and stock
    const productData = await dbHelpers.createProductWithStock(
      {
        name: 'Test Flash Sale Product',
        price: 99.99,
      },
      {
        total_quantity: 100,
        available_quantity: 100,
      }
    );
    testProduct = productData.product;
    testStock = productData.stock;

    // Create test flash sale
    testFlashSale = await dbHelpers.createFlashSale(testProduct.product_id, {
      start_time: new Date(Date.now() - 60000), // Started 1 minute ago
      end_time: new Date(Date.now() + 7200000), // Ends in 2 hours
      status: CONSTANTS.SALE_STATUS.ACTIVE,
    });

    // Create user token
    userToken = await createUserToken();
  });

  const createUserToken = async () => {
    const AuthService = require('../services/AuthService');
    const authService = new AuthService();
    const result = await authService.authenticateUser(testUser.email);
    return result.token;
  };

  describe('GET /flash-sale/status', () => {
    it('should get current flash sale status', async () => {
      const response = await request(app).get('/flash-sale/status').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.saleId).toBe(testFlashSale.sale_id);
      expect(response.body.data.productName).toBe(testProduct.name);
      expect(response.body.data.price).toBe(testProduct.price);
      expect(response.body.data.status).toBe(CONSTANTS.SALE_STATUS.ACTIVE);
      expect(response.body.data.totalQuantity).toBe(100);
      expect(response.body.data.availableQuantity).toBe(100);
      expect(response.body.data.soldQuantity).toBe(0);
      expect(response.body.data.timeUntilEnd).toBeGreaterThan(0);
    });

    it('should return upcoming sale status', async () => {
      // Update flash sale to upcoming status
      const upcomingSale = await dbHelpers.createFlashSale(testProduct.product_id, {
        start_time: new Date(Date.now() + 60000), // Starts in 1 minute
        end_time: new Date(Date.now() + 7200000), // Ends in 2 hours
        status: CONSTANTS.SALE_STATUS.UPCOMING,
      });

      const response = await request(app).get('/flash-sale/status').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(CONSTANTS.SALE_STATUS.UPCOMING);
      expect(response.body.data.timeUntilStart).toBeGreaterThan(0);
      expect(response.body.data.timeUntilEnd).toBeGreaterThan(0);
    });

    it('should return ended sale status', async () => {
      // Update flash sale to ended status
      const endedSale = await dbHelpers.createFlashSale(testProduct.product_id, {
        start_time: new Date(Date.now() - 7200000), // Started 2 hours ago
        end_time: new Date(Date.now() - 60000), // Ended 1 minute ago
        status: CONSTANTS.SALE_STATUS.ENDED,
      });

      const response = await request(app).get('/flash-sale/status').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(CONSTANTS.SALE_STATUS.ENDED);
      expect(response.body.data.timeUntilStart).toBe(0);
      expect(response.body.data.timeUntilEnd).toBe(0);
    });

    it('should return no active sale when none exists', async () => {
      // Clear all flash sales
      await dbHelpers.clearAllData();
      await dbHelpers.createUser({ email: 'testuser@example.com' });

      const response = await request(app).get('/flash-sale/status').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
      expect(response.body.message).toContain('No active flash sale');
    });

    it('should cache sale status in Redis', async () => {
      const response = await request(app).get('/flash-sale/status').expect(200);

      // Verify status is cached in Redis
      const cachedStatus = await redisHelpers.getFlashSaleStatus(testFlashSale.sale_id);
      expect(cachedStatus).toBeDefined();
      expect(cachedStatus.saleId).toBe(testFlashSale.sale_id);
      expect(cachedStatus.status).toBe(CONSTANTS.SALE_STATUS.ACTIVE);
    });
  });

  describe('POST /purchase', () => {
    it('should successfully purchase during active sale', async () => {
      const response = await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBeDefined();
      expect(response.body.data.status).toBe(CONSTANTS.ORDER_STATUS.PENDING);
      expect(response.body.message).toContain('Purchase successful');
    });

    it('should prevent duplicate purchases by same user', async () => {
      // First purchase
      await request(app).post('/purchase').set('Authorization', `Bearer ${userToken}`).expect(200);

      // Second purchase should fail
      const response = await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already purchased');
    });

    it('should prevent purchase when sale is not active', async () => {
      // Update flash sale to upcoming status
      await dbHelpers.createFlashSale(testProduct.product_id, {
        start_time: new Date(Date.now() + 60000), // Starts in 1 minute
        end_time: new Date(Date.now() + 7200000), // Ends in 2 hours
        status: CONSTANTS.SALE_STATUS.UPCOMING,
      });

      const response = await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Flash sale is not active');
    });

    it('should prevent purchase when sale has ended', async () => {
      // Update flash sale to ended status
      await dbHelpers.createFlashSale(testProduct.product_id, {
        start_time: new Date(Date.now() - 7200000), // Started 2 hours ago
        end_time: new Date(Date.now() - 60000), // Ended 1 minute ago
        status: CONSTANTS.SALE_STATUS.ENDED,
      });

      const response = await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Flash sale has ended');
    });

    it('should prevent purchase when stock is exhausted', async () => {
      // Create flash sale with limited stock
      const limitedStock = await dbHelpers.createStock(testProduct.product_id, {
        total_quantity: 1,
        available_quantity: 1,
      });

      // First user purchases the only item
      const firstUser = await dbHelpers.createUser({ email: 'firstuser@example.com' });
      const firstUserToken = await createUserTokenForUser(firstUser);

      await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${firstUserToken}`)
        .expect(200);

      // Second user should fail
      const response = await request(app)
        .post('/purchase')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Out of stock');
    });

    it('should require authentication', async () => {
      const response = await request(app).post('/purchase').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should handle concurrent purchase attempts correctly', async () => {
      // Create multiple users
      const users = await Promise.all([
        dbHelpers.createUser({ email: 'user1@example.com' }),
        dbHelpers.createUser({ email: 'user2@example.com' }),
        dbHelpers.createUser({ email: 'user3@example.com' }),
      ]);

      const tokens = await Promise.all(users.map(user => createUserTokenForUser(user)));

      // Attempt concurrent purchases
      const purchasePromises = tokens.map(token =>
        request(app).post('/purchase').set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(purchasePromises);

      // Check that only one purchase succeeded (due to limited stock)
      const successfulPurchases = responses.filter(r => r.status === 200);
      const failedPurchases = responses.filter(r => r.status === 400);

      expect(successfulPurchases.length).toBe(1);
      expect(failedPurchases.length).toBe(2);
    });

    it('should update stock correctly after purchase', async () => {
      const initialStock = await dbHelpers.getStockByProductId(testProduct.product_id);
      expect(initialStock.available_quantity).toBe(100);

      await request(app).post('/purchase').set('Authorization', `Bearer ${userToken}`).expect(200);

      const updatedStock = await dbHelpers.getStockByProductId(testProduct.product_id);
      expect(updatedStock.available_quantity).toBe(99);
      expect(updatedStock.reserved_quantity).toBe(1);
    });
  });

  describe('GET /purchase/status', () => {
    it('should get user purchase status', async () => {
      // First make a purchase
      await request(app).post('/purchase').set('Authorization', `Bearer ${userToken}`).expect(200);

      const response = await request(app)
        .get('/purchase/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasPurchased).toBe(true);
      expect(response.body.data.orderId).toBeDefined();
      expect(response.body.data.status).toBe(CONSTANTS.ORDER_STATUS.PENDING);
    });

    it('should return no purchase for user who has not purchased', async () => {
      const response = await request(app)
        .get('/purchase/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasPurchased).toBe(false);
      expect(response.body.data.orderId).toBeNull();
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/purchase/status').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });
  });

  const createUserTokenForUser = async user => {
    const AuthService = require('../services/AuthService');
    const authService = new AuthService();
    const result = await authService.authenticateUser(user.email);
    return result.token;
  };
});
