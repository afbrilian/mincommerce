const FlashSaleRepository = require('../repositories/FlashSaleRepository');
const StockRepository = require('../repositories/StockRepository');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

class FlashSaleService {
  constructor() {
    this.flashSaleRepository = new FlashSaleRepository();
    this.stockRepository = new StockRepository();
  }

  async getSaleStatus(saleId = null) {
    try {
      const redis = getRedisClient();
      const cacheKey = saleId ? `flash_sale_status_${saleId}` : 'flash_sale_status';

      // Try cache first
      const cachedStatus = await redis.get(cacheKey);
      if (cachedStatus) {
        return JSON.parse(cachedStatus);
      }

      let sale;
      if (saleId) {
        sale = await this.flashSaleRepository.getSaleWithProductAndStock(saleId);
      } else {
        // Get the most recent active sale
        const activeSales = await this.flashSaleRepository.findActiveSales();
        if (activeSales.length > 0) {
          sale = await this.flashSaleRepository.getSaleWithProductAndStock(activeSales[0].saleId);
        }
      }

      if (!sale) {
        throw new Error('No active flash sale found');
      }

      // Determine sale status based on current time
      const now = new Date();
      let status = 'upcoming';

      if (now >= sale.start_time && now <= sale.end_time) {
        status = 'active';
      } else if (now > sale.end_time) {
        status = 'ended';
      }

      const saleStatus = {
        saleId: sale.sale_id,
        productId: sale.product_id,
        productName: sale.product_name,
        price: sale.price,
        imageUrl: sale.image_url,
        startTime: sale.start_time,
        endTime: sale.end_time,
        status,
        totalQuantity: sale.total_quantity,
        availableQuantity: sale.available_quantity,
        soldQuantity: sale.total_quantity - sale.available_quantity,
        timeUntilStart: Math.max(0, sale.start_time - now),
        timeUntilEnd: Math.max(0, sale.end_time - now),
      };

      // Cache for 30 seconds
      await redis.setEx(cacheKey, 30, JSON.stringify(saleStatus));

      return saleStatus;
    } catch (error) {
      logger.error('Error getting flash sale status:', error);
      throw error;
    }
  }

  async createFlashSale(saleData) {
    try {
      // Validate sale data
      if (!saleData.productId || !saleData.startTime || !saleData.endTime) {
        throw new Error('Missing required fields: productId, startTime, endTime');
      }

      if (new Date(saleData.endTime) <= new Date(saleData.startTime)) {
        throw new Error('End time must be after start time');
      }

      // Check if product exists and has stock
      try {
        const stock = await this.stockRepository.findByProductId(saleData.productId);
        if (!stock) {
          throw new Error('Product not found or has no stock');
        }
      } catch (error) {
        if (error.code === '22P02') {
          // Invalid UUID format
          throw new Error('Product not found');
        }
        throw error;
      }

      const flashSale = await this.flashSaleRepository.create({
        product_id: saleData.productId,
        start_time: saleData.startTime,
        end_time: saleData.endTime,
        status: 'upcoming',
      });

      logger.info(`Flash sale created: ${flashSale.saleId}`);
      return flashSale;
    } catch (error) {
      logger.error('Error creating flash sale:', error);
      throw error;
    }
  }

  async updateSaleStatus(saleId, status) {
    try {
      const validStatuses = ['upcoming', 'active', 'ended'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }

      const updatedSale = await this.flashSaleRepository.updateStatus(saleId, status);
      if (!updatedSale) {
        throw new Error('Flash sale not found');
      }

      // Clear cache
      const redis = getRedisClient();
      await redis.del('flash_sale_status');
      await redis.del(`flash_sale_status_${saleId}`);

      logger.info(`Flash sale status updated: ${saleId} -> ${status}`);
      return updatedSale;
    } catch (error) {
      logger.error(`Error updating flash sale status ${saleId}:`, error);
      throw error;
    }
  }

  async updateStatusByTime() {
    try {
      await this.flashSaleRepository.updateStatusByTime();

      // Clear cache after status updates
      const redis = getRedisClient();
      await redis.del('flash_sale_status');

      logger.info('Flash sale statuses updated based on time');
    } catch (error) {
      logger.error('Error updating flash sale statuses by time:', error);
      throw error;
    }
  }

