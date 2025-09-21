const OrderRepository = require('../repositories/OrderRepository')
const UserRepository = require('../repositories/UserRepository')
const FlashSaleRepository = require('../repositories/FlashSaleRepository')
const StockRepository = require('../repositories/StockRepository')
const { getRedisClient } = require('../config/redis')
const logger = require('../utils/logger')
const CONSTANTS = require('../constants')

// Helper function to generate hash code for lock ID
String.prototype.hashCode = function () {
  let hash = 0
  for (let i = 0; i < this.length; i++) {
    const char = this.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

class PurchaseService {
  constructor() {
    this.orderRepository = new OrderRepository()
    this.userRepository = new UserRepository()
    this.flashSaleRepository = new FlashSaleRepository()
    this.stockRepository = new StockRepository()
  }

  /**
   * Attempt to purchase a flash sale item
   * @param {string} userId - User ID attempting the purchase
   * @returns {Object} Purchase result
   */
  async attemptPurchase(userId) {
    try {
      logger.info(`Purchase attempt started`, { userId })

      // Validate input
      if (!userId) {
        throw new Error('User ID is required')
      }

      const redis = getRedisClient()

      // Check if user already has an order (fast cache check)
      const userOrderKey = CONSTANTS.REDIS_KEYS.USER_ORDER(userId)
      const existingOrder = await redis.get(userOrderKey)

      if (existingOrder) {
        logger.warn(`User already has an order`, { userId })
        return {
          success: false,
          reason: CONSTANTS.RESPONSE_CODES.ALREADY_PURCHASED
        }
      }

      // Get most recent flash sale
      const recentSale = await this.flashSaleRepository.getMostRecentSale()
      if (!recentSale) {
        logger.warn(`No flash sale found`)
        return {
          success: false,
          reason: 'No flash sale found'
        }
      }

      // Check if sale has started
      const now = new Date()
      if (now < new Date(recentSale.start_time)) {
        logger.warn(`Flash sale has not started`, {
          userId,
          startTime: recentSale.start_time,
          now: now.toISOString()
        })
        return {
          success: false,
          reason: CONSTANTS.RESPONSE_CODES.SALE_NOT_ACTIVE
        }
      }

      // Check if sale has ended
      if (now > new Date(recentSale.end_time)) {
        logger.warn(`Flash sale has ended`, {
          userId,
          endTime: recentSale.end_time,
          now: now.toISOString()
        })
        return {
          success: false,
          reason: CONSTANTS.RESPONSE_CODES.SALE_NOT_ACTIVE
        }
      }

      // Get product and stock information
      const product = await this.flashSaleRepository.getProductBySaleId(recentSale.sale_id)
      if (!product) {
        logger.error(`Product not found for sale`, { userId, saleId: recentSale.sale_id })
        return {
          success: false,
          reason: 'Product not found'
        }
      }

      const stock = await this.stockRepository.findByProductId(product.product_id)
      if (!stock || stock.available_quantity <= 0) {
        logger.warn(`Product is out of stock`, { userId, productId: product.product_id })
        return {
          success: false,
          reason: CONSTANTS.RESPONSE_CODES.OUT_OF_STOCK
        }
      }

      // Use PostgreSQL advisory lock for atomic inventory check and update
      const lockId = `inventory_${product.product_id}`.hashCode()

      logger.info(`Acquiring lock for purchase`, {
        userId,
        productId: product.product_id,
        lockId,
        lockString: `inventory_${product.product_id}`
      })

      try {
        // Acquire advisory lock
        await this.stockRepository.acquireLock(lockId)

        // Double-check stock availability under lock
        const currentStock = await this.stockRepository.findByProductId(product.product_id)
        if (!currentStock || currentStock.available_quantity <= 0) {
          logger.warn(`Stock exhausted during purchase`, { userId, productId: product.product_id })
          return {
            success: false,
            reason: CONSTANTS.RESPONSE_CODES.OUT_OF_STOCK
          }
        }

        // Update stock (decrease by 1) BEFORE creating order
        const updatedStock = await this.stockRepository.updateAvailableQuantity(
          product.product_id,
          -1
        )

        if (!updatedStock) {
          logger.warn(`Failed to update stock - insufficient quantity`, {
            userId,
            productId: product.product_id
          })
          return {
            success: false,
            reason: CONSTANTS.RESPONSE_CODES.OUT_OF_STOCK
          }
        }

        // Create order after successful stock update
        const orderData = {
          user_id: userId,
          product_id: product.product_id,
          status: 'confirmed',
          created_at: new Date(),
          updated_at: new Date()
        }

        const order = await this.orderRepository.create(orderData)

        // Cache user order in Redis
        await redis.setEx(
          userOrderKey,
          3600,
          JSON.stringify({
            orderId: order.order_id,
            productId: product.product_id,
            status: 'confirmed',
            purchasedAt: order.created_at
          })
        )

        // Invalidate flash sale status cache to force fresh stock data
        const flashSaleCacheKeys = ['flash_sale_status', `flash_sale_status_${recentSale.sale_id}`]

        for (const cacheKey of flashSaleCacheKeys) {
          await redis.del(cacheKey)
        }

        logger.info(`Purchase successful and cache invalidated`, {
          userId,
          orderId: order.order_id,
          productId: product.product_id,
          invalidatedCacheKeys: flashSaleCacheKeys
        })

        return {
          success: true,
          data: {
            orderId: order.order_id,
            productId: product.product_id,
            userId: userId,
            status: 'confirmed',
            purchasedAt: order.created_at
          }
        }
      } finally {
        // Always release the lock
        logger.info(`Releasing lock for purchase`, {
          userId,
          productId: product.product_id,
          lockId
        })
        await this.stockRepository.releaseLock(lockId)
      }
    } catch (error) {
      logger.error('Purchase attempt failed:', error)

      if (error.message.includes('already purchased')) {
        return {
          success: false,
          reason: CONSTANTS.RESPONSE_CODES.ALREADY_PURCHASED
        }
      }

      // Handle database constraint violations
      if (error.code === '23505' && error.constraint === 'orders_user_id_product_id_unique') {
        return {
          success: false,
          reason: CONSTANTS.RESPONSE_CODES.ALREADY_PURCHASED
        }
      }

      // Handle other database errors
      if (error.code === '23503') {
        return {
          success: false,
          reason: CONSTANTS.RESPONSE_CODES.PRODUCT_NOT_FOUND
        }
      }

      // Handle generic database connection errors
      if (
        error.message.includes('Database connection failed') ||
        error.message.includes('connection')
      ) {
        return {
          success: false,
          reason: CONSTANTS.RESPONSE_CODES.DATABASE_CONNECTION_FAILED
        }
      }

      // For any other errors, return a generic failure
      return {
        success: false,
        reason: error.message || 'Purchase failed due to an unexpected error'
      }
    }
  }

  /**
   * Check user's purchase status
   * @param {string} userId - User ID to check
   * @returns {Object} Purchase status
   */
  async checkPurchaseStatus(userId) {
    try {
      logger.info(`Checking purchase status`, { userId })

      if (!userId) {
        throw new Error('User ID is required')
      }

      const redis = getRedisClient()

      // Check Redis cache first
      const userOrderKey = CONSTANTS.REDIS_KEYS.USER_ORDER(userId)
      const cachedOrder = await redis.get(userOrderKey)

      if (cachedOrder) {
        const orderData = JSON.parse(cachedOrder)
        logger.info(`Purchase status found in cache`, { userId, orderId: orderData.orderId })

        return {
          data: {
            hasPurchased: true,
            orderId: orderData.orderId,
            productId: orderData.productId,
            status: orderData.status,
            purchasedAt: orderData.purchasedAt
          }
        }
      }

      // Check database for any orders
      const orders = await this.orderRepository.findByUserId(userId)

      if (orders && orders.length > 0) {
        const order = orders[0] // Get the first order

        // Cache the result
        await redis.setex(
          userOrderKey,
          3600,
          JSON.stringify({
            orderId: order.order_id,
            productId: order.product_id,
            status: order.status,
            purchasedAt: order.created_at
          })
        )

        logger.info(`Purchase status found in database`, { userId, orderId: order.order_id })

        return {
          data: {
            hasPurchased: true,
            orderId: order.order_id,
            productId: order.product_id,
            status: order.status,
            purchasedAt: order.created_at
          }
        }
      }

      logger.info(`No purchase found`, { userId })

      return {
        data: {
          hasPurchased: false,
          orderId: null,
          productId: null,
          status: null,
          purchasedAt: null
        }
      }
    } catch (error) {
      logger.error('Failed to check purchase status:', error)
      throw error
    }
  }

  /**
   * Get user's orders
   * @param {string} userId - User ID
   * @returns {Object} User orders
   */
  async getUserOrders(userId) {
    try {
      const orders = await this.orderRepository.findByUserId(userId)

      return {
        success: true,
        data: orders || []
      }
    } catch (error) {
      logger.error('Failed to get user orders:', error)
      throw error
    }
  }
}

module.exports = PurchaseService
