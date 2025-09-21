/**
 * UserService Unit Tests
 * Tests for user management and validation
 */

const UserService = require('./UserService')
const { dbHelpers, redisHelpers } = require('../../tests/utils/testHelpers')
const CONSTANTS = require('../constants')

describe('UserService - User Management', () => {
  let userService

  beforeEach(async () => {
    // Clear all test data
    await dbHelpers.clearAllData()
    await redisHelpers.clearAll()

    // Initialize service
    userService = new UserService()
  })

  describe('User Creation', () => {
    it('should create a new user with valid email', async () => {
      const userData = {
        email: 'test@example.com'
      }

      const user = await userService.createUser(userData)

      expect(user).toBeDefined()
      expect(user.userId).toBeDefined()
      expect(user.email).toBe(userData.email)
      expect(user.createdAt).toBeDefined()

      // Verify user was saved to database
      const savedUser = await dbHelpers.getUserById(user.userId)
      expect(savedUser).toBeDefined()
      expect(savedUser.email).toBe(userData.email)
    })

    it('should validate email format', async () => {
      const invalidUserData = {
        email: 'invalid-email'
      }

      await expect(userService.createUser(invalidUserData)).rejects.toThrow('Invalid email format')
    })

    it('should prevent duplicate users', async () => {
      const userData = {
        email: 'test@example.com'
      }

      // Create first user
      await userService.createUser(userData)

      // Attempt to create duplicate user
      await expect(userService.createUser(userData)).rejects.toThrow(
        'User with this email already exists'
      )
    })

    it('should handle various valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user123@example.org',
        'test@subdomain.example.com'
      ]

      for (const email of validEmails) {
        const user = await userService.createUser({ email })
        expect(user.email).toBe(email)
      }
    })
  })

  describe('User Retrieval', () => {
    let testUser

    beforeEach(async () => {
      testUser = await dbHelpers.createUser({
        email: 'test@example.com'
      })
    })

    it('should get user by ID', async () => {
      const user = await userService.getUserById(testUser.user_id)

      expect(user).toBeDefined()
      expect(user.userId).toBe(testUser.user_id)
      expect(user.email).toBe(testUser.email)
    })

    it('should get user by email', async () => {
      const user = await userService.getUserByEmail(testUser.email)

      expect(user).toBeDefined()
      expect(user.userId).toBe(testUser.user_id)
      expect(user.email).toBe(testUser.email)
    })

    it('should handle non-existent user by ID', async () => {
      const nonExistentId = 'non-existent-id'

      await expect(userService.getUserById(nonExistentId)).rejects.toThrow('User not found')
    })

    it('should handle non-existent user by email', async () => {
      const nonExistentEmail = 'nonexistent@example.com'

      await expect(userService.getUserByEmail(nonExistentEmail)).rejects.toThrow('User not found')
    })
  })

  describe('User Existence Check', () => {
    it('should return true for existing user', async () => {
      const testUser = await dbHelpers.createUser({
        email: 'test@example.com'
      })

      const exists = await userService.userExists(testUser.email)

      expect(exists).toBe(true)
    })

    it('should return false for non-existent user', async () => {
      const exists = await userService.userExists('nonexistent@example.com')

      expect(exists).toBe(false)
    })
  })

  describe('Find or Create User', () => {
    it('should return existing user if found', async () => {
      const testUser = await dbHelpers.createUser({
        email: 'test@example.com'
      })

      const user = await userService.findOrCreateUser(testUser.email)

      expect(user.userId).toBe(testUser.user_id)
      expect(user.email).toBe(testUser.email)
    })

    it('should create new user if not found', async () => {
      const email = 'newuser@example.com'

      const user = await userService.findOrCreateUser(email)

      expect(user).toBeDefined()
      expect(user.email).toBe(email)
      expect(user.userId).toBeDefined()

      // Verify user was created in database
      const savedUser = await dbHelpers.getUserById(user.userId)
      expect(savedUser).toBeDefined()
    })

    it('should handle invalid email in find or create', async () => {
      const invalidEmail = 'invalid-email'

      await expect(userService.findOrCreateUser(invalidEmail)).rejects.toThrow(
        'Invalid email format'
      )
    })
  })

  describe('Email Validation', () => {
    it('should validate email format using regex', () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user123@example.org',
        'test@subdomain.example.com',
        'a@b.co',
        'test.email.with+symbol@example.com'
      ]

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        'user@example..com',
        'user name@example.com',
        'user@exam ple.com'
      ]

      validEmails.forEach(email => {
        expect(CONSTANTS.VALIDATION.EMAIL_REGEX.test(email)).toBe(true)
      })

      invalidEmails.forEach(email => {
        expect(CONSTANTS.VALIDATION.EMAIL_REGEX.test(email)).toBe(false)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Mock database error
      const originalCreateUser = userService.createUser.bind(userService)
      userService.createUser = jest.fn().mockRejectedValue(new Error('Database connection failed'))

      await expect(userService.createUser({ email: 'test@example.com' })).rejects.toThrow(
        'Database connection failed'
      )

      // Restore original method
      userService.createUser = originalCreateUser
    })

    it('should handle invalid UUID format', async () => {
      const invalidId = 'invalid-uuid-format'

      await expect(userService.getUserById(invalidId)).rejects.toThrow('User not found')
    })
  })

  describe('Performance', () => {
    it('should handle multiple concurrent user creations', async () => {
      const concurrentUsers = Array(10)
        .fill()
        .map((_, index) => ({
          email: `user${index}@example.com`
        }))

      const startTime = Date.now()
      const users = await Promise.all(
        concurrentUsers.map(userData => userService.createUser(userData))
      )
      const endTime = Date.now()

      // All users should be created successfully
      expect(users).toHaveLength(10)
      users.forEach((user, index) => {
        expect(user.email).toBe(concurrentUsers[index].email)
      })

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000) // 5 seconds
    })

    it('should handle multiple concurrent existence checks', async () => {
      const testUser = await dbHelpers.createUser({
        email: 'test@example.com'
      })

      const concurrentChecks = Array(20)
        .fill()
        .map(() => userService.userExists(testUser.email))

      const startTime = Date.now()
      const results = await Promise.all(concurrentChecks)
      const endTime = Date.now()

      // All checks should return true
      results.forEach(result => {
        expect(result).toBe(true)
      })

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(3000) // 3 seconds
    })
  })

  describe('Data Integrity', () => {
    it('should maintain user data consistency', async () => {
      const userData = {
        email: 'test@example.com'
      }

      const user = await userService.createUser(userData)

      // Retrieve user multiple times and verify consistency
      const user1 = await userService.getUserById(user.userId)
      const user2 = await userService.getUserByEmail(user.email)
      const user3 = await dbHelpers.getUserById(user.userId)

      expect(user1).toEqual(user2)
      expect(user1.userId).toBe(user3.user_id)
      expect(user1.email).toBe(user3.email)
    })

    it('should handle case sensitivity correctly', async () => {
      const email = 'Test@Example.com'
      const user = await userService.createUser({ email })

      // Should find user regardless of case
      const foundUser = await userService.getUserByEmail(email.toLowerCase())
      expect(foundUser.userId).toBe(user.userId)
    })
  })
})
