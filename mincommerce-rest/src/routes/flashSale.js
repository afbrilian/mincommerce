const express = require('express')
const FlashSaleService = require('../services/FlashSaleService')
const logger = require('../utils/logger')

const router = express.Router()
const flashSaleService = new FlashSaleService()

// Get flash sale status
router.get('/status', async (req, res) => {
  try {
    const saleId = req.query.saleId
    const saleStatus = await flashSaleService.getSaleStatus(saleId)
    res.json(saleStatus)
  } catch (error) {
    logger.error('Failed to get flash sale status:', error)

    if (error.message === 'No active flash sale found') {
      return res.status(404).json({
        error: 'No active flash sale found'
      })
    }

    res.status(500).json({
      error: 'Failed to get flash sale status'
    })
  }
})

// Get sale statistics (admin endpoint)
router.get('/stats', async (req, res) => {
  try {
    const saleId = req.query.saleId
    if (!saleId) {
      return res.status(400).json({
        error: 'saleId query parameter is required'
      })
    }

    const stats = await flashSaleService.getSaleStatistics(saleId)
    res.json(stats)
  } catch (error) {
    logger.error('Failed to get flash sale stats:', error)

    if (error.message === 'Flash sale not found') {
      return res.status(404).json({
        error: 'Flash sale not found'
      })
    }

    res.status(500).json({
      error: 'Failed to get flash sale statistics'
    })
  }
})

module.exports = router
