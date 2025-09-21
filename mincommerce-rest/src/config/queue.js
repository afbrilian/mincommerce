const QueueFactory = require('../queue/QueueFactory')
const logger = require('../utils/logger')

let queueFactory = null

const initializeQueue = async () => {
  try {
    // Queue configuration
    const queueConfig = {
      default: process.env.QUEUE_PROVIDER || 'bull',
      providers: {
        bull: {
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            db: process.env.REDIS_DB || 0 // Use different Redis DB for tests
          }
        }
        // Note: Kafka and SQS providers are not implemented yet
        // They will be added in future phases when needed
      }
    }

    // Initialize queue factory
    queueFactory = new QueueFactory()
    await queueFactory.initializeProviders(queueConfig)

    // Register job processors
    // Note: Job processing is now handled by WorkerManager and PurchaseWorker

    logger.info(`Queue system initialized with provider: ${queueConfig.default}`)
    return queueFactory
  } catch (error) {
    logger.error('Queue initialization failed:', error)
    throw error
  }
}

const getQueueFactory = () => {
  if (!queueFactory) {
    throw new Error('Queue factory not initialized. Call initializeQueue() first.')
  }
  return queueFactory
}

// Note: addPurchaseJob function removed - job queuing is now handled by PurchaseQueueService

const getJob = async jobId => {
  const factory = getQueueFactory()
  return factory.getJob(jobId)
}

const getJobStatus = async jobId => {
  const factory = getQueueFactory()
  return factory.getJobStatus(jobId)
}

const getQueueStats = async () => {
  const factory = getQueueFactory()
  return factory.getStats()
}

const closeQueue = async () => {
  if (queueFactory) {
    await queueFactory.close()
    queueFactory = null
    logger.info('Queue system closed')
  }
}

module.exports = {
  initializeQueue,
  getQueueFactory,
  getJob,
  getJobStatus,
  getQueueStats,
  closeQueue
}
