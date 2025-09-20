const express = require('express');
const Joi = require('joi');
const PurchaseService = require('../services/PurchaseService');
const logger = require('../utils/logger');

const router = express.Router();
const purchaseService = new PurchaseService();

// Validation schemas
const purchaseSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  productId: Joi.string().uuid().required(),
  saleId: Joi.string().uuid().required(),
});

const checkPurchaseSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  productId: Joi.string().uuid().required(),
});

// Attempt purchase
router.post('/attempt', async (req, res) => {
  try {
    const { error, value } = purchaseSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message,
      });
    }

    const result = await purchaseService.attemptPurchase(value);

    if (
      !result.success &&
      result.reason === 'Too many purchase attempts. Please try again later.'
    ) {
      return res.status(429).json({
        error: result.reason,
      });
    }

    res.json(result);
  } catch (error) {
    logger.error('Purchase attempt failed:', error);

    if (error.message === 'Too many purchase attempts. Please try again later.') {
      return res.status(429).json({
        error: error.message,
      });
    }

    res.status(500).json({
      error: 'Purchase attempt failed',
    });
  }
});

// Check purchase status
router.get('/status', async (req, res) => {
  try {
    const { error, value } = checkPurchaseSchema.validate(req.query);

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message,
      });
    }

    const { userId, productId } = value;
    const result = await purchaseService.checkPurchaseStatus(userId, productId);
    res.json(result);
  } catch (error) {
    logger.error('Failed to check purchase status:', error);
    res.status(500).json({
      error: 'Failed to check purchase status',
    });
  }
});

// Get user's orders
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        error: 'Invalid user ID format',
      });
    }

    const result = await purchaseService.getUserOrders(userId);
    res.json(result);
  } catch (error) {
    logger.error('Failed to get user orders:', error);
    res.status(500).json({
      error: 'Failed to get user orders',
    });
  }
});

module.exports = router;
