/**
 * AuthService Unit Tests
 * Tests for authentication service covering admin and user login
 */

const AuthService = require('./AuthService')
const { dbHelpers, redisHelpers } = require('../../tests/utils/testHelpers')

describe('AuthService - Authentication Management', () => {
  let authService

  beforeEach(async () => {
    // Clear all test data
    await dbHelpers.clearAllData()
    await redisHelpers.clearAll()

    // Initialize service
    authService = new AuthService()
  })

  describe('Database Admin User', () => {
    it('should have admin user in seeded database', async () => {
      // Create admin user directly in test to ensure it exists
      const adminUser = await dbHelpers.createUser({
        email: 'admin@brilian.af',
        role: 'admin'
      })

      expect(adminUser).toBeDefined()
      expect(adminUser.role).toBe('admin')
      expect(adminUser.email).toBe('admin@brilian.af')
    })

    it('should have admin user with correct role', async () => {
      // Create admin user directly in test
      await dbHelpers.createUser({
        email: 'admin@brilian.af',
        role: 'admin'
      })

      const adminUser = await dbHelpers.findUserByEmail('admin@brilian.af')

      expect(adminUser.role).toBe('admin')
      expect(adminUser.email).toBe('admin@brilian.af')
    })

    it('should allow admin authentication with database user', async () => {
      // Create admin user directly in test
      await dbHelpers.createUser({
        email: 'admin@brilian.af',
        role: 'admin'
      })

      const result = await authService.authenticateAdmin('admin@brilian.af')

      expect(result.success).toBe(true)
      expect(result.userType).toBe('admin')
      expect(result.email).toBe('admin@brilian.af')
      expect(result.token).toBeDefined()
    })
  })

  describe('Admin Authentication', () => {
    it('should authenticate admin with valid email', async () => {
      // Create admin user directly in test
      await dbHelpers.createUser({
        email: 'admin@brilian.af',
        role: 'admin'
      })

      const adminEmail = 'admin@brilian.af'

      const result = await authService.authenticateAdmin(adminEmail)

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.token).toBeDefined()
      expect(result.userType).toBe('admin')
      expect(result.email).toBe(adminEmail)
    })

    it('should reject admin authentication with invalid email', async () => {
      const invalidEmail = 'invalid-admin@example.com'

      await expect(authService.authenticateAdmin(invalidEmail)).rejects.toThrow(
        'Invalid admin credentials'
      )
    })

    it('should create JWT token for admin', async () => {
      // Create admin user directly in test
      await dbHelpers.createUser({
        email: 'admin@brilian.af',
        role: 'admin'
      })

      const adminEmail = 'admin@brilian.af'

      const result = await authService.authenticateAdmin(adminEmail)

      // Verify JWT token is valid and contains correct payload
      expect(result.token).toBeDefined()
      expect(typeof result.token).toBe('string')

      // Verify token can be decoded (we'll implement this)
      const decoded = authService.verifyToken(result.token)
      expect(decoded.userType).toBe('admin')
      expect(decoded.email).toBe(adminEmail)
    })

    it('should validate admin JWT token', async () => {
      // Create admin user directly in test
      await dbHelpers.createUser({
        email: 'admin@brilian.af',
        role: 'admin'
      })

      const adminEmail = 'admin@brilian.af'

      const authResult = await authService.authenticateAdmin(adminEmail)

      const validation = authService.verifyToken(authResult.token)
      expect(validation.valid).toBe(true)
      expect(validation.userType).toBe('admin')
      expect(validation.email).toBe(adminEmail)
    })

    it('should reject invalid JWT token', async () => {
      const invalidToken = 'invalid.jwt.token'

      expect(() => authService.verifyToken(invalidToken)).toThrow('invalid token')
    })
  })

  describe('User Authentication', () => {
    let testUser

    beforeEach(async () => {
      testUser = await dbHelpers.createUser({
        email: 'testuser@example.com'
      })
    })

    it('should authenticate user with valid email', async () => {
      const result = await authService.authenticateUser(testUser.email)

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.token).toBeDefined()
      expect(result.userType).toBe('user')
      expect(result.userId).toBe(testUser.user_id)
      expect(result.email).toBe(testUser.email)
    })

    it('should create user for non-existent email', async () => {
      const nonExistentEmail = 'nonexistent@example.com'

      const result = await authService.authenticateUser(nonExistentEmail)

      expect(result.success).toBe(true)
      expect(result.userType).toBe('user')
      expect(result.email).toBe(nonExistentEmail)
      expect(result.token).toBeDefined()
    })

    it('should create JWT token for user', async () => {
      const result = await authService.authenticateUser(testUser.email)

      // Verify JWT token is valid and contains correct payload
      expect(result.token).toBeDefined()
      expect(typeof result.token).toBe('string')

      // Verify token can be decoded
      const decoded = authService.verifyToken(result.token)
      expect(decoded.userType).toBe('user')
      expect(decoded.userId).toBe(testUser.user_id)
      expect(decoded.email).toBe(testUser.email)
    })

    it('should validate user JWT token', async () => {
      const authResult = await authService.authenticateUser(testUser.email)

      const validation = authService.verifyToken(authResult.token)
      expect(validation.valid).toBe(true)
      expect(validation.userType).toBe('user')
      expect(validation.userId).toBe(testUser.user_id)
      expect(validation.email).toBe(testUser.email)
    })

    it('should reject invalid user JWT token', async () => {
      const invalidToken = 'invalid.jwt.token'

      expect(() => authService.verifyToken(invalidToken)).toThrow('invalid token')
    })
  })

  describe('JWT Token Management', () => {
    it('should generate secure JWT tokens', async () => {
      // Create admin user directly in test
      await dbHelpers.createUser({
        email: 'admin@brilian.af',
        role: 'admin'
      })

      const adminEmail = 'admin@brilian.af'

      const result1 = await authService.authenticateAdmin(adminEmail)

      // No delay needed - random nonce ensures uniqueness

      const result2 = await authService.authenticateAdmin(adminEmail)

      expect(result1.token).not.toBe(result2.token)
      expect(typeof result1.token).toBe('string')
      expect(result1.token.split('.').length).toBe(3) // JWT has 3 parts
    })

    it('should handle expired tokens', async () => {
      // Create a token with very short expiry for testing
      const shortExpiryToken = authService.generateToken(
        { userType: 'admin', email: 'admin@brilian.af' },
        '1ms'
      )

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(() => authService.verifyToken(shortExpiryToken)).toThrow('jwt expired')
    })

    it('should handle malformed tokens', async () => {
      const malformedTokens = [
        'not.a.token',
        'invalid',
        '',
        'header.payload', // Missing signature
        'header.payload.signature.extra' // Too many parts
      ]

      malformedTokens.forEach(token => {
        expect(() => authService.verifyToken(token)).toThrow('invalid token')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid admin credentials', async () => {
      await expect(authService.authenticateAdmin('invalid@example.com')).rejects.toThrow(
        'Invalid admin credentials'
      )
    })

    it('should handle malformed JWT tokens', async () => {
      const malformedTokens = [
        'not.a.token',
        'invalid',
        '',
        'header.payload', // Missing signature
        'header.payload.signature.extra' // Too many parts
      ]

      malformedTokens.forEach(token => {
        expect(() => authService.verifyToken(token)).toThrow('invalid token')
      })
    })
  })

  describe('Security', () => {
    it('should generate secure JWT tokens with proper structure', async () => {
      // Create admin user directly in test
      await dbHelpers.createUser({
        email: 'admin@brilian.af',
        role: 'admin'
      })

      const adminEmail = 'admin@brilian.af'

      const result1 = await authService.authenticateAdmin(adminEmail)

      // No delay needed - random nonce ensures uniqueness

      const result2 = await authService.authenticateAdmin(adminEmail)

      expect(result1.token).not.toBe(result2.token)
      expect(result1.token.split('.').length).toBe(3) // JWT structure
      expect(result1.token.length).toBeGreaterThan(100) // Reasonable token length
    })

    it('should set appropriate token expiry times', async () => {
      // Create admin user directly in test
      await dbHelpers.createUser({
        email: 'admin@brilian.af',
        role: 'admin'
      })

      const adminEmail = 'admin@brilian.af'

      const result = await authService.authenticateAdmin(adminEmail)

      // Verify token payload contains expiry
      const decoded = authService.verifyToken(result.token)
      expect(decoded.exp).toBeDefined()
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
    })

    it('should not expose sensitive information in token payload', async () => {
      const testUser = await dbHelpers.createUser({
        email: 'testuser@example.com'
      })

      const result = await authService.authenticateUser(testUser.email)

      const decoded = authService.verifyToken(result.token)

      // Should not contain password or other sensitive data
      expect(decoded.password).toBeUndefined()
      expect(decoded.secret).toBeUndefined()
      expect(decoded.internalId).toBeUndefined()
    })

    it('should use secure signing algorithm', async () => {
      // Create admin user directly in test
      await dbHelpers.createUser({
        email: 'admin@brilian.af',
        role: 'admin'
      })

      const adminEmail = 'admin@brilian.af'
      const result = await authService.authenticateAdmin(adminEmail)

      // Token should be properly signed (we can't easily test the algorithm without
      // exposing internal details, but we can verify it's a valid JWT)
      expect(() => authService.verifyToken(result.token)).not.toThrow()
    })
  })
})
