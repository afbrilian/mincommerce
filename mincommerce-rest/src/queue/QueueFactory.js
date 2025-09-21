const BullQueueProvider = require('./providers/BullQueueProvider')
const KafkaQueueProvider = require('./providers/KafkaQueueProvider')
const SQSQueueProvider = require('./providers/SQSQueueProvider')
const logger = require('../utils/logger')

/**
 * Queue Factory - Creates and manages queue providers
 * Supports multiple providers: Bull, Kafka, SQS
 */
class QueueFactory {
  constructor() {
    this.providers = new Map()
    this.defaultProvider = null
  }

  /**
   * Create a queue provider based on configuration
   * @param {string} providerType - Type of provider (bull, kafka, sqs)
   * @param {Object} config - Provider configuration
   * @returns {QueueInterface} Queue provider instance
   */
  createProvider(providerType, config) {
    switch (providerType.toLowerCase()) {
      case 'bull':
        return new BullQueueProvider(config)
      case 'kafka':
        return new KafkaQueueProvider(config)
      case 'sqs':
        return new SQSQueueProvider(config)
      default:
        throw new Error(`Unsupported queue provider: ${providerType}`)
    }
  }

  /**
   * Initialize queue providers from configuration
   * @param {Object} queueConfig - Queue configuration
   */
  async initializeProviders(queueConfig) {
    try {
      // Initialize default provider
      const defaultProviderType = queueConfig.default || 'bull'
      const defaultConfig = queueConfig.providers[defaultProviderType]

      if (!defaultConfig) {
        throw new Error(`Configuration not found for provider: ${defaultProviderType}`)
      }

      this.defaultProvider = this.createProvider(defaultProviderType, defaultConfig)
      this.providers.set('default', this.defaultProvider)

      // Initialize additional providers if configured
      for (const [providerType, config] of Object.entries(queueConfig.providers)) {
        if (providerType !== defaultProviderType) {
          const provider = this.createProvider(providerType, config)
          this.providers.set(providerType, provider)
        }
      }

      logger.info(
        `Queue factory initialized with providers: ${Array.from(this.providers.keys()).join(', ')}`
      )
    } catch (error) {
      logger.error('Failed to initialize queue providers:', error)
      throw error
    }
  }

  /**
   * Get a specific queue provider
   * @param {string} providerType - Provider type (optional, defaults to default provider)
   * @returns {QueueInterface} Queue provider instance
   */
  getProvider(providerType = 'default') {
    const provider = this.providers.get(providerType)
    if (!provider) {
      throw new Error(`Queue provider not found: ${providerType}`)
    }
    return provider
  }

  /**
   * Get the default queue provider
   * @returns {QueueInterface} Default queue provider
   */
  getDefaultProvider() {
    if (!this.defaultProvider) {
      throw new Error('No default queue provider initialized')
    }
    return this.defaultProvider
  }

  /**
   * Add a job to the default queue
   * @param {string} type - Job type
   * @param {Object} data - Job data
   * @param {Object} options - Job options
   * @returns {Promise<Object>} Job instance
   */
  async addJob(type, data, options = {}) {
    return this.getDefaultProvider().addJob(type, data, options)
  }

  /**
   * Process jobs on the default queue
   * @param {string} type - Job type
   * @param {Function} processor - Job processor
   */
  process(type, processor) {
    this.getDefaultProvider().process(type, processor)
  }

  /**
   * Get job by ID from all providers
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job instance
   */
  async getJob(jobId) {
    // Try all providers to find the job
    for (const [providerType, provider] of this.providers) {
      try {
        const job = await provider.getJob(jobId)
        if (job) {
          return job
        }
      } catch (error) {
        logger.warn(`Error getting job ${jobId} from provider ${providerType}:`, error.message)
      }
    }
    return null
  }

  /**
   * Get job status from all providers
   * @param {string} jobId - Job ID
   * @returns {Promise<string>} Job status
   */
  async getJobStatus(jobId) {
    const job = await this.getJob(jobId)
    return job ? job.status : 'not_found'
  }

  /**
   * Get statistics from all providers
   * @returns {Promise<Object>} Combined statistics
   */
  async getStats() {
    const stats = {}
    for (const [providerType, provider] of this.providers) {
      try {
        stats[providerType] = await provider.getStats()
      } catch (error) {
        logger.warn(`Error getting stats from provider ${providerType}:`, error.message)
        stats[providerType] = { error: error.message }
      }
    }
    return stats
  }

  /**
   * Close all queue providers
   * @returns {Promise<void>}
   */
  async close() {
    const promises = Array.from(this.providers.values()).map(provider => provider.close())
    await Promise.all(promises)
    this.providers.clear()
    this.defaultProvider = null
    logger.info('All queue providers closed')
  }

  /**
   * Get list of available providers
   * @returns {Array<string>} Provider types
   */
  getAvailableProviders() {
    return Array.from(this.providers.keys())
  }
}

module.exports = QueueFactory
