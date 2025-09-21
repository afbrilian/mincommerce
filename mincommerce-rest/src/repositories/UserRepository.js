const BaseRepository = require('./BaseRepository')
const User = require('../models/User')
const logger = require('../utils/logger')

class UserRepository extends BaseRepository {
  constructor() {
    super('users', 'user_id')
  }

  async findByEmail(email) {
    try {
      const result = await this.db(this.tableName).where('email', email).first()
      return result ? User.fromDatabase(result) : null
    } catch (error) {
      logger.error(`Error finding user by email ${email}:`, error)
      throw error
    }
  }

  async findById(userId) {
    try {
      const result = await this.db(this.tableName).where('user_id', userId).first()
      return result ? User.fromDatabase(result) : null
    } catch (error) {
      logger.error(`Error finding user by id ${userId}:`, error)
      throw error
    }
  }

  async create(userData) {
    try {
      const results = await this.db(this.tableName).insert(userData).returning('*')
      return User.fromDatabase(results[0])
    } catch (error) {
      logger.error('Error creating user:', error)
      throw error
    }
  }

  async exists(email) {
    try {
      const result = await this.db(this.tableName).where('email', email).count('* as count').first()
      return parseInt(result.count) > 0
    } catch (error) {
      logger.error(`Error checking if user exists with email ${email}:`, error)
      throw error
    }
  }
}

module.exports = UserRepository
