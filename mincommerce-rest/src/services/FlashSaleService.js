const FlashSaleRepository = require('../repositories/FlashSaleRepository')
const StockRepository = require('../repositories/StockRepository')
const { getRedisClient } = require('../config/redis')
const logger = require('../utils/logger')

class FlashSaleService {
  constructor() {
    this.flashSaleRepository = new FlashSaleRepository()
    this.stockRepository = new StockRepository()
  }

  async getSaleStatus(saleId = null) {
    try {
      const redis = getRedisClient()
      const cacheKey = saleId ? `flash_sale_status_${saleId}` : 'flash_sale_status'

      // Try cache first
      const cachedStatus = await redis.get(cacheKey)
      if (cachedStatus) {
        return JSON.parse(cachedStatus)
      }

      let sale
      if (saleId) {
        sale = await this.flashSaleRepository.getSaleWithProductAndStock(saleId)
      } else {
        // Get the most recent sale (regardless of status)
        sale = await this.flashSaleRepository.getMostRecentSale()
        if (sale) {
          sale = await this.flashSaleRepository.getSaleWithProductAndStock(sale.sale_id)
        }
      }

      if (!sale) {
        throw new Error('No flash sale found')
      }

      // Determine sale status based on current time
      const now = new Date()
      let status = 'upcoming'

      if (now >= sale.start_time && now <= sale.end_time) {
        status = 'active'
      } else if (now > sale.end_time) {
        status = 'ended'
      }

      const saleStatus = {
        saleId: sale.sale_id,
        productId: sale.product_id,
        productName: sale.product_name,
        productDescription: sale.product_description,
        productPrice: parseFloat(sale.price),
        imageUrl: sale.image_url,
        startTime: sale.start_time,
        endTime: sale.end_time,
        status,
        totalQuantity: sale.total_quantity,
        availableQuantity: sale.available_quantity,
        soldQuantity: sale.total_quantity - sale.available_quantity,
        timeUntilStart: sale.start_time - now,
        timeUntilEnd: sale.end_time - now
      }

      // Cache for 30 seconds
      await redis.setEx(cacheKey, 30, JSON.stringify(saleStatus))

      return saleStatus
    } catch (error) {
      logger.error('Error getting flash sale status:', error)
      throw error
    }
  }

  async createFlashSale(saleData) {
    try {
      // Validate sale data
      if (!saleData.productId || !saleData.startTime || !saleData.endTime) {
        throw new Error('Missing required fields: productId, startTime, endTime')
      }

      if (new Date(saleData.endTime) <= new Date(saleData.startTime)) {
        throw new Error('End time must be after start time')
      }

      // Check if product exists and has stock
      try {
        const stock = await this.stockRepository.findByProductId(saleData.productId)
        if (!stock) {
          throw new Error('Product not found or has no stock')
        }
      } catch (error) {
        if (error.code === '22P02') {
          // Invalid UUID format
          throw new Error('Product not found')
        }
        throw error
      }

      const flashSale = await this.flashSaleRepository.create({
        product_id: saleData.productId,
        start_time: saleData.startTime,
        end_time: saleData.endTime,
        status: 'upcoming'
      })

      logger.info(`Flash sale created: ${flashSale.sale_id}`)

      // Map snake_case to camelCase for API response
      return {
        saleId: flashSale.sale_id,
        productId: flashSale.product_id,
        startTime: flashSale.start_time,
        endTime: flashSale.end_time,
        status: flashSale.status,
        createdAt: flashSale.created_at,
        updatedAt: flashSale.updated_at
      }
    } catch (error) {
      logger.error('Error creating flash sale:', error)
      throw error
    }
  }

  async getFlashSaleById(saleId) {
    try {
      if (!saleId) {
        throw new Error('Sale ID is required')
      }

      const flashSale = await this.flashSaleRepository.getSaleWithProductAndStock(saleId)
      return flashSale
    } catch (error) {
      if (error.code === '22P02') {
        // Invalid UUID format
        return null
      }
      logger.error('Error getting flash sale by ID:', error)
      throw error
    }
  }

