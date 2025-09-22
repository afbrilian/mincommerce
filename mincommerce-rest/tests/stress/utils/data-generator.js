/**
 * Data Generator for Stress Testing
 * Generates test data for large-scale stress tests
 */

const { v4: uuidv4 } = require('uuid')
const { dbHelpers } = require('../../utils/testHelpers')
const CONSTANTS = require('../../../src/constants')

class StressDataGenerator {
  constructor() {
    this.generatedUsers = []
    this.generatedProducts = []
    this.generatedFlashSales = []
  }

  /**
   * Generate multiple test users for stress testing
   * @param {number} count - Number of users to generate
   * @returns {Array} Array of generated users
   */
  async generateUsers(count = 1000) {
    console.log(`Generating ${count} test users...`)
    
    const users = []
    const batchSize = 100 // Process in batches to avoid memory issues
    
    for (let i = 0; i < count; i += batchSize) {
      const batchCount = Math.min(batchSize, count - i)
      const batchPromises = Array(batchCount)
        .fill()
        .map(async (_, index) => {
          const userData = {
            email: `stress-test-user-${i + index}-${uuidv4()}@test.com`,
            role: 'user'
          }
          
          try {
            const user = await dbHelpers.createUser(userData)
            return user
          } catch (error) {
            console.warn(`Failed to create user ${i + index}:`, error.message)
            return null
          }
        })
      
      const batchResults = await Promise.all(batchPromises)
      const validUsers = batchResults.filter(user => user !== null)
      users.push(...validUsers)
      
      console.log(`Generated ${users.length}/${count} users...`)
    }
    
    this.generatedUsers = users
    console.log(`Successfully generated ${users.length} users`)
    return users
  }

  /**
   * Generate test products with stock for stress testing
   * @param {number} count - Number of products to generate
   * @param {Object} stockConfig - Stock configuration
   * @returns {Array} Array of generated products
   */
  async generateProducts(count = 10, stockConfig = {}) {
    console.log(`Generating ${count} test products...`)
    
    const products = []
    const defaultStockConfig = {
      total_quantity: 100,
      available_quantity: 100,
      reserved_quantity: 0,
      ...stockConfig
    }
    
    for (let i = 0; i < count; i++) {
      try {
        const productData = {
          name: `Stress Test Product ${i + 1}`,
          description: `Product for stress testing - ${i + 1}`,
          price: 99.99 + (i * 10)
        }
        
        const { product, stock } = await dbHelpers.createProductWithStock(
          productData,
          defaultStockConfig
        )
        
        products.push({ product, stock })
        console.log(`Generated product ${i + 1}/${count}`)
      } catch (error) {
        console.warn(`Failed to create product ${i + 1}:`, error.message)
      }
    }
    
    this.generatedProducts = products
    console.log(`Successfully generated ${products.length} products`)
    return products
  }

  /**
   * Generate flash sales for stress testing
   * @param {Array} products - Array of products to create flash sales for
   * @param {Object} saleConfig - Flash sale configuration
   * @returns {Array} Array of generated flash sales
   */
  async generateFlashSales(products, saleConfig = {}) {
    console.log(`Generating flash sales for ${products.length} products...`)
    
    const flashSales = []
    const now = new Date()
    const defaultSaleConfig = {
      status: CONSTANTS.SALE_STATUS.ACTIVE,
      start_time: new Date(now.getTime() - 60000), // Started 1 minute ago
      end_time: new Date(now.getTime() + 3600000), // Ends in 1 hour
      ...saleConfig
    }
    
    for (let i = 0; i < products.length; i++) {
      try {
        const flashSale = await dbHelpers.createFlashSale(
          products[i].product.product_id,
          defaultSaleConfig
        )
        
        flashSales.push(flashSale)
        console.log(`Generated flash sale ${i + 1}/${products.length}`)
      } catch (error) {
        console.warn(`Failed to create flash sale ${i + 1}:`, error.message)
      }
    }
    
    this.generatedFlashSales = flashSales
    console.log(`Successfully generated ${flashSales.length} flash sales`)
    return flashSales
  }

  /**
   * Generate limited stock scenario for race condition testing
   * @param {number} stockCount - Number of items in stock
   * @param {number} userCount - Number of users to compete
   * @returns {Object} Generated scenario data
   */
  async generateRaceConditionScenario(stockCount = 1, userCount = 1000) {
    console.log(`Generating race condition scenario: ${stockCount} items, ${userCount} users`)
    
    // Create product with limited stock
    const { product, stock } = await dbHelpers.createProductWithStock(
      {
        name: 'Limited Edition Race Test Product',
        description: 'Product for testing race conditions',
        price: 199.99
      },
      {
        total_quantity: stockCount,
        available_quantity: stockCount,
        reserved_quantity: 0
      }
    )
    
    // Create flash sale
    const flashSale = await dbHelpers.createFlashSale(product.product_id, {
      status: CONSTANTS.SALE_STATUS.ACTIVE,
      start_time: new Date(Date.now() - 60000),
      end_time: new Date(Date.now() + 3600000)
    })
    
    // Generate competing users
    const users = await this.generateUsers(userCount)
    
    console.log(`Race condition scenario ready: ${stockCount} items, ${users.length} users`)
    
    return {
      product,
      stock,
      flashSale,
      users,
      expectedSuccessfulPurchases: stockCount,
      expectedFailedPurchases: userCount - stockCount
    }
  }

  /**
   * Generate high throughput scenario
   * @param {number} userCount - Number of users
   * @param {number} productCount - Number of products
   * @returns {Object} Generated scenario data
   */
  async generateHighThroughputScenario(userCount = 10000, productCount = 5) {
    console.log(`Generating high throughput scenario: ${userCount} users, ${productCount} products`)
    
    // Generate users
    const users = await this.generateUsers(userCount)
    
    // Generate products with high stock
    const products = await this.generateProducts(productCount, {
      total_quantity: 1000,
      available_quantity: 1000,
      reserved_quantity: 0
    })
    
    // Generate flash sales
    const flashSales = await this.generateFlashSales(products)
    
    console.log(`High throughput scenario ready: ${users.length} users, ${products.length} products`)
    
    return {
      users,
      products,
      flashSales
    }
  }

  /**
   * Clean up generated test data
   */
  async cleanup() {
    console.log('Cleaning up generated test data...')
    
    try {
      await dbHelpers.clearAllData()
      console.log('Test data cleanup completed')
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }

  /**
   * Get statistics about generated data
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      users: this.generatedUsers.length,
      products: this.generatedProducts.length,
      flashSales: this.generatedFlashSales.length
    }
  }
}

module.exports = StressDataGenerator
