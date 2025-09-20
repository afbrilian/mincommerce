const Queue = require('bull');
const logger = require('../utils/logger');

let purchaseQueue = null;

const initializeQueue = async () => {
  try {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    };

    // Create purchase queue
    purchaseQueue = new Queue('purchase processing', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    // Queue event handlers
    purchaseQueue.on('completed', (job, result) => {
      logger.info(`Purchase job ${job.id} completed:`, result);
    });

    purchaseQueue.on('failed', (job, error) => {
      logger.error(`Purchase job ${job.id} failed:`, error.message);
    });

    purchaseQueue.on('stalled', job => {
      logger.warn(`Purchase job ${job.id} stalled`);
    });

    // Process jobs
    purchaseQueue.process('process-purchase', require('../jobs/processPurchase'));

    logger.info('Purchase queue initialized');
    return purchaseQueue;
  } catch (error) {
    logger.error('Queue initialization failed:', error);
    throw error;
  }
};

const getPurchaseQueue = () => {
  if (!purchaseQueue) {
    throw new Error('Purchase queue not initialized. Call initializeQueue() first.');
  }
  return purchaseQueue;
};

const addPurchaseJob = async purchaseData => {
  const queue = getPurchaseQueue();
  const job = await queue.add('process-purchase', purchaseData, {
    priority: 1, // Higher priority for purchase jobs
    delay: 0, // Process immediately
  });

  logger.info(`Purchase job added: ${job.id}`);
  return job;
};

const closeQueue = async () => {
  if (purchaseQueue) {
    await purchaseQueue.close();
    logger.info('Purchase queue closed');
  }
};

module.exports = {
  initializeQueue,
  getPurchaseQueue,
  addPurchaseJob,
  closeQueue,
};
