/**
 * Authentication Routes
 * Routes for user authentication (login, verify token)
 */

const express = require('express')
const router = express.Router()

// Import services
const AuthService = require('../services/AuthService')

// Import middleware and constants
const logger = require('../utils/logger')
const { VALIDATION } = require('../constants')

/**
 * POST /auth/login
 * Login endpoint for both admin and user authentication
 */
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body

    // Validate required fields
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      })
    }

    // Validate email format
    if (!VALIDATION.EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      })
    }

    const authService = new AuthService()

    // Try admin authentication first
    try {
      const result = await authService.authenticateAdmin(email)

      logger.info(`POST /auth/login - Admin`, {
        ip: req.ip,
        email
      })

      return res.status(200).json(result)
    } catch (adminError) {
      // If admin authentication fails, try user authentication
      try {
        const result = await authService.authenticateUser(email)

        logger.info(`POST /auth/login - User`, {
          ip: req.ip,
          email
        })

        return res.status(200).json(result)
      } catch (userError) {
        // Both admin and user authentication failed
        // Check if it's an admin access error vs user not found
        if (
          adminError.message === 'Admin access required' ||
          adminError.message === 'Invalid admin credentials'
        ) {
          return res.status(403).json({
            success: false,
            error: 'Admin access required'
          })
        } else {
          // Generic authentication failed
          return res.status(401).json({
            success: false,
            error: 'Authentication failed'
          })
        }
      }
    }
  } catch (error) {
    logger.error('Login error:', error)

    // Handle unexpected errors
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * POST /auth/verify
 * Verify JWT token endpoint
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body

    // Validate required fields
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      })
    }

    const authService = new AuthService()
    const decoded = authService.verifyToken(token)

    logger.info(`POST /auth/verify`, {
      ip: req.ip,
      userId: decoded.userId,
      userType: decoded.userType
    })

    res.status(200).json({
      success: true,
      valid: true,
      userType: decoded.userType,
      email: decoded.email,
      userId: decoded.userId,
      role: decoded.role
    })
  } catch (error) {
    logger.warn('Token verification failed:', error.message)

    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        valid: false,
        error: 'Invalid or expired token'
      })
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

module.exports = router
