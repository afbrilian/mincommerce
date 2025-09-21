const BaseRepository = require('./BaseRepository')
const logger = require('../utils/logger')

class FlashSaleRepository extends BaseRepository {
  constructor() {
    super('flash_sales', 'sale_id')
  }

  async findById(saleId) {
    try {
      const result = await this.db(this.tableName).where('sale_id', saleId).first()
      return result || null
    } catch (error) {
      logger.error(`Error finding flash sale by id ${saleId}:`, error)
      throw error
    }
  }

  async findByProductId(productId) {
    try {
      const result = await this.db(this.tableName)
        .where('product_id', productId)
        .orderBy('created_at', 'desc')
        .first()
      return result || null
    } catch (error) {
      logger.error(`Error finding flash sale by product id ${productId}:`, error)
      throw error
    }
  }

  async findActiveSales() {
    try {
      const now = new Date()
      const results = await this.db(this.tableName)
        .where('status', 'active')
        .where('start_time', '<=', now)
        .where('end_time', '>=', now)
      return results
    } catch (error) {
      logger.error('Error finding active flash sales:', error)
      throw error
    }
  }

  async findUpcomingSales() {
    try {
      const now = new Date()
      const results = await this.db(this.tableName)
        .where('status', 'upcoming')
        .where('start_time', '>', now)
      return results
    } catch (error) {
      logger.error('Error finding upcoming flash sales:', error)
      throw error
    }
  }

  async create(saleData) {
    try {
      const results = await this.db(this.tableName).insert(saleData).returning('*')
      return results[0]
    } catch (error) {
      logger.error('Error creating flash sale:', error)
      throw error
    }
  }

  async updateStatus(saleId, status) {
    try {
      const results = await this.db(this.tableName)
        .where('sale_id', saleId)
        .update({
          status,
          updated_at: this.db.fn.now()
        })
        .returning('*')
      return results[0] || null
    } catch (error) {
      logger.error(`Error updating flash sale status ${saleId}:`, error)
      throw error
    }
  }

  async updateStatusByTime() {
    try {
      const now = new Date()

      // Update upcoming sales to active
      await this.db(this.tableName)
        .where('status', 'upcoming')
        .where('start_time', '<=', now)
        .where('end_time', '>=', now)
        .update({
          status: 'active',
          updated_at: now
        })

      // Update active sales to ended
      await this.db(this.tableName).where('status', 'active').where('end_time', '<', now).update({
        status: 'ended',
        updated_at: now
      })

      logger.info('Flash sale statuses updated based on time')
    } catch (error) {
      logger.error('Error updating flash sale statuses by time:', error)
      throw error
    }
  }

  async getSaleWithProductAndStock(saleId) {
    try {
      const result = await this.db(this.tableName)
        .join('products', 'flash_sales.product_id', 'products.product_id')
        .join('stocks', 'products.product_id', 'stocks.product_id')
        .select(
          'flash_sales.*',
          'products.name as product_name',
          'products.description as product_description',
          'products.price',
          'products.image_url',
          'stocks.available_quantity',
          'stocks.total_quantity'
        )
        .where('flash_sales.sale_id', saleId)
        .first()

      return result
    } catch (error) {
      logger.error(`Error getting flash sale with product and stock ${saleId}:`, error)
      throw error
    }
  }

  /**
   * Update flash sale by ID
   * @param {string} saleId - Sale ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated flash sale
   */
  async update(saleId, updateData) {
    try {
      const results = await this.db(this.tableName)
        .where(this.idColumn, saleId)
        .update(updateData)
        .returning('*')

      if (results.length === 0) {
        return null
      }

      return results[0]
    } catch (error) {
      logger.error(`Error updating flash sale ${saleId}:`, error)
      throw error
    }
  }

  /**
   * Get most recent sale (regardless of status)
   * @returns {Object|null} Most recent flash sale
   */
  async getMostRecentSale() {
    try {
      const results = await this.db(this.tableName).orderBy('created_at', 'desc').limit(1)

      if (results.length === 0) {
        return null
      }

      return results[0]
    } catch (error) {
      logger.error('Error getting most recent sale:', error)
      throw error
    }
  }

  /**
   * Get current active sale
   * @returns {Object|null} Current active flash sale
   */
  async getCurrentActiveSale() {
    try {
      const now = new Date()

      logger.info('getCurrentActiveSale - searching for active sales', {
        now: now.toISOString(),
        tableName: this.tableName
      })

      // First, let's see what flash sales exist
      const allSales = await this.db(this.tableName).select('*')
      logger.info('getCurrentActiveSale - all flash sales in database', {
        count: allSales.length,
        sales: allSales.map(sale => ({
          sale_id: sale.sale_id,
          status: sale.status,
          start_time: sale.start_time,
          end_time: sale.end_time,
          product_id: sale.product_id
        }))
      })

      const results = await this.db(this.tableName)
        .where('start_time', '<=', now)
        .where('end_time', '>=', now)
        .where('status', 'active')
        .orderBy('created_at', 'desc')
        .limit(1)

      logger.info('getCurrentActiveSale - filtered results', {
        count: results.length,
        results: results.map(sale => ({
          sale_id: sale.sale_id,
          status: sale.status,
          start_time: sale.start_time,
          end_time: sale.end_time
        }))
      })

      if (results.length === 0) {
        return null
      }

      // Return raw database record so we can access sale_id directly
      return results[0]
    } catch (error) {
      logger.error('Error getting current active sale:', error)
      throw error
    }
  }

  /**
   * Get product by sale ID
   * @param {string} saleId - Flash sale ID
   * @returns {Object|null} Product associated with the sale
   */
  async getProductBySaleId(saleId) {
    try {
      const results = await this.db(this.tableName)
        .join('products', 'flash_sales.product_id', 'products.product_id')
        .where('flash_sales.sale_id', saleId)
        .select('products.*')

      if (results.length === 0) {
        return null
      }

      return results[0]
    } catch (error) {
      logger.error(`Error getting product by sale ID ${saleId}:`, error)
      throw error
    }
  }
}

module.exports = FlashSaleRepository
