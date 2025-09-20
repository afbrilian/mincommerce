/**
 * Jest Test Setup
 * Global test configuration and setup
 */

const { connectDatabase, closeDatabase } = require('../src/config/database');
const { connectRedis, closeRedis } = require('../src/config/redis');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME + '_test' || 'mincommerce_test';
process.env.REDIS_DB = 1; // Use different Redis DB for tests

// Global test timeout
jest.setTimeout(30000);

// Global setup - runs once before all tests
beforeAll(async () => {
  try {
    console.log('Setting up test environment...');
    
    // Connect to test database
    await connectDatabase();
    console.log('Test database connected');
    
    // Connect to test Redis
    await connectRedis();
    console.log('Test Redis connected');
    
    // Run migrations for test database
    const knex = require('../src/config/database').getDatabase();
    await knex.migrate.latest();
    console.log('Test database migrations completed');
    
    // Seed test data
    await knex.seed.run();
    console.log('Test data seeded');
    
  } catch (error) {
    console.error('Test setup failed:', error);
    throw error;
  }
});

// Global teardown - runs once after all tests
afterAll(async () => {
  try {
    console.log('Cleaning up test environment...');
    
    // Close database connection
    await closeDatabase();
    console.log('Test database disconnected');
    
    // Close Redis connection
    await closeRedis();
    console.log('Test Redis disconnected');
    
  } catch (error) {
    console.error('Test teardown failed:', error);
  }
});

// Clean up between tests
beforeEach(async () => {
  // Clear Redis test database
  const { getRedisClient } = require('../src/config/redis');
  try {
    const redis = getRedisClient();
    await redis.flushdb();
  } catch (error) {
    // Ignore Redis errors during cleanup
  }
});

// Mock console methods in test environment
global.console = {
  ...console,
  // Uncomment to suppress console output during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
