/**
 * Authentication Routes Tests
 * Tests for login endpoints (admin and user)
 */

const request = require('supertest');
const app = require('../server');
const { dbHelpers, redisHelpers } = require('../../tests/utils/testHelpers');

describe('Authentication Routes', () => {
  beforeEach(async () => {
    // Clear all test data
    await dbHelpers.clearAllData();
    await redisHelpers.clearAll();
  });

  describe('POST /auth/login', () => {
    describe('Admin Login', () => {
      it('should login admin user successfully', async () => {
        // Ensure admin user exists
        await dbHelpers.createUser({
          email: 'admin@brilian.af',
          role: 'admin',
        });

        const response = await request(app)
          .post('/auth/login')
          .send({
            email: 'admin@brilian.af',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.userType).toBe('admin');
        expect(response.body.email).toBe('admin@brilian.af');
        expect(response.body.userId).toBeDefined();
      });

      it('should reject admin login with invalid email format', async () => {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: 'invalid-email',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid email format');
      });

      it('should login non-admin user as regular user', async () => {
        // Create regular user
        await dbHelpers.createUser({
          email: 'user@example.com',
          role: 'user',
        });

        const response = await request(app)
          .post('/auth/login')
          .send({
            email: 'user@example.com',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.userType).toBe('user');
        expect(response.body.email).toBe('user@example.com');
      });

      it('should create new user for non-existent email', async () => {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: 'nonexistent@example.com',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.userType).toBe('user');
        expect(response.body.email).toBe('nonexistent@example.com');

        // Verify user was created in database
        const users = await dbHelpers.getUsers();
        const createdUser = users.find(u => u.email === 'nonexistent@example.com');
        expect(createdUser).toBeDefined();
        expect(createdUser.role).toBe('user');
      });
    });

    describe('User Login', () => {
      it('should login existing user successfully', async () => {
        // Create existing user
        const user = await dbHelpers.createUser({
          email: 'user@example.com',
          role: 'user',
        });

        const response = await request(app)
          .post('/auth/login')
          .send({
            email: 'user@example.com',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.userType).toBe('user');
        expect(response.body.email).toBe('user@example.com');
        expect(response.body.userId).toBe(user.user_id);
      });

      it('should create new user and login successfully', async () => {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: 'newuser@example.com',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.userType).toBe('user');
        expect(response.body.email).toBe('newuser@example.com');
        expect(response.body.userId).toBeDefined();

        // Verify user was created in database
        const users = await dbHelpers.getUsers();
        const createdUser = users.find(u => u.email === 'newuser@example.com');
        expect(createdUser).toBeDefined();
        expect(createdUser.role).toBe('user');
      });

      it('should reject user login with invalid email format', async () => {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: 'invalid-email',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid email format');
      });
    });

    describe('General Validation', () => {
      it('should require email field', async () => {
        const response = await request(app).post('/auth/login').send({}).expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Email is required');
      });

      it('should reject empty email', async () => {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: '',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Email is required');
      });
    });
  });

  describe('POST /auth/verify', () => {
    let adminToken;
    let userToken;

    beforeEach(async () => {
      // Create admin user and get token
      await dbHelpers.createUser({
        email: 'admin@brilian.af',
        role: 'admin',
      });

      const AuthService = require('../services/AuthService');
      const authService = new AuthService();

      const adminResult = await authService.authenticateAdmin('admin@brilian.af');
      adminToken = adminResult.token;

      // Create user and get token
      const user = await dbHelpers.createUser({
        email: 'user@example.com',
        role: 'user',
      });

      const userResult = await authService.authenticateUser('user@example.com');
      userToken = userResult.token;
    });

    it('should verify admin token successfully', async () => {
      const response = await request(app)
        .post('/auth/verify')
        .send({
          token: adminToken,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(true);
      expect(response.body.userType).toBe('admin');
      expect(response.body.email).toBe('admin@brilian.af');
      expect(response.body.userId).toBeDefined();
    });

    it('should verify user token successfully', async () => {
      const response = await request(app)
        .post('/auth/verify')
        .send({
          token: userToken,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(true);
      expect(response.body.userType).toBe('user');
      expect(response.body.email).toBe('user@example.com');
      expect(response.body.userId).toBeDefined();
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/auth/verify')
        .send({
          token: 'invalid-token',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toContain('Invalid or expired token');
    });

    it('should reject expired token', async () => {
      // Create a token with very short expiry
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: 'test', email: 'test@example.com', userType: 'user' },
        'mincommerce-secret-key-change-in-production',
        { expiresIn: '1ms' }
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .post('/auth/verify')
        .send({
          token: expiredToken,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toContain('Invalid or expired token');
    });

    it('should require token field', async () => {
      const response = await request(app).post('/auth/verify').send({}).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Token is required');
    });

    it('should reject empty token', async () => {
      const response = await request(app)
        .post('/auth/verify')
        .send({
          token: '',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Token is required');
    });
  });
});
