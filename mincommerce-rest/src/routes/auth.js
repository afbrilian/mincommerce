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
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email. Supports both admin and regular user login. If user doesn't exist, they will be automatically created as a regular user.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *                 description: User email address
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         token:
 *                           type: string
 *                           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                         userType:
 *                           type: string
 *                           enum: [admin, user]
 *                           example: user
 *                         email:
 *                           type: string
 *                           example: user@example.com
 *                         userId:
 *                           type: string
 *                           format: uuid
 *                           example: 123e4567-e89b-12d3-a456-426614174000
 *       400:
 *         description: Bad request - missing or invalid email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication failed
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /auth/verify:
 *   post:
 *     summary: Verify JWT token
 *     description: Verify the validity of a JWT token and return user information
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 description: JWT token to verify
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         valid:
 *                           type: boolean
 *                           example: true
 *                         userType:
 *                           type: string
 *                           enum: [admin, user]
 *                           example: user
 *                         email:
 *                           type: string
 *                           example: user@example.com
 *                         userId:
 *                           type: string
 *                           format: uuid
 *                           example: 123e4567-e89b-12d3-a456-426614174000
 *                         role:
 *                           type: string
 *                           enum: [admin, user]
 *                           example: user
 *       400:
 *         description: Bad request - missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       example: false
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
