/**
 * Jest Test Setup
 * Global test configuration and setup
 */

const { connectDatabase, closeDatabase, getDatabase } = require('../src/config/database');
const { connectRedis, closeRedis } = require('../src/config/redis');
const { initializeQueue, closeQueue } = require('../src/config/queue');
const logger = require('../src/utils/logger');
const { dbHelpers, redisHelpers } = require('./utils/testHelpers'); // Import test helpers

// Set environment to test
process.env.NODE_ENV = 'test';

// Global setup
beforeAll(async () => {
  logger.info('Global test setup: Connecting to services...');
  try {
    await connectDatabase();
    await connectRedis();
    await initializeQueue();

    // Run migrations
    const db = getDatabase();
    await db.migrate.latest();
    logger.info('Database migrations ran successfully.');

    // Run seeds
    await db.seed.run();
    logger.info('Database seeded successfully.');

  } catch (error) {
    logger.error('Global test setup failed:', error);
    process.exit(1);
  }
});

// Global teardown
afterAll(async () => {
  logger.info('Global test teardown: Closing services...');
  try {
    const db = getDatabase();
    // Rollback migrations after all tests are done
    await db.migrate.rollback();
    logger.info('Database migrations rolled back successfully.');

    await closeQueue();
    await closeRedis();
    await closeDatabase();
  } catch (error) {
    logger.error('Global test teardown failed:', error);
    process.exit(1);
  }
});

// Clear Redis and reset database for each test file
beforeEach(async () => {
  // Clear Redis data
  await redisHelpers.clearAll();

  // Clear database data (except migrations table)
  await dbHelpers.clearAllData();

  // Re-seed data for each test to ensure isolation
  const db = getDatabase();
  try {
    await db.seed.run();
  } catch (error) {
    // If seeding fails, try to clear and re-run migrations
    if (error.message.includes('does not exist') || error.message.includes('relation')) {
      logger.warn('Seeding failed, re-running migrations...', error.message);
      await db.migrate.latest();
      await db.seed.run();
    } else {
      throw error;
    }
  }
  
  // Wait a moment to ensure seeding is complete
  await new Promise(resolve => setTimeout(resolve, 100));
});
