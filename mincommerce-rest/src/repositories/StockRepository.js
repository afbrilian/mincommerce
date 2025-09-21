const BaseRepository = require('./BaseRepository')
const Stock = require('../models/Stock')
const logger = require('../utils/logger')

class StockRepository extends BaseRepository {
  constructor() {
    super('stocks')
  }

  async findByProductId(productId) {
    try {
      const result = await this.db(this.tableName).where('product_id', productId).first()
      return result ? Stock.fromDatabase(result) : null
    } catch (error) {
      logger.error(`Error finding stock by product id ${productId}:`, error)
      throw error
    }
  }

  async create(stockData) {
    try {
      const results = await this.db(this.tableName).insert(stockData).returning('*')
      return Stock.fromDatabase(results[0])
    } catch (error) {
      logger.error('Error creating stock:', error)
      throw error
    }
  }

  async updateAvailableQuantity(productId, quantityChange) {
    try {
      // For negative changes (decreasing stock), we need to decrease both available and total quantities
      // to maintain the constraint: total_quantity = available_quantity + reserved_quantity
      const result = await this.db(this.tableName)
        .where('product_id', productId)
        .where('available_quantity', '>=', Math.abs(quantityChange))
        .increment('available_quantity', quantityChange)
        .increment('total_quantity', quantityChange) // Also decrease total to maintain balance
        .update('last_updated', this.db.fn.now())
        .returning('*')
      
      return result && result.length > 0 ? Stock.fromDatabase(result[0]) : null
    } catch (error) {
      logger.error(`Error updating available quantity for product ${productId}:`, error)
      throw error
    }
  }

  async reserveStock(productId, quantity = 1) {
    try {
      const result = await this.db(this.tableName)
        .where('product_id', productId)
        .where('available_quantity', '>=', quantity)
        .decrement('available_quantity', quantity)
        .increment('reserved_quantity', quantity)
        .update('last_updated', this.db.fn.now())
        .returning('*')
        .first()
      return result ? Stock.fromDatabase(result) : null
    } catch (error) {
      logger.error(`Error reserving stock for product ${productId}:`, error)
      throw error
    }
  }

  async releaseStock(productId, quantity = 1) {
    try {
      const result = await this.db(this.tableName)
        .where('product_id', productId)
        .where('reserved_quantity', '>=', quantity)
        .increment('available_quantity', quantity)
        .decrement('reserved_quantity', quantity)
        .update('last_updated', this.db.fn.now())
        .returning('*')
        .first()
      return result ? Stock.fromDatabase(result) : null
    } catch (error) {
      logger.error(`Error releasing stock for product ${productId}:`, error)
      throw error
    }
  }

  async confirmStock(productId, quantity = 1) {
    try {
      const result = await this.db(this.tableName)
        .where('product_id', productId)
        .where('reserved_quantity', '>=', quantity)
        .decrement('reserved_quantity', quantity)
        .update('last_updated', this.db.fn.now())
        .returning('*')
        .first()
      return result ? Stock.fromDatabase(result) : null
    } catch (error) {
      logger.error(`Error confirming stock for product ${productId}:`, error)
      throw error
    }
  }

  async getAvailableStock(productId) {
    try {
      const result = await this.db(this.tableName)
        .select('available_quantity', 'total_quantity', 'reserved_quantity')
        .where('product_id', productId)
        .first()
      return result
    } catch (error) {
      logger.error(`Error getting available stock for product ${productId}:`, error)
      throw error
    }
  }

  /**
   * Acquire PostgreSQL advisory lock
   * @param {number} lockId - Lock identifier
   * @returns {Promise<boolean>} True if lock acquired
   */
  async acquireLock(lockId) {
    try {
      await this.db.raw('SELECT pg_advisory_lock(?)', [lockId])
      return true
    } catch (error) {
      logger.error(`Error acquiring lock ${lockId}:`, error)
      throw error
    }
  }

  /**
   * Release PostgreSQL advisory lock
   * @param {number} lockId - Lock identifier
   * @returns {Promise<boolean>} True if lock released
   */
  async releaseLock(lockId) {
    try {
      await this.db.raw('SELECT pg_advisory_unlock(?)', [lockId])
      return true
    } catch (error) {
      logger.error(`Error releasing lock ${lockId}:`, error)
      throw error
    }
  }
}

module.exports = StockRepository
