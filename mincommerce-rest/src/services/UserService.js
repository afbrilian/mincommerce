const UserRepository = require('../repositories/UserRepository');
const logger = require('../utils/logger');

class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  async createUser(userData) {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        throw new Error('Invalid email format');
      }

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const user = await this.userRepository.create(userData);
      logger.info(`User created: ${user.userId}`);
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      logger.error(`Error getting user ${userId}:`, error);
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      logger.error(`Error getting user by email ${email}:`, error);
      throw error;
    }
  }

  async userExists(email) {
    try {
      return await this.userRepository.exists(email);
    } catch (error) {
      logger.error(`Error checking if user exists ${email}:`, error);
      throw error;
    }
  }

  async findOrCreateUser(email) {
    try {
      let user = await this.userRepository.findByEmail(email);

      if (!user) {
        user = await this.createUser({ email });
        logger.info(`Auto-created user for email: ${email}`);
      }

      return user;
    } catch (error) {
      logger.error(`Error finding or creating user ${email}:`, error);
      throw error;
    }
  }
}

module.exports = UserService;
