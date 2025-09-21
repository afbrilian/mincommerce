/**
 * Authentication Service
 * Handles JWT-based authentication for admin and user login
 */

const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/UserRepository');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');
const CONSTANTS = require('../constants');

class AuthService {
  constructor() {
    this.userRepository = new UserRepository();
    this.jwtSecret = process.env.JWT_SECRET || 'mincommerce-secret-key-change-in-production';
    this.jwtExpiry = process.env.JWT_EXPIRY || '24h';
  }

  /**
   * Authenticate admin user by email
   * @param {string} email - Admin email
   * @returns {Promise<Object>} Authentication result with token
   */
  async authenticateAdmin(email) {
    try {
      logger.info(`Admin authentication attempt for email: ${email}`);

      // Find admin user in database
      const adminUser = await this.userRepository.findByEmail(email);
      
      if (!adminUser || !adminUser.isAdmin()) {
        logger.warn(`Admin authentication failed for email: ${email}`);
        throw new Error('Invalid admin credentials');
      }

      // Generate JWT token
      const token = this.generateToken({
        userId: adminUser.userId,
        email: adminUser.email,
        userType: 'admin',
        role: adminUser.role,
        nonce: Math.random().toString(36).substring(7), // Add random nonce for uniqueness
      });

      logger.info(`Admin authentication successful for email: ${email}`);
      
      return {
        success: true,
        token,
        userType: 'admin',
        email: adminUser.email,
        userId: adminUser.userId
      };

    } catch (error) {
      logger.error(`Admin authentication error for email ${email}:`, error);
      
      // Re-throw authentication errors
      if (error.message === 'Invalid admin credentials') {
        throw error;
      }
      
      // Wrap other errors
      throw new Error('Authentication service unavailable');
    }
  }

  /**
   * Authenticate regular user by email
   * Creates user if doesn't exist (simplified for test requirements)
   * @param {string} email - User email
   * @returns {Promise<Object>} Authentication result with token
   */
  async authenticateUser(email) {
    try {
      logger.info(`User authentication attempt for email: ${email}`);

      // Validate email format
      if (!this.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Find or create user
      let user = await this.userRepository.findByEmail(email);
      
      if (!user) {
        // Create new user (simplified - no password for test requirements)
        user = await this.userRepository.create({
          email,
          role: 'user'
        });
        logger.info(`New user created for email: ${email}`);
      }

      // Generate JWT token
      const token = this.generateToken({
        userId: user.userId,
        email: user.email,
        userType: 'user',
        role: user.role,
        nonce: Math.random().toString(36).substring(7), // Add random nonce for uniqueness
      });

      logger.info(`User authentication successful for email: ${email}`);
      
      return {
        success: true,
        token,
        userType: 'user',
        email: user.email,
        userId: user.userId
      };

    } catch (error) {
      logger.error(`User authentication error for email ${email}:`, error);
      
      // Re-throw validation errors
      if (error.message === 'Invalid email format') {
        throw error;
      }
      
      // Wrap other errors
      throw new Error('Authentication service unavailable');
    }
  }

  /**
   * Generate JWT token
   * @param {Object} payload - Token payload
   * @param {string} customExpiry - Custom expiry time (optional)
   * @returns {string} JWT token
   */
  generateToken(payload, customExpiry = null) {
    try {
      const options = {
        expiresIn: customExpiry || this.jwtExpiry,
        issuer: 'mincommerce-api',
        audience: 'mincommerce-client'
      };

      return jwt.sign(payload, this.jwtSecret, options);
    } catch (error) {
      logger.error('Token generation error:', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify and decode JWT token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  verifyToken(token) {
    try {
      if (!token) {
        throw new Error('Invalid token');
      }

      // Verify token structure
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token');
      }

      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'mincommerce-api',
        audience: 'mincommerce-client'
      });

      return {
        valid: true,
        ...decoded
      };

    } catch (error) {
      logger.warn('Token verification failed:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error('Invalid token');
      }
    }
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} Extracted token or null
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Middleware for JWT authentication
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  authenticateMiddleware(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      const token = this.extractTokenFromHeader(authHeader);

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const decoded = this.verifyToken(token);
      req.user = decoded;
      
      next();

    } catch (error) {
      logger.warn('Authentication middleware error:', error.message);
      
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  }

  /**
   * Middleware for admin-only access
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Next middleware function
   */
  adminOnlyMiddleware(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (req.user.userType !== 'admin' || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      next();

    } catch (error) {
      logger.error('Admin middleware error:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  }
}

module.exports = AuthService;
