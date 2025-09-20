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
      await redis.setex(cacheKey, 30, JSON.stringify(saleStatus));

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
      const stock = await this.stockRepository.findByProductId(saleData.productId);
      if (!stock) {
        throw new Error('Product not found or has no stock');
      }

      const flashSale = await this.flashSaleRepository.create({
        ...saleData,
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
        failedOrders: orderStats.failed || 0,
        totalQuantity: stock?.totalQuantity || 0,
        availableQuantity: stock?.availableQuantity || 0,
        soldQuantity: stock ? stock.totalQuantity - stock.availableQuantity : 0,
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

      return results.reduce((stats, row) => {
        stats[row.status] = parseInt(row.count);
        return stats;
      }, {});
    } catch (error) {
      logger.error(`Error getting order statistics for sale ${saleId}:`, error);
      throw error;
    }
  }
}

module.exports = FlashSaleService;
