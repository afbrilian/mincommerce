const BaseRepository = require('./BaseRepository');
const Product = require('../models/Product');
const logger = require('../utils/logger');

class ProductRepository extends BaseRepository {
  constructor() {
    super('products');
  }

  async findById(productId) {
    try {
      const result = await this.db(this.tableName).where('product_id', productId).first();
      return result ? Product.fromDatabase(result) : null;
    } catch (error) {
      logger.error(`Error finding product by id ${productId}:`, error);
      throw error;
    }
  }

  async findAll(limit = 100, offset = 0) {
    try {
      const results = await this.db(this.tableName).select('*').limit(limit).offset(offset);
      return results.map(product => Product.fromDatabase(product));
    } catch (error) {
      logger.error('Error finding all products:', error);
      throw error;
    }
  }

  async create(productData) {
    try {
      const results = await this.db(this.tableName).insert(productData).returning('*');
      return Product.fromDatabase(results[0]);
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  async update(productId, productData) {
    try {
      const result = await this.db(this.tableName)
        .where('product_id', productId)
        .update({
          ...productData,
          updated_at: this.db.fn.now(),
        })
        .returning('*')
        .first();
      return result ? Product.fromDatabase(result) : null;
    } catch (error) {
      logger.error(`Error updating product ${productId}:`, error);
      throw error;
    }
  }
}

module.exports = ProductRepository;
