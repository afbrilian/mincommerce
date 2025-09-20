const BaseRepository = require('./BaseRepository');
const Order = require('../models/Order');
const logger = require('../utils/logger');

class OrderRepository extends BaseRepository {
  constructor() {
    super('orders');
  }

  async findById(orderId) {
    try {
      const result = await this.db(this.tableName).where('order_id', orderId).first();
      return result ? Order.fromDatabase(result) : null;
    } catch (error) {
      logger.error(`Error finding order by id ${orderId}:`, error);
      throw error;
    }
  }

  async findByUserAndProduct(userId, productId) {
    try {
      const result = await this.db(this.tableName)
        .where('user_id', userId)
        .where('product_id', productId)
        .first();
      return result ? Order.fromDatabase(result) : null;
    } catch (error) {
      logger.error(`Error finding order by user ${userId} and product ${productId}:`, error);
      throw error;
    }
  }

  async findByUserId(userId) {
    try {
      const results = await this.db(this.tableName)
        .where('user_id', userId)
        .orderBy('created_at', 'desc');
      return results.map(order => Order.fromDatabase(order));
    } catch (error) {
      logger.error(`Error finding orders by user id ${userId}:`, error);
      throw error;
    }
  }

  async findByProductId(productId) {
    try {
      const results = await this.db(this.tableName)
        .where('product_id', productId)
        .orderBy('created_at', 'desc');
      return results.map(order => Order.fromDatabase(order));
    } catch (error) {
      logger.error(`Error finding orders by product id ${productId}:`, error);
      throw error;
    }
  }

  async create(orderData) {
    try {
      const results = await this.db(this.tableName).insert(orderData).returning('*');
      return Order.fromDatabase(results[0]);
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  async updateStatus(orderId, status) {
    try {
      const result = await this.db(this.tableName)
        .where('order_id', orderId)
        .update({
          status,
          updated_at: this.db.fn.now(),
        })
        .returning('*')
        .first();
      return result ? Order.fromDatabase(result) : null;
    } catch (error) {
      logger.error(`Error updating order status ${orderId}:`, error);
      throw error;
    }
  }

  async getUserOrdersWithProducts(userId) {
    try {
      const results = await this.db(this.tableName)
        .join('products', 'orders.product_id', 'products.product_id')
        .select(
          'orders.order_id',
          'orders.status',
          'orders.created_at',
          'products.name as product_name',
          'products.price',
          'products.image_url'
        )
        .where('orders.user_id', userId)
        .orderBy('orders.created_at', 'desc');

      return results;
    } catch (error) {
      logger.error(`Error getting user orders with products for user ${userId}:`, error);
      throw error;
    }
  }

  async getOrderStats() {
    try {
      const results = await this.db(this.tableName)
        .select('status')
        .count('* as count')
        .groupBy('status');

      return results.reduce((stats, row) => {
        stats[row.status] = parseInt(row.count);
        return stats;
      }, {});
    } catch (error) {
      logger.error('Error getting order stats:', error);
      throw error;
    }
  }

  async hasUserPurchased(userId, productId) {
    try {
      const result = await this.db(this.tableName)
        .where('user_id', userId)
        .where('product_id', productId)
        .count('* as count')
        .first();
      return parseInt(result.count) > 0;
    } catch (error) {
      logger.error(`Error checking if user ${userId} purchased product ${productId}:`, error);
      throw error;
    }
  }
}

module.exports = OrderRepository;
