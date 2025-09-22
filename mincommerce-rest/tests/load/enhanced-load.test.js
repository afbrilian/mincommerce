/**
 * Enhanced Load Tests
 * Comprehensive load testing with 1000+ concurrent users
 */

const PurchaseService = require('../../src/services/PurchaseService')
const { dbHelpers, redisHelpers } = require('../utils/testHelpers')
const CONSTANTS = require('../../src/constants')
const StressDataGenerator = require('../stress/utils/data-generator')
const StressMetricsCollector = require('../stress/utils/metrics-collector')

describe('Enhanced Load Tests - 1000+ Concurrent Users', () => {
  let purchaseService
  let dataGenerator
  let metricsCollector

  beforeAll(async () => {
    // Initialize services
    purchaseService = new PurchaseService()
    dataGenerator = new StressDataGenerator()
    metricsCollector = new StressMetricsCollector()
  })

  beforeEach(async () => {
    // Clear all test data
    await dbHelpers.clearAllData()
    await redisHelpers.clearAll()
  })

  afterEach(async () => {
    // Clean up
    await dataGenerator.cleanup()
    metricsCollector.reset()
  })

  describe('1000+ Concurrent Users - Race Condition Test', () => {
    it('should handle 1000+ concurrent users competing for 1 item', async () => {
      // Setup race condition scenario
      const scenario = await dataGenerator.generateRaceConditionScenario(1, 1000)
      
      // Start metrics collection
      metricsCollector.startCollection()
      
      const startTime = Date.now()
      
      // Simulate 1000+ concurrent purchase attempts
      const purchasePromises = scenario.users.map(async (user) => {
        const requestStartTime = Date.now()
        const result = await purchaseService.attemptPurchase(user.user_id)
        const requestEndTime = Date.now()
        
        // Record metrics immediately
        metricsCollector.recordRequest({
          success: result.success,
          responseTime: requestEndTime - requestStartTime,
          errorType: result.reason
        })
        
        return result
      })
      
      const results = await Promise.all(purchasePromises)
      const endTime = Date.now()
      
      // Stop metrics collection
      metricsCollector.stopCollection()
      
      // Metrics are already recorded during the requests
      
      // Verify results
      const successfulAttempts = results.filter(r => r.success)
      const failedAttempts = results.filter(r => !r.success)
      
      // Only 1 should succeed (matching available stock)
      expect(successfulAttempts).toHaveLength(1)
      expect(failedAttempts).toHaveLength(999)
      
      // Verify stock consistency
      const finalStock = await dbHelpers.getStockByProductId(scenario.product.product_id)
      expect(finalStock.available_quantity).toBe(0)
      expect(finalStock.total_quantity).toBe(0)
      
      // Verify performance
      const duration = endTime - startTime
      expect(duration).toBeLessThan(30000) // Should complete within 30 seconds
      
      // Generate performance report
      const report = metricsCollector.generateReport()
      console.log('Race Condition Test Performance:', report.performance)
      
      // Verify concurrency control
      expect(report.performance.reliability.successRate).toBeGreaterThan(99) // 99%+ success rate
    }, 60000) // 60 second timeout
  })

  describe('1000+ Concurrent Users - High Throughput Test', () => {
    it('should handle 1000+ concurrent users with high stock', async () => {
      // Setup high throughput scenario
      const scenario = await dataGenerator.generateHighThroughputScenario(1000, 1)
      
      // Start metrics collection
      metricsCollector.startCollection()
      
      const startTime = Date.now()
      
      // Simulate 1000+ concurrent purchase attempts
      const purchasePromises = scenario.users.map(async (user) => {
        const requestStartTime = Date.now()
        const result = await purchaseService.attemptPurchase(user.user_id)
        const requestEndTime = Date.now()
        
        // Record metrics immediately
        metricsCollector.recordRequest({
          success: result.success,
          responseTime: requestEndTime - requestStartTime,
          errorType: result.reason
        })
        
        return result
      })
      
      const results = await Promise.all(purchasePromises)
      const endTime = Date.now()
      
      // Stop metrics collection
      metricsCollector.stopCollection()
      
      // Metrics are already recorded during the requests
      
      // Verify results
      const successfulAttempts = results.filter(r => r.success)
      const failedAttempts = results.filter(r => !r.success)
      
      // Should have many successful attempts (high stock)
      expect(successfulAttempts.length).toBeGreaterThan(100)
      expect(failedAttempts.length).toBeLessThan(900)
      
      // Verify performance
      const duration = endTime - startTime
      expect(duration).toBeLessThan(20000) // Should complete within 20 seconds
      
      // Generate performance report
      const report = metricsCollector.generateReport()
      console.log('High Throughput Test Performance:', report.performance)
      
      // Verify throughput
      expect(report.performance.throughput.average).toBeGreaterThan(50) // 50+ RPS
    }, 60000) // 60 second timeout
  })

  describe('1000+ Concurrent Users - Mixed Load Test', () => {
    it('should handle 1000+ concurrent users with mixed scenarios', async () => {
      // Setup mixed load scenario
      const scenario = await dataGenerator.generateHighThroughputScenario(1000, 3)
      
      // Start metrics collection
      metricsCollector.startCollection()
      
      const startTime = Date.now()
      
      // Simulate mixed load - some users get limited stock, others get high stock
      const purchasePromises = scenario.users.map((user, index) => {
        // Alternate between different products to create mixed load
        const productIndex = index % scenario.products.length
        return purchaseService.attemptPurchase(user.user_id)
      })
      
      const results = await Promise.all(purchasePromises)
      const endTime = Date.now()
      
      // Stop metrics collection
      metricsCollector.stopCollection()
      
      // Metrics are already recorded during the requests
      
      // Verify results
      const successfulAttempts = results.filter(r => r.success)
      const failedAttempts = results.filter(r => !r.success)
      
      // Should have a mix of successful and failed attempts
      expect(successfulAttempts.length).toBeGreaterThan(0)
      expect(failedAttempts.length).toBeGreaterThan(0)
      
      // Verify performance
      const duration = endTime - startTime
      expect(duration).toBeLessThan(25000) // Should complete within 25 seconds
      
      // Generate performance report
      const report = metricsCollector.generateReport()
      console.log('Mixed Load Test Performance:', report.performance)
      
      // Verify system stability
      expect(report.performance.reliability.successRate).toBeGreaterThan(90) // 90%+ success rate
    }, 60000) // 60 second timeout
  })

  describe('1000+ Concurrent Users - Stress Test', () => {
    it('should maintain system stability under extreme load', async () => {
      // Setup extreme load scenario
      const scenario = await dataGenerator.generateHighThroughputScenario(2000, 1)
      
      // Start metrics collection
      metricsCollector.startCollection()
      
      const startTime = Date.now()
      
      // Simulate extreme load with 2000+ concurrent users
      const purchasePromises = scenario.users.map(async (user) => {
        const requestStartTime = Date.now()
        const result = await purchaseService.attemptPurchase(user.user_id)
        const requestEndTime = Date.now()
        
        // Record metrics immediately
        metricsCollector.recordRequest({
          success: result.success,
          responseTime: requestEndTime - requestStartTime,
          errorType: result.reason
        })
        
        return result
      })
      
      const results = await Promise.all(purchasePromises)
      const endTime = Date.now()
      
      // Stop metrics collection
      metricsCollector.stopCollection()
      
      // Metrics are already recorded during the requests
      
      // Verify results
      const successfulAttempts = results.filter(r => r.success)
      const failedAttempts = results.filter(r => !r.success)
      
      // Should handle extreme load gracefully
      expect(successfulAttempts.length).toBeGreaterThan(0)
      expect(failedAttempts.length).toBeGreaterThan(0)
      
      // Verify performance under stress
      const duration = endTime - startTime
      expect(duration).toBeLessThan(45000) // Should complete within 45 seconds
      
      // Generate performance report
      const report = metricsCollector.generateReport()
      console.log('Stress Test Performance:', report.performance)
      
      // Verify system stability under stress
      expect(report.performance.reliability.successRate).toBeGreaterThan(85) // 85%+ success rate under stress
    }, 90000) // 90 second timeout
  })

  describe('1000+ Concurrent Users - Concurrency Control Test', () => {
    it('should maintain concurrency control under high load', async () => {
      // Setup concurrency control test
      const scenario = await dataGenerator.generateRaceConditionScenario(5, 1000)
      
      // Start metrics collection
      metricsCollector.startCollection()
      
      const startTime = Date.now()
      
      // Simulate high load with limited stock
      const purchasePromises = scenario.users.map(async (user) => {
        const requestStartTime = Date.now()
        const result = await purchaseService.attemptPurchase(user.user_id)
        const requestEndTime = Date.now()
        
        // Record metrics immediately
        metricsCollector.recordRequest({
          success: result.success,
          responseTime: requestEndTime - requestStartTime,
          errorType: result.reason
        })
        
        return result
      })
      
      const results = await Promise.all(purchasePromises)
      const endTime = Date.now()
      
      // Stop metrics collection
      metricsCollector.stopCollection()
      
      // Metrics are already recorded during the requests
      
      // Verify concurrency control
      const successfulAttempts = results.filter(r => r.success)
      const failedAttempts = results.filter(r => !r.success)
      
      // Only 5 should succeed (matching available stock)
      expect(successfulAttempts).toHaveLength(5)
      expect(failedAttempts).toHaveLength(995)
      
      // Verify stock consistency
      const finalStock = await dbHelpers.getStockByProductId(scenario.product.product_id)
      expect(finalStock.available_quantity).toBe(0)
      expect(finalStock.total_quantity).toBe(0)
      
      // Verify performance
      const duration = endTime - startTime
      expect(duration).toBeLessThan(30000) // Should complete within 30 seconds
      
      // Generate performance report
      const report = metricsCollector.generateReport()
      console.log('Concurrency Control Test Performance:', report.performance)
      
      // Verify concurrency control effectiveness
      expect(report.performance.reliability.successRate).toBeGreaterThan(99) // 99%+ success rate
    }, 60000) // 60 second timeout
  })

  describe('1000+ Concurrent Users - Performance Benchmark', () => {
    it('should meet performance benchmarks under load', async () => {
      // Setup performance benchmark test
      const scenario = await dataGenerator.generateHighThroughputScenario(1000, 1)
      
      // Start metrics collection
      metricsCollector.startCollection()
      
      const startTime = Date.now()
      
      // Simulate benchmark load
      const purchasePromises = scenario.users.map(async (user) => {
        const requestStartTime = Date.now()
        const result = await purchaseService.attemptPurchase(user.user_id)
        const requestEndTime = Date.now()
        
        // Record metrics immediately
        metricsCollector.recordRequest({
          success: result.success,
          responseTime: requestEndTime - requestStartTime,
          errorType: result.reason
        })
        
        return result
      })
      
      const results = await Promise.all(purchasePromises)
      const endTime = Date.now()
      
      // Stop metrics collection
      metricsCollector.stopCollection()
      
      // Generate performance report
      const report = metricsCollector.generateReport()
      console.log('Performance Benchmark Test:', report.performance)
      
      // Verify performance benchmarks
      expect(report.performance.throughput.average).toBeGreaterThan(100) // 100+ RPS
      expect(report.performance.responseTime.p95).toBeLessThan(2000) // P95 < 2s
      expect(report.performance.reliability.successRate).toBeGreaterThan(95) // 95%+ success rate
      
      // Verify system stability
      const duration = endTime - startTime
      expect(duration).toBeLessThan(20000) // Should complete within 20 seconds
    }, 60000) // 60 second timeout
  })
})
