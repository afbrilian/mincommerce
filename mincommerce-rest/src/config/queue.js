const QueueFactory = require('../queue/QueueFactory');
const logger = require('../utils/logger');

let queueFactory = null;

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
          },
        },
        kafka: {
          clientId: process.env.KAFKA_CLIENT_ID || 'mincommerce-api',
          brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
          ssl: process.env.KAFKA_SSL === 'true',
          sasl: process.env.KAFKA_USERNAME ? {
            mechanism: 'plain',
            username: process.env.KAFKA_USERNAME,
            password: process.env.KAFKA_PASSWORD,
          } : undefined,
        },
        sqs: {
          region: process.env.AWS_REGION || 'us-east-1',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      },
    };

    // Initialize queue factory
    queueFactory = new QueueFactory();
    await queueFactory.initializeProviders(queueConfig);

    // Register job processors
    queueFactory.process('purchase-processing', require('../jobs/processPurchase'));

    logger.info(`Queue system initialized with provider: ${queueConfig.default}`);
    return queueFactory;

  } catch (error) {
    logger.error('Queue initialization failed:', error);
    throw error;
  }
};

const getQueueFactory = () => {
  if (!queueFactory) {
    throw new Error('Queue factory not initialized. Call initializeQueue() first.');
  }
  return queueFactory;
};

const addPurchaseJob = async (purchaseData) => {
  const factory = getQueueFactory();
  const job = await factory.addJob('purchase-processing', purchaseData, {
    priority: 1, // Higher priority for purchase jobs
    delay: 0, // Process immediately
  });
  
  logger.info(`Purchase job added: ${job.id} via ${job.provider}`);
  return job;
};

const getJob = async (jobId) => {
  const factory = getQueueFactory();
  return factory.getJob(jobId);
};

const getJobStatus = async (jobId) => {
  const factory = getQueueFactory();
  return factory.getJobStatus(jobId);
};

const getQueueStats = async () => {
  const factory = getQueueFactory();
  return factory.getStats();
};

const closeQueue = async () => {
  if (queueFactory) {
    await queueFactory.close();
    queueFactory = null;
    logger.info('Queue system closed');
  }
};

module.exports = {
  initializeQueue,
  getQueueFactory,
  addPurchaseJob,
  getJob,
  getJobStatus,
  getQueueStats,
  closeQueue,
};