  async getSaleStatistics(saleId) {
    try {
      const sale = await this.flashSaleRepository.findById(saleId);
      if (!sale) {
        throw new Error('Flash sale not found');
      }

      // Get order statistics
      const orderStats = await this.getOrderStatistics(saleId);

      // Get stock information
      const stock = await this.stockRepository.findByProductId(sale.productId);

      return {
        saleId: sale.saleId,
        startTime: sale.startTime,
        endTime: sale.endTime,
        status: sale.status,
        totalOrders: orderStats.total || 0,
        confirmedOrders: orderStats.confirmed || 0,
        pendingOrders: orderStats.pending || 0,
        failedOrders: orderStats.failed || 0,
        totalQuantity: stock?.totalQuantity || 0,
        availableQuantity: stock ? stock.availableQuantity - (orderStats.confirmed || 0) : 0,
        soldQuantity: orderStats.confirmed || 0,
        conversionRate:
          orderStats.total > 0 ? ((orderStats.confirmed / orderStats.total) * 100).toFixed(2) : 0,
      };
    } catch (error) {
      logger.error(`Error getting sale statistics ${saleId}:`, error);
      throw error;
    }
  }

  async getOrderStatistics(saleId) {
    try {
      // This would typically come from OrderService
      // For now, we'll implement a simple version
      const { getDatabase } = require('../config/database');
      const db = getDatabase();

      const sale = await this.flashSaleRepository.findById(saleId);
      if (!sale) {
        throw new Error('Flash sale not found');
      }

      const results = await db('orders')
        .where('product_id', sale.productId)
        .select('status')
        .count('* as count')
        .groupBy('status');

      const stats = results.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {});

      // Calculate total orders
      stats.total = Object.values(stats).reduce((sum, count) => sum + count, 0);

      return stats;
    } catch (error) {
      logger.error(`Error getting order statistics for sale ${saleId}:`, error);
      throw error;
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
      const existingSale = await this.flashSaleRepository.findById(saleId);
      if (!existingSale) {
        throw new Error('Flash sale not found');
      }

      // Validate product exists and has stock
      if (updateData.productId) {
        try {
          const stock = await this.stockRepository.findByProductId(updateData.productId);
          if (!stock) {
            throw new Error('Stock entry not found for product');
          }
        } catch (error) {
          if (error.code === '22P02') {
            // Invalid UUID format
            throw new Error('Product not found');
          }
          throw error;
        }
      }

      // Update the flash sale
      const updatedSale = await this.flashSaleRepository.update(saleId, {
        product_id: updateData.productId || existingSale.product_id,
        start_time: updateData.startTime || existingSale.start_time,
        end_time: updateData.endTime || existingSale.end_time,
        updated_at: new Date(),
      });

      // Clear cache
      const redis = getRedisClient();
      await redis.del(`flash_sale_status_${saleId}`);
      await redis.del('flash_sale_status');

      logger.info(`Flash sale ${saleId} updated successfully`);
      return updatedSale;
    } catch (error) {
      logger.error(`Error updating flash sale ${saleId}:`, error);
      throw error;
    }
  }

  /**
   * Get flash sale by ID
   * @param {string} saleId - The sale ID
   * @returns {Object|null} Flash sale or null if not found
   */
  async getFlashSaleById(saleId) {
    try {
      const flashSale = await this.flashSaleRepository.findById(saleId);
      return flashSale;
    } catch (error) {
      if (error.code === '22P02') {
        // Invalid UUID format
        return null; // Return null for invalid UUIDs, let the route handle 404
      }
      logger.error(`Error getting flash sale ${saleId}:`, error);
      throw error;
    }
  }

  /**
   * Get flash sale statistics (alias for getSaleStatistics)
   * @param {string} saleId - The sale ID
   * @returns {Object} Sale statistics
   */
  async getFlashSaleStats(saleId) {
    return this.getSaleStatistics(saleId);
  }
}

module.exports = FlashSaleService;
