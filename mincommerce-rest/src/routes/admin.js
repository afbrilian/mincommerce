/**
 * Admin Routes
 * Routes for admin-specific operations like flash sale management
 */

const express = require('express');
const router = express.Router();

// Import services
const AuthService = require('../services/AuthService');
const FlashSaleService = require('../services/FlashSaleService');

// Import middleware
const logger = require('../utils/logger');

/**
 * Authentication middleware for admin routes
 * Verifies JWT token and ensures user is admin
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const authService = new AuthService();

    const decoded = authService.verifyToken(token);

    if (decoded.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Admin authentication failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

// Apply admin authentication to all routes
router.use(authenticateAdmin);

/**
 * POST /admin/flash-sale
 * Create or update a flash sale
 */
router.post('/flash-sale', async (req, res) => {
  try {
    const { productId, startTime, endTime, saleId } = req.body;

    // Validate required fields
    if (!productId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Product ID, start time, and end time are required',
      });
    }

    // Validate time range
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: 'End time must be after start time',
      });
    }

    const flashSaleService = new FlashSaleService();

    let result;
    if (saleId) {
      // Update existing flash sale
      result = await flashSaleService.updateFlashSale(saleId, {
        productId,
        startTime: start,
        endTime: end,
      });
    } else {
      // Create new flash sale
      result = await flashSaleService.createFlashSale({
        productId,
        startTime: start,
        endTime: end,
      });
    }

    res.json({
      success: true,
      data: {
        saleId: result.saleId,
        productId: result.productId,
        startTime: result.startTime.toISOString(),
        endTime: result.endTime.toISOString(),
        status: result.status,
      },
    });
  } catch (error) {
    logger.error('Error creating/updating flash sale:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /admin/flash-sale/:saleId
 * Get flash sale details by ID
 */
router.get('/flash-sale/:saleId', async (req, res) => {
  try {
    const { saleId } = req.params;

    const flashSaleService = new FlashSaleService();
    const flashSale = await flashSaleService.getFlashSaleById(saleId);

    if (!flashSale) {
      return res.status(404).json({
        success: false,
        error: 'Flash sale not found',
      });
    }

    res.json({
      success: true,
      data: {
        saleId: flashSale.saleId,
        productId: flashSale.productId,
        startTime: flashSale.startTime.toISOString(),
        endTime: flashSale.endTime.toISOString(),
        status: flashSale.status,
        createdAt: flashSale.createdAt.toISOString(),
        updatedAt: flashSale.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error getting flash sale:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /admin/flash-sale/:saleId/stats
 * Get flash sale statistics
 */
router.get('/flash-sale/:saleId/stats', async (req, res) => {
  try {
    const { saleId } = req.params;

    const flashSaleService = new FlashSaleService();
    const stats = await flashSaleService.getFlashSaleStats(saleId);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Flash sale not found',
      });
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
        totalRevenue: stats.totalRevenue,
      },
    });
  } catch (error) {
    logger.error('Error getting flash sale stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

module.exports = router;
