const OrderRepository = require('../repositories/OrderRepository')
const UserRepository = require('../repositories/UserRepository')
const FlashSaleRepository = require('../repositories/FlashSaleRepository')
const StockRepository = require('../repositories/StockRepository')
const { getRedisClient } = require('../config/redis')
const { addPurchaseJob } = require('../config/queue')
const logger = require('../utils/logger')
const CONSTANTS = require('../constants')

class PurchaseService {
  constructor() {
    this.orderRepository = new OrderRepository()
    this.userRepository = new UserRepository()
    this.flashSaleRepository = new FlashSaleRepository()
    this.stockRepository = new StockRepository()
  }

  async attemptPurchase(purchaseData) {
    try {
      const { userId, productId, saleId } = purchaseData

      // Validate input
      if (!userId || !productId || !saleId) {
        throw new Error('Missing required fields: userId, productId, saleId')
      }

      const redis = getRedisClient()

      // Check if user already has an order (fast cache check)
      const cacheKey = CONSTANTS.REDIS_KEYS.USER_ORDER(userId, productId)
      const existingOrderId = await redis.get(cacheKey)

      if (existingOrderId) {
        logger.info(`User ${userId} already has order ${existingOrderId} for product ${productId}`)
        return {
          success: false,
          reason: CONSTANTS.RESPONSE_CODES.ALREADY_PURCHASED,
          orderId: existingOrderId
        }
      }

      // Check rate limiting
      const rateLimitKey = CONSTANTS.REDIS_KEYS.RATE_LIMIT(userId)
      const attemptCount = await redis.incr(rateLimitKey)

      if (attemptCount === 1) {
        await redis.expire(rateLimitKey, CONSTANTS.CACHE_TTL.RATE_LIMIT)
      }

      if (attemptCount > CONSTANTS.RATE_LIMITS.MAX_ATTEMPTS_PER_MINUTE) {
        logger.warn(`Rate limit exceeded for user ${userId}: ${attemptCount} attempts`)
        throw new Error(CONSTANTS.ERROR_MESSAGES.TOO_MANY_ATTEMPTS)
      }

      // Check flash sale status quickly
      const saleStatusKey = CONSTANTS.REDIS_KEYS.FLASH_SALE_STATUS()
      const cachedSale = await redis.get(saleStatusKey)

      if (cachedSale) {
        const sale = JSON.parse(cachedSale)
        if (sale.status !== CONSTANTS.SALE_STATUS.ACTIVE) {
          return {
            success: false,
            reason: CONSTANTS.RESPONSE_CODES.SALE_NOT_ACTIVE,
            saleStatus: sale.status
          }
        }

        if (sale.availableQuantity <= 0) {
          return {
            success: false,
            reason: CONSTANTS.RESPONSE_CODES.OUT_OF_STOCK
          }
        }
      }

      // Add purchase job to queue
      const job = await addPurchaseJob({
        userId,
        productId,
        saleId,
        timestamp: new Date().toISOString()
      })

      logger.info(`Purchase job queued for user ${userId}, job ID: ${job.id}`)

      return {
        success: true,
        message: CONSTANTS.SUCCESS_MESSAGES.PURCHASE_QUEUED,
        jobId: job.id,
        status: 'processing'
      }
    } catch (error) {
      logger.error('Purchase attempt failed:', error)
      throw error
    }
  }

  async checkPurchaseStatus(userId, productId) {
    try {
      const redis = getRedisClient()

      // Check cache first
      const cacheKey = CONSTANTS.REDIS_KEYS.USER_ORDER(userId, productId)
      const orderId = await redis.get(cacheKey)

      if (orderId) {
        // Get order details from cache
        const orderCacheKey = CONSTANTS.REDIS_KEYS.ORDER(orderId)
        const orderData = await redis.get(orderCacheKey)

        if (orderData) {
          const order = JSON.parse(orderData)
          return {
            hasOrder: true,
            orderId: order.order_id,
            status: order.status,
            createdAt: order.created_at
          }
        }
      }

      // Check database
      const order = await this.orderRepository.findByUserAndProduct(userId, productId)

      if (order) {
        // Update cache
        await redis.setex(cacheKey, CONSTANTS.CACHE_TTL.USER_ORDER, order.orderId)
        await redis.setex(
          CONSTANTS.REDIS_KEYS.ORDER(order.orderId),
          CONSTANTS.CACHE_TTL.ORDER_DETAILS,
          JSON.stringify(order.toJSON())
        )

        return {
          hasOrder: true,
          orderId: order.orderId,
          status: order.status,
          createdAt: order.createdAt
        }
      }

      return {
        hasOrder: false,
        message: 'No order found for this user and product'
      }
    } catch (error) {
      logger.error('Error checking purchase status:', error)
      throw error
    }
  }

