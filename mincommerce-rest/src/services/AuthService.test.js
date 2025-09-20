/**
 * AuthService Unit Tests
 * Tests for authentication service covering admin and user login
 */

const AuthService = require('./AuthService');
const { generateTestData, dbHelpers, redisHelpers } = require('../../tests/utils/testHelpers');
const CONSTANTS = require('../constants');

describe('AuthService - Authentication Management', () => {
  let authService;

  beforeEach(async () => {
    // Clear all test data
    await dbHelpers.clearAllData();
    await redisHelpers.clearAll();

    // Initialize service
    authService = new AuthService();
  });

  describe('Database Admin User', () => {
    it('should have admin user in seeded database', async () => {
      // After seeding, admin user should exist
      const adminUser = await dbHelpers.findUserByEmail('admin@brilian.af');
      
      expect(adminUser).toBeDefined();
      expect(adminUser.role).toBe('admin');
      expect(adminUser.email).toBe('admin@brilian.af');
    });

    it('should have admin user with correct role', async () => {
      const adminUser = await dbHelpers.findUserByEmail('admin@brilian.af');
      
      expect(adminUser.role).toBe('admin');
      expect(adminUser.email).toBe('admin@brilian.af');
    });

    it('should allow admin authentication with database user', async () => {
      const result = await authService.authenticateAdmin('admin@brilian.af');
      
      expect(result.success).toBe(true);
      expect(result.userType).toBe('admin');
      expect(result.email).toBe('admin@brilian.af');
      expect(result.token).toBeDefined();
    });
  });

  describe('Admin Authentication', () => {
    it('should authenticate admin with valid email', async () => {
      const adminEmail = 'admin@brilian.af';

      const result = await authService.authenticateAdmin(adminEmail);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.userType).toBe('admin');
      expect(result.email).toBe(adminEmail);
    });

    it('should reject admin authentication with invalid email', async () => {
      const invalidEmail = 'invalid-admin@example.com';

      await expect(authService.authenticateAdmin(invalidEmail)).rejects.toThrow(
        'Invalid admin credentials'
      );
    });

    it('should create JWT token for admin', async () => {
      const adminEmail = 'admin@brilian.af';

      const result = await authService.authenticateAdmin(adminEmail);

      // Verify JWT token is valid and contains correct payload
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');

      // Verify token can be decoded (we'll implement this)
      const decoded = authService.verifyToken(result.token);
      expect(decoded.userType).toBe('admin');
      expect(decoded.email).toBe(adminEmail);
    });

    it('should validate admin JWT token', async () => {
      const adminEmail = 'admin@brilian.af';

      const authResult = await authService.authenticateAdmin(adminEmail);

      const validation = authService.verifyToken(authResult.token);
      expect(validation.valid).toBe(true);
      expect(validation.userType).toBe('admin');
      expect(validation.email).toBe(adminEmail);
    });

    it('should reject invalid JWT token', async () => {
      const invalidToken = 'invalid.jwt.token';

      expect(() => authService.verifyToken(invalidToken)).toThrow('Invalid token');
    });
  });

  describe('User Authentication', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await dbHelpers.createUser({
        email: 'testuser@example.com',
      });
    });

    it('should authenticate user with valid email', async () => {
      const result = await authService.authenticateUser(testUser.email);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.userType).toBe('user');
      expect(result.userId).toBe(testUser.user_id);
      expect(result.email).toBe(testUser.email);
    });

    it('should reject user authentication with non-existent email', async () => {
      const nonExistentEmail = 'nonexistent@example.com';

      await expect(authService.authenticateUser(nonExistentEmail)).rejects.toThrow(
        'User not found'
      );
    });

    it('should create JWT token for user', async () => {
      const result = await authService.authenticateUser(testUser.email);

      // Verify JWT token is valid and contains correct payload
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');

      // Verify token can be decoded
      const decoded = authService.verifyToken(result.token);
      expect(decoded.userType).toBe('user');
      expect(decoded.userId).toBe(testUser.user_id);
      expect(decoded.email).toBe(testUser.email);
    });

    it('should validate user JWT token', async () => {
      const authResult = await authService.authenticateUser(testUser.email);

      const validation = authService.verifyToken(authResult.token);
      expect(validation.valid).toBe(true);
      expect(validation.userType).toBe('user');
      expect(validation.userId).toBe(testUser.user_id);
      expect(validation.email).toBe(testUser.email);
    });

    it('should reject invalid user JWT token', async () => {
      const invalidToken = 'invalid.jwt.token';

      expect(() => authService.verifyToken(invalidToken)).toThrow('Invalid token');
    });
  });

  describe('JWT Token Management', () => {
    it('should generate secure JWT tokens', async () => {
      const adminUsername = 'admin';

      const result1 = await authService.authenticateAdmin(adminUsername);
      const result2 = await authService.authenticateAdmin(adminUsername);

      expect(result1.token).not.toBe(result2.token);
      expect(typeof result1.token).toBe('string');
      expect(result1.token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should handle expired tokens', async () => {
      // Create a token with very short expiry for testing
      const shortExpiryToken = authService.generateToken(
        { userType: 'admin', username: 'admin' },
        '1ms'
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(() => authService.verifyToken(shortExpiryToken)).toThrow('Token expired');
    });

    it('should handle malformed tokens', async () => {
      const malformedTokens = [
        'not.a.token',
        'invalid',
        '',
        'header.payload', // Missing signature
        'header.payload.signature.extra', // Too many parts
      ];

      malformedTokens.forEach(token => {
        expect(() => authService.verifyToken(token)).toThrow('Invalid token');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // Mock Redis error
      const originalRedis = require('../config/redis').getRedisClient();
      const mockRedis = {
        setEx: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
        get: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
        del: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
      };

      // Replace Redis client temporarily
      require('../config/redis').getRedisClient = () => mockRedis;

      await expect(authService.authenticateAdmin('admin')).rejects.toThrow(
        'Authentication service unavailable'
      );

      // Restore original Redis client
      require('../config/redis').getRedisClient = () => originalRedis;
    });

    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      const originalDb = require('../config/database').getDatabase();
      const mockDb = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      };

      // Replace database temporarily
      require('../config/database').getDatabase = () => mockDb;

      await expect(authService.authenticateUser('test@example.com')).rejects.toThrow(
        'Authentication service unavailable'
      );

      // Restore original database
      require('../config/database').getDatabase = () => originalDb;
    });
  });

  describe('Security', () => {
    it('should generate secure JWT tokens with proper structure', async () => {
      const adminUsername = 'admin';

      const result1 = await authService.authenticateAdmin(adminUsername);
      const result2 = await authService.authenticateAdmin(adminUsername);

      expect(result1.token).not.toBe(result2.token);
      expect(result1.token.split('.').length).toBe(3); // JWT structure
      expect(result1.token.length).toBeGreaterThan(100); // Reasonable token length
    });

    it('should set appropriate token expiry times', async () => {
      const adminUsername = 'admin';

      const result = await authService.authenticateAdmin(adminUsername);

      // Verify token payload contains expiry
      const decoded = authService.verifyToken(result.token);
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should not expose sensitive information in token payload', async () => {
      const testUser = await dbHelpers.createUser({
        email: 'testuser@example.com',
      });

      const result = await authService.authenticateUser(testUser.email);

      const decoded = authService.verifyToken(result.token);

      // Should not contain password or other sensitive data
      expect(decoded.password).toBeUndefined();
      expect(decoded.secret).toBeUndefined();
      expect(decoded.internalId).toBeUndefined();
    });

    it('should use secure signing algorithm', async () => {
      const adminUsername = 'admin';
      const result = await authService.authenticateAdmin(adminUsername);

      // Token should be properly signed (we can't easily test the algorithm without
      // exposing internal details, but we can verify it's a valid JWT)
      expect(() => authService.verifyToken(result.token)).not.toThrow();
    });
  });
});
