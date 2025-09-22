#!/usr/bin/env node

/**
 * Simple Setup Script
 * Prepares minimal test data for stress testing
 */

const { dbHelpers } = require('../../utils/testHelpers')
const { connectDatabase } = require('../../../src/config/database')
const CONSTANTS = require('../../../src/constants')

async function simpleSetup() {
  console.log('🚀 Setting up simple stress test data...')
  
  try {
    // Initialize database connection
    console.log('🔌 Connecting to database...')
    await connectDatabase()
    
    // Run migrations to ensure tables exist
    console.log('📊 Running database migrations...')
    const { execSync } = require('child_process')
    execSync('NODE_ENV=test npm run migrate', { stdio: 'inherit' })
    
    // Clear existing test data
    console.log('🧹 Clearing existing test data...')
    await dbHelpers.clearAllData()
    
    // Create minimal test data
    console.log('📦 Creating minimal test data...')
    
    // Create a test product with stock
    const { product, stock } = await dbHelpers.createProductWithStock(
      {
        name: 'Stress Test Product',
        description: 'Product for stress testing',
        price: 99.99
      },
      {
        total_quantity: 100,
        available_quantity: 100,
        reserved_quantity: 0
      }
    )
    
    // Create a flash sale
    const flashSale = await dbHelpers.createFlashSale(product.product_id, {
      status: CONSTANTS.SALE_STATUS.ACTIVE,
      start_time: new Date(Date.now() - 60000), // Started 1 minute ago
      end_time: new Date(Date.now() + 3600000) // Ends in 1 hour
    })
    
    // Create a few test users
    const users = []
    for (let i = 0; i < 10; i++) {
      const user = await dbHelpers.createUser({
        email: `stress-test-user-${i}@test.com`,
        role: 'user'
      })
      users.push(user)
    }
    
    console.log('✅ Simple stress test data setup completed!')
    console.log(`   Product: ${product.name} (ID: ${product.product_id})`)
    console.log(`   Stock: ${stock.available_quantity} available`)
    console.log(`   Flash Sale: ${flashSale.sale_id}`)
    console.log(`   Users: ${users.length} test users created`)
    
  } catch (error) {
    console.error('❌ Error setting up simple stress test data:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  simpleSetup()
}

module.exports = simpleSetup
