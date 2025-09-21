const PurchaseService = require('../services/PurchaseService')
const logger = require('../utils/logger')

module.exports = async job => {
  const { userId, productId } = job.data

  logger.info(`Processing purchase job for user ${userId}, product ${productId}`)

  try {
    const purchaseService = new PurchaseService()
    const result = await purchaseService.processPurchase(job.data)

    logger.info(`Purchase job completed for user ${userId}:`, result)
    return result
  } catch (error) {
    logger.error(`Purchase job failed for user ${userId}:`, error)
    throw error
  }
}
