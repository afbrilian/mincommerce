const BaseRepository = require('./BaseRepository');
const FlashSale = require('../models/FlashSale');
const logger = require('../utils/logger');

class FlashSaleRepository extends BaseRepository {
  constructor() {
    super('flash_sales');
  }

  async findById(saleId) {
    try {
      const result = await this.db(this.tableName).where('sale_id', saleId).first();
      return result ? FlashSale.fromDatabase(result) : null;
    } catch (error) {
      logger.error(`Error finding flash sale by id ${saleId}:`, error);
      throw error;
    }
  }

  async findByProductId(productId) {
    try {
      const result = await this.db(this.tableName)
        .where('product_id', productId)
        .orderBy('created_at', 'desc')
        .first();
      return result ? FlashSale.fromDatabase(result) : null;
    } catch (error) {
      logger.error(`Error finding flash sale by product id ${productId}:`, error);
      throw error;
    }
  }

  async findActiveSales() {
    try {
      const now = new Date();
      const results = await this.db(this.tableName)
        .where('status', 'active')
        .where('start_time', '<=', now)
        .where('end_time', '>=', now);
      return results.map(sale => FlashSale.fromDatabase(sale));
    } catch (error) {
      logger.error('Error finding active flash sales:', error);
      throw error;
    }
  }

  async findUpcomingSales() {
    try {
      const now = new Date();
      const results = await this.db(this.tableName)
        .where('status', 'upcoming')
        .where('start_time', '>', now);
      return results.map(sale => FlashSale.fromDatabase(sale));
    } catch (error) {
      logger.error('Error finding upcoming flash sales:', error);
      throw error;
    }
  }

  async create(saleData) {
    try {
      const result = await this.db(this.tableName).insert(saleData).returning('*').first();
      return FlashSale.fromDatabase(result);
    } catch (error) {
      logger.error('Error creating flash sale:', error);
      throw error;
    }
  }

  async updateStatus(saleId, status) {
    try {
      const result = await this.db(this.tableName)
        .where('sale_id', saleId)
        .update({
          status,
          updated_at: this.db.fn.now(),
        })
        .returning('*')
        .first();
      return result ? FlashSale.fromDatabase(result) : null;
    } catch (error) {
      logger.error(`Error updating flash sale status ${saleId}:`, error);
      throw error;
    }
  }

  async updateStatusByTime() {
    try {
      const now = new Date();

      // Update upcoming sales to active
      await this.db(this.tableName)
        .where('status', 'upcoming')
        .where('start_time', '<=', now)
        .where('end_time', '>=', now)
        .update({
          status: 'active',
          updated_at: now,
        });

      // Update active sales to ended
      await this.db(this.tableName).where('status', 'active').where('end_time', '<', now).update({
        status: 'ended',
        updated_at: now,
      });

      logger.info('Flash sale statuses updated based on time');
    } catch (error) {
      logger.error('Error updating flash sale statuses by time:', error);
      throw error;
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
          'products.price',
          'products.image_url',
          'stocks.available_quantity',
          'stocks.total_quantity'
        )
        .where('flash_sales.sale_id', saleId)
        .first();

      return result;
    } catch (error) {
      logger.error(`Error getting flash sale with product and stock ${saleId}:`, error);
      throw error;
    }
  }
}

module.exports = FlashSaleRepository;
