const { getDatabase } = require('../config/database')
const logger = require('../utils/logger')

class BaseRepository {
  constructor(tableName, idColumn = 'id') {
    this.tableName = tableName
    this.idColumn = idColumn
  }

  get db() {
    return getDatabase()
  }

  async findById(id) {
    try {
      const result = await this.db(this.tableName).where(this.idColumn, id).first()
      return result
    } catch (error) {
      logger.error(`Error finding ${this.tableName} by ${this.idColumn} ${id}:`, error)
      throw error
    }
  }

  async findAll(limit = 100, offset = 0) {
    try {
      const results = await this.db(this.tableName).select('*').limit(limit).offset(offset)
      return results
    } catch (error) {
      logger.error(`Error finding all ${this.tableName}:`, error)
      throw error
    }
  }

  async create(data) {
    try {
      const results = await this.db(this.tableName).insert(data).returning('*')
      return results[0]
    } catch (error) {
      logger.error(`Error creating ${this.tableName}:`, error)
      throw error
    }
  }

  async update(id, data) {
    try {
      const results = await this.db(this.tableName)
        .where(this.idColumn, id)
        .update(data)
        .returning('*')
      return results[0]
    } catch (error) {
      logger.error(`Error updating ${this.tableName} with ${this.idColumn} ${id}:`, error)
      throw error
    }
  }

  async delete(id) {
    try {
      const result = await this.db(this.tableName).where(this.idColumn, id).del()
      return result
    } catch (error) {
      logger.error(`Error deleting ${this.tableName} with ${this.idColumn} ${id}:`, error)
      throw error
    }
  }

  async count() {
    try {
      const result = await this.db(this.tableName).count('* as count').first()
      return parseInt(result.count)
    } catch (error) {
      logger.error(`Error counting ${this.tableName}:`, error)
      throw error
    }
  }
}

module.exports = BaseRepository
