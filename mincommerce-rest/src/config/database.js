const knex = require('knex');
const knexConfig = require('../../knexfile');
const logger = require('../utils/logger');

let db = null;

const connectDatabase = async () => {
  try {
    const environment = process.env.NODE_ENV || 'development';
    db = knex(knexConfig[environment]);

    // Test connection
    await db.raw('SELECT 1');
    logger.info('Database connection established');

    return db;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return db;
};

const closeDatabase = async () => {
  if (db) {
    await db.destroy();
    logger.info('Database connection closed');
  }
};

module.exports = {
  connectDatabase,
  getDatabase,
  closeDatabase,
};
