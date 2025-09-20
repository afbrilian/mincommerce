/**
 * Test Utilities and Helpers
 * Common functions for testing
 */

const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../../src/config/database');
const { getRedisClient } = require('../../src/config/redis');

/**
 * Generate test data
 */
const generateTestData = {
  user: (overrides = {}) => ({
    user_id: uuidv4(),
    email: `test-${Date.now()}@example.com`,
    created_at: new Date(),
    ...overrides
  }),

  product: (overrides = {}) => ({
    product_id: uuidv4(),
    name: `Test Product ${Date.now()}`,
    description: 'Test product description',
    price: 99.99,
    image_url: 'https://example.com/image.jpg',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  }),

  stock: (productId, overrides = {}) => ({
    stock_id: uuidv4(),
    product_id: productId,
    total_quantity: 100,
    available_quantity: 100,
    reserved_quantity: 0,
    last_updated: new Date(),
    ...overrides
  }),

  flashSale: (productId, overrides = {}) => {
    const now = new Date();
    return {
      sale_id: uuidv4(),
      product_id: productId,
      start_time: new Date(now.getTime() + 60000), // 1 minute from now
      end_time: new Date(now.getTime() + 7200000), // 2 hours from now
      status: 'upcoming',
      created_at: now,
      updated_at: now,
      ...overrides
    };
  },

  order: (userId, productId, overrides = {}) => ({
    order_id: uuidv4(),
    user_id: userId,
    product_id: productId,
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  })
};

/**
 * Database helpers
 */
const dbHelpers = {
  /**
   * Clear all test data
   */
  async clearAllData() {
    const db = getDatabase();
    const tables = [
      'orders',
      'flash_sales',
      'stocks',
      'products',
      'users'
    ];

    for (const table of tables) {
      await db(table).del();
    }
  },

  /**
   * Create test user
   */
  async createUser(userData = {}) {
    const db = getDatabase();
    const user = generateTestData.user(userData);
    await db('users').insert(user);
    return user;
  },

  /**
   * Create test product with stock
   */
  async createProductWithStock(productData = {}, stockData = {}) {
    const db = getDatabase();
    const product = generateTestData.product(productData);
    await db('products').insert(product);
    
    const stock = generateTestData.stock(product.product_id, stockData);
    await db('stocks').insert(stock);
    
    return { product, stock };
  },

  /**
   * Create test flash sale
   */
  async createFlashSale(productId, saleData = {}) {
    const db = getDatabase();
    const sale = generateTestData.flashSale(productId, saleData);
    await db('flash_sales').insert(sale);
    return sale;
  },

  /**
   * Create test order
   */
  async createOrder(userId, productId, orderData = {}) {
    const db = getDatabase();
    const order = generateTestData.order(userId, productId, orderData);
    await db('orders').insert(order);
    return order;
  },

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const db = getDatabase();
    return await db('users').where('user_id', userId).first();
  },

  /**
   * Get product by ID
   */
  async getProductById(productId) {
    const db = getDatabase();
    return await db('products').where('product_id', productId).first();
  },

  /**
   * Get stock by product ID
   */
  async getStockByProductId(productId) {
    const db = getDatabase();
    return await db('stocks').where('product_id', productId).first();
  },

  /**
   * Get flash sale by ID
   */
  async getFlashSaleById(saleId) {
    const db = getDatabase();
    return await db('flash_sales').where('sale_id', saleId).first();
  },

  /**
   * Get order by user and product
   */
  async getOrderByUserAndProduct(userId, productId) {
    const db = getDatabase();
    return await db('orders')
      .where('user_id', userId)
      .where('product_id', productId)
      .first();
  }
};

/**
 * Redis helpers
 */
const redisHelpers = {
  /**
   * Clear all Redis data
   */
  async clearAll() {
    const redis = getRedisClient();
    await redis.flushDb();
  },

  /**
   * Set test data in Redis
   */
  async set(key, value, ttl = null) {
    const redis = getRedisClient();
    if (ttl) {
      await redis.setex(key, ttl, JSON.stringify(value));
    } else {
      await redis.set(key, JSON.stringify(value));
    }
  },

  /**
   * Get data from Redis
   */
  async get(key) {
    const redis = getRedisClient();
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },

  /**
   * Delete key from Redis
   */
  async del(key) {
    const redis = getRedisClient();
    await redis.del(key);
  }
};

/**
 * Assertion helpers
 */
const assertions = {
  /**
   * Assert response structure
   */
  expectPurchaseResponse(response, expectedSuccess = true) {
    expect(response).toHaveProperty('success', expectedSuccess);
    
    if (expectedSuccess) {
      expect(response).toHaveProperty('jobId');
      expect(response).toHaveProperty('status', 'processing');
    } else {
      expect(response).toHaveProperty('reason');
    }
  },

  /**
   * Assert order structure
   */
  expectOrderStructure(order) {
    expect(order).toHaveProperty('orderId');
    expect(order).toHaveProperty('userId');
    expect(order).toHaveProperty('productId');
    expect(order).toHaveProperty('status');
    expect(order).toHaveProperty('createdAt');
  },

  /**
   * Assert stock consistency
   */
  expectStockConsistency(stock) {
    expect(stock.total_quantity).toBe(
      stock.available_quantity + stock.reserved_quantity
    );
    expect(stock.available_quantity).toBeGreaterThanOrEqual(0);
    expect(stock.reserved_quantity).toBeGreaterThanOrEqual(0);
  }
};

/**
 * Mock helpers
 */
const mockHelpers = {
  /**
   * Mock Redis client
   */
  createMockRedis() {
    const mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      hset: jest.fn(),
      flushdb: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG')
    };
    return mockRedis;
  },

  /**
   * Mock database client
   */
  createMockDatabase() {
    const mockDb = {
      raw: jest.fn().mockResolvedValue([]),
      transaction: jest.fn().mockImplementation((callback) => callback(mockDb))
    };
    return mockDb;
  }
};

module.exports = {
  generateTestData,
  dbHelpers,
  redisHelpers,
  assertions,
  mockHelpers
};
