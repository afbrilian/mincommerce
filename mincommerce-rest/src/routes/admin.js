/**
 * Admin Routes
 * Routes for admin-specific operations like flash sale management
 */

const express = require('express')
const router = express.Router()

// Import services
const AuthService = require('../services/AuthService')
const FlashSaleService = require('../services/FlashSaleService')

// Import middleware and constants
const logger = require('../utils/logger')
const CONSTANTS = require('../constants')

/**
 * Authentication middleware for admin routes
 * Verifies JWT token and ensures user is admin
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const authService = new AuthService()

    const decoded = authService.verifyToken(token)

    if (decoded.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      })
    }

    req.user = decoded
    next()
  } catch (error) {
    logger.warn('Admin authentication failed:', error.message)
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    })
  }
}

// Apply admin authentication to all routes
router.use(authenticateAdmin)

/**
 * @swagger
 * /admin/flash-sale:
 *   post:
 *     summary: Create or update flash sale
 *     description: Create a new flash sale or update an existing one. If saleId is provided, it will update the existing sale.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               saleId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *                 description: Sale ID for updates (optional for new sales)
 *               productId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *                 description: Product ID for the flash sale
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 example: 2023-01-01T10:00:00.000Z
 *                 description: Flash sale start time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 example: 2023-01-01T12:00:00.000Z
 *                 description: Flash sale end time
 *     responses:
 *       200:
 *         description: Flash sale created or updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/FlashSale'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Product not found or has no stock
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/flash-sale', async (req, res) => {
  try {
    const { productId, startTime, endTime, saleId } = req.body

    // Validate required fields
    if (!productId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Product ID, start time, and end time are required'
      })
    }

    // Validate time range
    const start = new Date(startTime)
    const end = new Date(endTime)

    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: 'End time must be after start time'
      })
    }

    const flashSaleService = new FlashSaleService()

    let result
    if (saleId) {
      // Update existing flash sale
      result = await flashSaleService.updateFlashSale(saleId, {
        productId,
        startTime: start,
        endTime: end
      })
    } else {
      // Create new flash sale
      result = await flashSaleService.createFlashSale({
        productId,
        startTime: start,
        endTime: end
      })
    }

    res.json({
      success: true,
      data: {
        saleId: result.saleId,
        productId: result.productId,
        startTime: result.startTime.toISOString(),
        endTime: result.endTime.toISOString(),
        status: result.status
      }
    })
  } catch (error) {
    logger.error('Error creating/updating flash sale:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * @swagger
 * /admin/flash-sale/{saleId}:
 *   get:
 *     summary: Get flash sale details
 *     description: Retrieve detailed information about a specific flash sale including product and stock information
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *         description: Flash sale ID
 *     responses:
 *       200:
 *         description: Flash sale details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       allOf:
 *                         - $ref: '#/components/schemas/FlashSale'
 *                         - type: object
 *                           properties:
 *                             productName:
 *                               type: string
 *                               example: Limited Edition Gaming Console
 *                             productDescription:
 *                               type: string
 *                               example: The most advanced gaming console with exclusive features
 *                             productPrice:
 *                               type: number
 *                               format: float
 *                               example: 599.99
 *       400:
 *         description: Bad request - invalid UUID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Flash sale not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/flash-sale/:saleId', async (req, res) => {
  try {
    const { saleId } = req.params

    // Validate UUID format
    if (!CONSTANTS.VALIDATION.UUID_REGEX.test(saleId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sale ID format'
      })
    }

    const flashSaleService = new FlashSaleService()
    const flashSale = await flashSaleService.getFlashSaleById(saleId)

    if (!flashSale) {
      return res.status(404).json({
        success: false,
        error: 'Flash sale not found'
      })
    }

    res.json({
      success: true,
      data: {
        saleId: flashSale.sale_id,
        productId: flashSale.product_id,
        productName: flashSale.product_name,
        productDescription: flashSale.product_description,
        productPrice: parseFloat(flashSale.price),
        startTime: flashSale.start_time.toISOString(),
        endTime: flashSale.end_time.toISOString(),
        status: flashSale.status,
        createdAt: flashSale.created_at.toISOString(),
        updatedAt: flashSale.updated_at.toISOString()
      }
    })
  } catch (error) {
    logger.error('Error getting flash sale:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * @swagger
 * /admin/flash-sale/{saleId}/stats:
 *   get:
 *     summary: Get flash sale statistics
 *     description: Retrieve comprehensive statistics for a specific flash sale including order counts, stock levels, and performance metrics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *         description: Flash sale ID
 *     responses:
 *       200:
 *         description: Flash sale statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/FlashSaleStats'
 *       400:
 *         description: Bad request - invalid UUID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Flash sale not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/flash-sale/:saleId/stats', async (req, res) => {
  try {
    const { saleId } = req.params

    // Validate UUID format
    if (!CONSTANTS.VALIDATION.UUID_REGEX.test(saleId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sale ID format'
      })
    }

    const flashSaleService = new FlashSaleService()
    const stats = await flashSaleService.getFlashSaleStats(saleId)

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Flash sale not found'
      })
    }

    res.json({
      success: true,
      data: {
        saleId: stats.saleId,
        totalOrders: stats.totalOrders,
        confirmedOrders: stats.confirmedOrders,
        pendingOrders: stats.pendingOrders,
        failedOrders: stats.failedOrders,
        totalQuantity: stats.totalQuantity,
        availableQuantity: stats.availableQuantity,
        totalRevenue: stats.totalRevenue
      }
    })
  } catch (error) {
    logger.error('Error getting flash sale stats:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

module.exports = router
