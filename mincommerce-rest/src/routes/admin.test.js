/**
 * Admin Routes Unit Tests
 * Tests for admin endpoints covering flash sale configuration
 */

const request = require('supertest');
const app = require('../../src/server'); // We'll need to create this
const { generateTestData, dbHelpers, redisHelpers } = require('../../tests/utils/testHelpers');
const CONSTANTS = require('../constants');

describe('Admin Routes - Flash Sale Management', () => {
  let adminToken;
  let testProduct;
  let testStock;

  beforeEach(async () => {
    // Clear all test data
    await dbHelpers.clearAllData();
    await redisHelpers.clearAll();

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

    // Create admin token
    adminToken = await createAdminToken();
  });

  describe('Admin User Verification', () => {
    it('should have admin user in seeded database', async () => {
      const adminUser = await dbHelpers.findUserByEmail('admin@brilian.af');
      
      expect(adminUser).toBeDefined();
      expect(adminUser.role).toBe('admin');
      expect(adminUser.email).toBe('admin@brilian.af');
    });

    it('should authenticate admin user successfully', async () => {
      const AuthService = require('../services/AuthService');
      const authService = new AuthService();
      
      const result = await authService.authenticateAdmin('admin@brilian.af');
      
      expect(result.success).toBe(true);
      expect(result.userType).toBe('admin');
      expect(result.email).toBe('admin@brilian.af');
      expect(result.token).toBeDefined();
    });
  });

  const createAdminToken = async () => {
    const AuthService = require('../services/AuthService');
    const authService = new AuthService();
    const result = await authService.authenticateAdmin('admin@brilian.af');
    return result.token;
  };

  describe('POST /admin/flash-sale', () => {
    it('should create a new flash sale with valid data', async () => {
      const saleData = {
        productId: testProduct.product_id,
        startTime: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
        endTime: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
      };

      const response = await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(saleData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.saleId).toBeDefined();
      expect(response.body.data.productId).toBe(saleData.productId);
      expect(response.body.data.startTime).toBe(saleData.startTime);
      expect(response.body.data.endTime).toBe(saleData.endTime);
      expect(response.body.data.status).toBe(CONSTANTS.SALE_STATUS.UPCOMING);
    });

    it('should update existing flash sale', async () => {
      // First create a flash sale
      const initialSale = await dbHelpers.createFlashSale(testProduct.product_id, {
        start_time: new Date(Date.now() + 60000),
        end_time: new Date(Date.now() + 3600000),
        status: CONSTANTS.SALE_STATUS.UPCOMING,
      });

      const updateData = {
        saleId: initialSale.sale_id,
        productId: testProduct.product_id,
        startTime: new Date(Date.now() + 120000).toISOString(), // 2 minutes from now
        endTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      };

      const response = await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.saleId).toBe(initialSale.sale_id);
      expect(response.body.data.startTime).toBe(updateData.startTime);
      expect(response.body.data.endTime).toBe(updateData.endTime);
    });

    it('should reject flash sale with invalid time range', async () => {
      const invalidSaleData = {
        productId: testProduct.product_id,
        startTime: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
        endTime: new Date(Date.now() + 60000).toISOString(), // 1 minute from now (invalid)
      };

      const response = await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidSaleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('End time must be after start time');
    });

    it('should reject flash sale with non-existent product', async () => {
      const nonExistentProductId = 'non-existent-product-id';
      const saleData = {
        productId: nonExistentProductId,
        startTime: new Date(Date.now() + 60000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
      };

      const response = await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(saleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Product not found');
    });

    it('should reject flash sale with product that has no stock', async () => {
      // Create product without stock
      const productWithoutStock = await dbHelpers.createProduct({
        name: 'Product Without Stock',
        price: 50.0,
      });

      const saleData = {
        productId: productWithoutStock.product_id,
        startTime: new Date(Date.now() + 60000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
      };

      const response = await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(saleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Product has no stock');
    });

    it('should require authentication', async () => {
      const saleData = {
        productId: testProduct.product_id,
        startTime: new Date(Date.now() + 60000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
      };

      const response = await request(app).post('/admin/flash-sale').send(saleData).expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should reject non-admin users', async () => {
      // Create user session
      const userToken = await createUserToken();

      const saleData = {
        productId: testProduct.product_id,
        startTime: new Date(Date.now() + 60000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
      };

      const response = await request(app)
        .post('/admin/flash-sale')
        .set('Authorization', `Bearer ${userToken}`)
        .send(saleData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Admin access required');
    });
  });

  describe('GET /admin/flash-sale/:saleId', () => {
    let testFlashSale;

    beforeEach(async () => {
      testFlashSale = await dbHelpers.createFlashSale(testProduct.product_id, {
        start_time: new Date(Date.now() + 60000),
        end_time: new Date(Date.now() + 7200000),
        status: CONSTANTS.SALE_STATUS.UPCOMING,
      });
    });

    it('should get flash sale details', async () => {
      const response = await request(app)
        .get(`/admin/flash-sale/${testFlashSale.sale_id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.saleId).toBe(testFlashSale.sale_id);
      expect(response.body.data.productId).toBe(testProduct.product_id);
      expect(response.body.data.status).toBe(CONSTANTS.SALE_STATUS.UPCOMING);
    });

    it('should return 404 for non-existent flash sale', async () => {
      const nonExistentSaleId = 'non-existent-sale-id';

      const response = await request(app)
        .get(`/admin/flash-sale/${nonExistentSaleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Flash sale not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/admin/flash-sale/${testFlashSale.sale_id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });
  });

  describe('GET /admin/flash-sale/:saleId/stats', () => {
    let testFlashSale;

    beforeEach(async () => {
      testFlashSale = await dbHelpers.createFlashSale(testProduct.product_id, {
        start_time: new Date(Date.now() - 3600000), // Started 1 hour ago
        end_time: new Date(Date.now() + 3600000), // Ends in 1 hour
        status: CONSTANTS.SALE_STATUS.ACTIVE,
      });

      // Create some test orders
      const users = await Promise.all([
        dbHelpers.createUser({ email: 'user1@example.com' }),
        dbHelpers.createUser({ email: 'user2@example.com' }),
        dbHelpers.createUser({ email: 'user3@example.com' }),
      ]);

      await Promise.all([
        dbHelpers.createOrder(users[0].user_id, testProduct.product_id, {
          status: CONSTANTS.ORDER_STATUS.CONFIRMED,
        }),
        dbHelpers.createOrder(users[1].user_id, testProduct.product_id, {
          status: CONSTANTS.ORDER_STATUS.CONFIRMED,
        }),
        dbHelpers.createOrder(users[2].user_id, testProduct.product_id, {
          status: CONSTANTS.ORDER_STATUS.PENDING,
        }),
      ]);
    });

    it('should get flash sale statistics', async () => {
      const response = await request(app)
        .get(`/admin/flash-sale/${testFlashSale.sale_id}/stats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.saleId).toBe(testFlashSale.sale_id);
      expect(response.body.data.totalOrders).toBe(3);
      expect(response.body.data.confirmedOrders).toBe(2);
      expect(response.body.data.pendingOrders).toBe(1);
      expect(response.body.data.totalQuantity).toBe(100);
      expect(response.body.data.availableQuantity).toBe(98); // 100 - 2 confirmed
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/admin/flash-sale/${testFlashSale.sale_id}/stats`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });
  });

  const createUserToken = async () => {
    const testUser = await dbHelpers.createUser({
      email: 'testuser@example.com',
    });

    const AuthService = require('../services/AuthService');
    const authService = new AuthService();
    const result = await authService.authenticateUser(testUser.email);
    return result.token;
  };
});