  async updateSaleStatus(saleId, status) {
    try {
      const validStatuses = ['upcoming', 'active', 'ended']
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`)
      }

      const updatedSale = await this.flashSaleRepository.updateStatus(saleId, status)
      if (!updatedSale) {
        throw new Error('Flash sale not found')
      }

      // Clear cache
      const redis = getRedisClient()
      await redis.del('flash_sale_status')
      await redis.del(`flash_sale_status_${saleId}`)

      logger.info(`Flash sale status updated: ${saleId} -> ${status}`)

      // Map snake_case to camelCase for API response
      return {
        saleId: updatedSale.sale_id,
        productId: updatedSale.product_id,
        startTime: updatedSale.start_time,
        endTime: updatedSale.end_time,
        status: updatedSale.status,
        createdAt: updatedSale.created_at,
        updatedAt: updatedSale.updated_at
      }
    } catch (error) {
      logger.error(`Error updating flash sale status ${saleId}:`, error)
      throw error
    }
  }

  async updateStatusByTime() {
    try {
      await this.flashSaleRepository.updateStatusByTime()

      // Clear cache after status updates
      const redis = getRedisClient()
      await redis.del('flash_sale_status')

      logger.info('Flash sale statuses updated based on time')
    } catch (error) {
      logger.error('Error updating flash sale statuses by time:', error)
      throw error
    }
  }

  async getSaleStatistics(saleId) {
    try {
      const sale = await this.flashSaleRepository.findById(saleId)
      if (!sale) {
        throw new Error('Flash sale not found')
      }

      // Get order statistics
      const orderStats = await this.getOrderStatistics(saleId)

      // Get stock information
      const stock = await this.stockRepository.findByProductId(sale.product_id)

      return {
        saleId: sale.sale_id,
        startTime: sale.start_time,
        endTime: sale.end_time,
        status: sale.status,
        totalOrders: orderStats.total || 0,
        confirmedOrders: orderStats.confirmed || 0,
        pendingOrders: orderStats.pending || 0,
        failedOrders: orderStats.failed || 0,
        totalQuantity: stock?.total_quantity || 0,
        availableQuantity: stock ? stock.available_quantity - (orderStats.confirmed || 0) : 0,
        soldQuantity: orderStats.confirmed || 0,
        conversionRate:
          orderStats.total > 0 ? ((orderStats.confirmed / orderStats.total) * 100).toFixed(2) : 0
      }
    } catch (error) {
      logger.error(`Error getting sale statistics ${saleId}:`, error)
      throw error
    }
  }

  async getOrderStatistics(saleId) {
    try {
      // This would typically come from OrderService
      // For now, we'll implement a simple version
      const { getDatabase } = require('../config/database')
      const db = getDatabase()

      const sale = await this.flashSaleRepository.findById(saleId)
      if (!sale) {
        throw new Error('Flash sale not found')
      }

      const results = await db('orders')
        .where('product_id', sale.product_id)
        .select('status')
        .count('* as count')
        .groupBy('status')

      const stats = results.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count)
        return acc
      }, {})

      // Calculate total orders
      stats.total = Object.values(stats).reduce((sum, count) => sum + count, 0)

      return stats
    } catch (error) {
      logger.error(`Error getting order statistics for sale ${saleId}:`, error)
      throw error
    }
  }

  /**
   * Update an existing flash sale
   * @param {string} saleId - The sale ID to update
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated flash sale
   */
  async updateFlashSale(saleId, updateData) {
    try {
      const existingSale = await this.flashSaleRepository.findById(saleId)
      if (!existingSale) {
        throw new Error('Flash sale not found')
      }

      // Validate product exists and has stock
      if (updateData.productId) {
        try {
          const stock = await this.stockRepository.findByProductId(updateData.productId)
          if (!stock) {
            throw new Error('Stock entry not found for product')
          }
        } catch (error) {
          if (error.code === '22P02') {
            // Invalid UUID format
            throw new Error('Product not found')
          }
          throw error
        }
      }

      // Update the flash sale
      const updatedSale = await this.flashSaleRepository.update(saleId, {
        product_id: updateData.productId || existingSale.product_id,
        start_time: updateData.startTime || existingSale.start_time,
        end_time: updateData.endTime || existingSale.end_time,
        updated_at: new Date()
      })

      // Clear cache
      const redis = getRedisClient()
      await redis.del(`flash_sale_status_${saleId}`)
      await redis.del('flash_sale_status')

      logger.info(`Flash sale ${saleId} updated successfully`)

      // Map snake_case to camelCase for API response
      return {
        saleId: updatedSale.sale_id,
        productId: updatedSale.product_id,
        startTime: updatedSale.start_time,
        endTime: updatedSale.end_time,
        status: updatedSale.status,
        createdAt: updatedSale.created_at,
        updatedAt: updatedSale.updated_at
      }
    } catch (error) {
      logger.error(`Error updating flash sale ${saleId}:`, error)
      throw error
    }
  }

  /**
   * Get flash sale statistics (alias for getSaleStatistics)
   * @param {string} saleId - The sale ID
   * @returns {Object} Sale statistics
   */
  async getFlashSaleStats(saleId) {
    return this.getSaleStatistics(saleId)
  }
}

module.exports = FlashSaleService
