#!/usr/bin/env node

/**
 * Setup Stress Data Script
 * Prepares test data for stress testing scenarios
 */

const StressDataGenerator = require('../utils/data-generator')
const { dbHelpers } = require('../../utils/testHelpers')
const { connectDatabase } = require('../../../src/config/database')

async function setupStressData() {
  console.log('🚀 Setting up stress test data...')
  
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
    
    // Initialize data generator
    const dataGenerator = new StressDataGenerator()
    
    // Generate different scenarios
    console.log('\n📊 Generating stress test scenarios...')
    
    // Scenario 1: Race condition test (1 item, 1000 users)
    console.log('\n🏁 Setting up race condition scenario...')
    const raceConditionScenario = await dataGenerator.generateRaceConditionScenario(1, 1000)
    console.log(`✅ Race condition scenario ready: ${raceConditionScenario.users.length} users competing for ${raceConditionScenario.expectedSuccessfulPurchases} item`)
    
    // Scenario 2: High throughput test (10K users, 5 products)
    console.log('\n⚡ Setting up high throughput scenario...')
    const highThroughputScenario = await dataGenerator.generateHighThroughputScenario(10000, 5)
    console.log(`✅ High throughput scenario ready: ${highThroughputScenario.users.length} users, ${highThroughputScenario.products.length} products`)
    
    // Scenario 3: Mixed load test (5K users, 3 products)
    console.log('\n🔄 Setting up mixed load scenario...')
    const mixedLoadScenario = await dataGenerator.generateHighThroughputScenario(5000, 3)
    console.log(`✅ Mixed load scenario ready: ${mixedLoadScenario.users.length} users, ${mixedLoadScenario.products.length} products`)
    
    // Display statistics
    const stats = dataGenerator.getStats()
    console.log('\n📈 Stress test data statistics:')
    console.log(`   Users: ${stats.users}`)
    console.log(`   Products: ${stats.products}`)
    console.log(`   Flash Sales: ${stats.flashSales}`)
    
    console.log('\n✅ Stress test data setup completed successfully!')
    console.log('\n🎯 Available test scenarios:')
    console.log('   1. Race Condition: 1 item, 1000 users')
    console.log('   2. High Throughput: 10K users, 5 products')
    console.log('   3. Mixed Load: 5K users, 3 products')
    
  } catch (error) {
    console.error('❌ Error setting up stress test data:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  setupStressData()
}

module.exports = setupStressData
