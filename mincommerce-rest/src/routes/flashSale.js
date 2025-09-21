const express = require('express')
const FlashSaleService = require('../services/FlashSaleService')
const AuthService = require('../services/AuthService')
const logger = require('../utils/logger')

const router = express.Router()
const flashSaleService = new FlashSaleService()
const authService = new AuthService()

/**
 * @swagger
 * /flash-sale/status:
 *   get:
 *     summary: Get flash sale status
 *     description: Retrieve the current flash sale status including product information, availability, and timing. Includes user purchase eligibility if authenticated.
 *     tags: [Flash Sale]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Flash sale status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/FlashSaleStatus'
 *       404:
 *         description: No flash sale found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: null
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/status',
  authService.optionalAuthenticateMiddleware.bind(authService),
  async (req, res) => {
    try {
      logger.info(`GET /flash-sale/status`, {
        ip: req.ip
      })

      const saleStatus = await flashSaleService.getSaleStatus()

      if (saleStatus) {
        // Check if user is authenticated and get their purchase eligibility
        let userPurchaseEligibility = null
        if (req.user && req.user.userId) {
          userPurchaseEligibility = await flashSaleService.checkUserPurchaseEligibility(
            req.user.userId
          )
        }

        logger.info(`Flash sale status retrieved`, {
          ip: req.ip,
          status: saleStatus.status,
          saleId: saleStatus.saleId,
          hasUserData: !!userPurchaseEligibility
        })

        res.status(200).json({
          success: true,
          data: {
            ...saleStatus,
            userPurchaseEligibility
          }
        })
      } else {
        logger.info(`No active flash sale found`, {
          ip: req.ip
        })

        res.status(200).json({
          success: true,
          data: null,
          message: 'No active flash sale found'
        })
      }
    } catch (error) {
      logger.error('Failed to get flash sale status:', error)

      if (error.message === 'No flash sale found') {
        return res.status(200).json({
          success: true,
          data: null,
          message: 'No flash sale found'
        })
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get flash sale status'
      })
    }
  }
)

/**
 * GET /flash-sale/stats
 * Get sale statistics (admin endpoint)
 */
router.get('/stats', async (req, res) => {
  try {
    const saleId = req.query.saleId
    if (!saleId) {
      return res.status(400).json({
        success: false,
        error: 'saleId query parameter is required'
      })
    }

    const stats = await flashSaleService.getSaleStatistics(saleId)
    res.json(stats)
  } catch (error) {
    logger.error('Failed to get flash sale stats:', error)

    if (error.message === 'Flash sale not found') {
      return res.status(404).json({
        success: false,
        error: 'Flash sale not found'
      })
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get flash sale statistics'
    })
  }
})

module.exports = router
