const redis = require('redis')
const logger = require('../utils/logger')

let redisClient = null
let redisPublisher = null
let redisSubscriber = null

const connectRedis = async () => {
  try {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retry_strategy: options => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.error('Redis server connection refused')
          return new Error('Redis server connection refused')
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          logger.error('Redis retry time exhausted')
          return new Error('Retry time exhausted')
        }
        if (options.attempt > 10) {
          logger.error('Redis max retry attempts reached')
          return undefined
        }
        return Math.min(options.attempt * 100, 3000)
      }
    }

    // Create Redis clients for different purposes
    redisClient = redis.createClient(redisConfig)
    redisPublisher = redis.createClient(redisConfig)
    redisSubscriber = redis.createClient(redisConfig)

    // Event handlers for main client
    redisClient.on('connect', () => {
      logger.info('Redis client connected')
    })

    redisClient.on('error', error => {
      logger.error('Redis client error:', error)
    })

    redisClient.on('end', () => {
      logger.info('Redis client connection ended')
    })

    // Event handlers for publisher
    redisPublisher.on('connect', () => {
      logger.info('Redis publisher connected')
    })

    redisPublisher.on('error', error => {
      logger.error('Redis publisher error:', error)
    })

    // Event handlers for subscriber
    redisSubscriber.on('connect', () => {
      logger.info('Redis subscriber connected')
    })

    redisSubscriber.on('error', error => {
      logger.error('Redis subscriber error:', error)
    })

    // Connect all clients
    await Promise.all([redisClient.connect(), redisPublisher.connect(), redisSubscriber.connect()])

    logger.info('Redis connections established')
    return { redisClient, redisPublisher, redisSubscriber }
  } catch (error) {
    logger.error('Redis connection failed:', error)
    throw error
  }
}

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call connectRedis() first.')
  }
  return redisClient
}

const getRedisPublisher = () => {
  if (!redisPublisher) {
    throw new Error('Redis publisher not initialized. Call connectRedis() first.')
  }
  return redisPublisher
}

const getRedisSubscriber = () => {
  if (!redisSubscriber) {
    throw new Error('Redis subscriber not initialized. Call connectRedis() first.')
  }
  return redisSubscriber
}

const closeRedis = async () => {
  const promises = []

  if (redisClient) {
    promises.push(redisClient.quit())
  }
  if (redisPublisher) {
    promises.push(redisPublisher.quit())
  }
  if (redisSubscriber) {
    promises.push(redisSubscriber.quit())
  }

  await Promise.all(promises)
  logger.info('Redis connections closed')
}

module.exports = {
  connectRedis,
  getRedisClient,
  getRedisPublisher,
  getRedisSubscriber,
  closeRedis
}