  async getUserOrders(userId) {
    try {
      const orders = await this.orderRepository.getUserOrdersWithProducts(userId)

      return {
        userId,
        orders: orders.map(order => ({
          orderId: order.order_id,
          status: order.status,
          createdAt: order.created_at,
          product: {
            name: order.product_name,
            price: order.price,
            imageUrl: order.image_url
          }
        }))
      }
    } catch (error) {
      logger.error(`Error getting user orders for ${userId}:`, error)
      throw error
    }
  }

  async processPurchase(purchaseData) {
    try {
      const { userId, productId, saleId } = purchaseData

      // This method is called by the queue worker
      const { getDatabase } = require('../config/database')
      const db = getDatabase()

      // Use PostgreSQL advisory lock to ensure atomicity
      const lockKey = `${CONSTANTS.DATABASE.ADVISORY_LOCK_PREFIX}${saleId}_product_${productId}`

      // Try to acquire advisory lock (this will block other processes)
      await db.raw('SELECT pg_advisory_lock(hashtext(?))', [lockKey])

      try {
        // Check if user already purchased
        const existingOrder = await this.orderRepository.findByUserAndProduct(userId, productId)

        if (existingOrder) {
          logger.info(`User ${userId} already has an order for product ${productId}`)
          return {
            success: false,
            reason: CONSTANTS.RESPONSE_CODES.ALREADY_PURCHASED,
            orderId: existingOrder.orderId
          }
        }

        // Check flash sale status
        const sale = await this.flashSaleRepository.findById(saleId)

        if (!sale || sale.status !== CONSTANTS.SALE_STATUS.ACTIVE) {
          logger.info(`Flash sale ${saleId} is not active`)
          return { success: false, reason: CONSTANTS.RESPONSE_CODES.SALE_NOT_ACTIVE }
        }

        // Check current time
        const now = new Date()
        if (now < sale.startTime || now > sale.endTime) {
          logger.info(`Flash sale ${saleId} is outside time window`)
          return { success: false, reason: CONSTANTS.RESPONSE_CODES.SALE_OUTSIDE_TIME_WINDOW }
        }

        // Check and update stock atomically
        const stock = await this.stockRepository.reserveStock(productId, 1)

        if (!stock) {
          logger.info(`No stock available for product ${productId}`)
          return { success: false, reason: CONSTANTS.RESPONSE_CODES.OUT_OF_STOCK }
        }

        // Create order
        const order = await this.orderRepository.create({
          userId,
          productId,
          status: CONSTANTS.ORDER_STATUS.CONFIRMED
        })

        // Confirm stock (move from reserved to sold)
        await this.stockRepository.confirmStock(productId, 1)

        // Update cache
        const redis = getRedisClient()
        await redis.setex(
          CONSTANTS.REDIS_KEYS.ORDER(order.orderId),
          CONSTANTS.CACHE_TTL.ORDER_DETAILS,
          JSON.stringify(order.toJSON())
        )
        await redis.setex(
          CONSTANTS.REDIS_KEYS.USER_ORDER(userId, productId),
          CONSTANTS.CACHE_TTL.USER_ORDER,
          order.orderId
        )

        // Update stock cache
        const updatedStock = await this.stockRepository.findByProductId(productId)
        await redis.hset(CONSTANTS.REDIS_KEYS.STOCK(productId), {
          available: updatedStock.availableQuantity,
          reserved: updatedStock.reservedQuantity
        })

        logger.info(`Purchase successful for user ${userId}, order ${order.orderId}`)

        return {
          success: true,
          orderId: order.orderId,
          remainingStock: updatedStock.availableQuantity,
          message: CONSTANTS.SUCCESS_MESSAGES.PURCHASE_SUCCESSFUL
        }
      } finally {
        // Always release the advisory lock
        await db.raw('SELECT pg_advisory_unlock(hashtext(?))', [lockKey])
      }
    } catch (error) {
      logger.error(`Purchase processing failed for user ${purchaseData.userId}:`, error)
      throw error
    }
  }
}

module.exports = PurchaseService
