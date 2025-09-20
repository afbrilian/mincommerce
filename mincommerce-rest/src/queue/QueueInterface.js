/**
 * Queue Interface - Defines the contract for all queue implementations
 * This allows easy migration between different queue providers
 */
class QueueInterface {
  /**
   * Add a job to the queue
   * @param {string} type - Job type/name
   * @param {Object} data - Job data
   * @param {Object} _options - Job options (priority, delay, etc.)
   * @returns {Promise<Object>} Job instance
   */
  async addJob(type, data, _options = {}) {
    throw new Error('addJob method must be implemented');
  }

  /**
   * Process jobs of a specific type
   * @param {string} _type - Job type to process
   * @param {Function} _processor - Job processor function
   */
  process(_type, _processor) {
    throw new Error('process method must be implemented');
  }

  /**
   * Get job by ID
   * @param {string} _jobId - Job ID
   * @returns {Promise<Object>} Job instance
   */
  async getJob(_jobId) {
    throw new Error('getJob method must be implemented');
  }

  /**
   * Get job status
   * @param {string} _jobId - Job ID
   * @returns {Promise<string>} Job status
   */
  async getJobStatus(_jobId) {
    throw new Error('getJobStatus method must be implemented');
  }

  /**
   * Close the queue connection
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('close method must be implemented');
  }

  /**
   * Get queue statistics
   * @returns {Promise<Object>} Queue stats
   */
  async getStats() {
    throw new Error('getStats method must be implemented');
  }
}

module.exports = QueueInterface;
