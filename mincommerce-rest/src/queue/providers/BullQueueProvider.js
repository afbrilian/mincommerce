const Queue = require('bull');
const QueueInterface = require('../QueueInterface');
const logger = require('../../utils/logger');

/**
 * Bull Queue Provider - Redis-based queue implementation
 * Good for: Medium to high volume, Redis infrastructure
 */
class BullQueueProvider extends QueueInterface {
  constructor(config) {
    super();
    this.config = config;
    this.queues = new Map();
    this.initializeQueues();
  }

  initializeQueues() {
    const redisConfig = {
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
    };

    // Initialize purchase queue
    const purchaseQueue = new Queue('purchase-processing', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    // Event handlers
    purchaseQueue.on('completed', (job, result) => {
      logger.info(`Bull job ${job.id} completed:`, result);
    });

    purchaseQueue.on('failed', (job, error) => {
      logger.error(`Bull job ${job.id} failed:`, error.message);
    });

    purchaseQueue.on('stalled', (job) => {
      logger.warn(`Bull job ${job.id} stalled`);
    });

    this.queues.set('purchase-processing', purchaseQueue);
    logger.info('Bull queue provider initialized');
  }

  async addJob(type, data, options = {}) {
    const queue = this.queues.get(type);
    if (!queue) {
      throw new Error(`Queue ${type} not found`);
    }

    const job = await queue.add('process', data, {
      priority: options.priority || 1,
      delay: options.delay || 0,
      ...options,
    });

    logger.info(`Bull job added: ${job.id} to queue ${type}`);
    return {
      id: job.id,
      type,
      data,
      status: 'queued',
      provider: 'bull',
    };
  }

  process(type, processor) {
    const queue = this.queues.get(type);
    if (!queue) {
      throw new Error(`Queue ${type} not found`);
    }

    queue.process('process', processor);
    logger.info(`Bull processor registered for queue ${type}`);
  }

  async getJob(jobId) {
    // Try to find job in any queue
    for (const [type, queue] of this.queues) {
      const job = await queue.getJob(jobId);
      if (job) {
        return {
          id: job.id,
          type,
          data: job.data,
          status: await job.getState(),
          provider: 'bull',
          progress: job.progress(),
        };
      }
    }
    return null;
  }

  async getJobStatus(jobId) {
    const job = await this.getJob(jobId);
    return job ? job.status : 'not_found';
  }

  async close() {
    const promises = Array.from(this.queues.values()).map(queue => queue.close());
    await Promise.all(promises);
    logger.info('Bull queue provider closed');
  }

  async getStats() {
    const stats = {};
    for (const [type, queue] of this.queues) {
      const counts = await queue.getJobCounts();
      stats[type] = {
        waiting: counts.waiting,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
        delayed: counts.delayed,
      };
    }
    return stats;
  }
}

module.exports = BullQueueProvider;
