#!/usr/bin/env node

/**
 * Run All Stress Tests Script
 * Executes all stress test scenarios and generates comprehensive reports
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs').promises
const StressResultAnalyzer = require('../utils/result-analyzer')

class StressTestRunner {
  constructor() {
    this.testConfigs = [
      { name: '10k-users', file: '10k-users.yml', description: '10K Concurrent Users Test' },
      { name: '1k-purchases', file: '1k-purchases.yml', description: '1K Concurrent Purchases Test' },
      { name: '100k-requests', file: '100k-requests.yml', description: '100K Requests Throughput Test' },
      { name: 'database-stress', file: 'database-stress.yml', description: 'Database Stress Test' }
    ]
    this.results = []
    this.startTime = Date.now()
  }

  /**
   * Run all stress tests
   */
  async runAllTests() {
    console.log('🚀 Starting comprehensive stress testing...')
    console.log(`📅 Test started at: ${new Date().toISOString()}`)
    console.log(`🎯 Running ${this.testConfigs.length} test scenarios\n`)

    for (let i = 0; i < this.testConfigs.length; i++) {
      const config = this.testConfigs[i]
      console.log(`\n📊 Running test ${i + 1}/${this.testConfigs.length}: ${config.description}`)
      
      try {
        const result = await this.runSingleTest(config)
        this.results.push(result)
        console.log(`✅ Test completed: ${config.name}`)
      } catch (error) {
        console.error(`❌ Test failed: ${config.name}`, error.message)
        this.results.push({
          name: config.name,
          status: 'failed',
          error: error.message
        })
      }
    }

    await this.generateComprehensiveReport()
  }

  /**
   * Run a single stress test
   * @param {Object} config - Test configuration
   * @returns {Object} Test result
   */
  async runSingleTest(config) {
    const configPath = path.join(__dirname, '../artillery', config.file)
    const outputPath = path.join(__dirname, '../results', `${config.name}-results.json`)
    
    console.log(`   📁 Config: ${configPath}`)
    console.log(`   📄 Output: ${outputPath}`)
    
    try {
      // Run Artillery test
      const command = `artillery run ${configPath} --output ${outputPath}`
      console.log(`   🔧 Command: ${command}`)
      
      const startTime = Date.now()
      execSync(command, { stdio: 'inherit' })
      const endTime = Date.now()
      
      // Read and parse results
      const resultsData = await fs.readFile(outputPath, 'utf8')
      const results = JSON.parse(resultsData)
      
      return {
        name: config.name,
        description: config.description,
        status: 'completed',
        duration: endTime - startTime,
        results: results,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      throw new Error(`Artillery test failed: ${error.message}`)
    }
  }

  /**
   * Generate comprehensive report
   */
  async generateComprehensiveReport() {
    console.log('\n📊 Generating comprehensive stress test report...')
    
    const endTime = Date.now()
    const totalDuration = endTime - this.startTime
    
    // Analyze each test result
    const analyzedResults = []
    for (const result of this.results) {
      if (result.status === 'completed') {
        try {
          const analyzer = new StressResultAnalyzer()
          analyzer.results = result.results
          const analysis = analyzer.analyze()
          analyzedResults.push({
            ...result,
            analysis: analysis
          })
        } catch (error) {
          console.warn(`⚠️  Could not analyze results for ${result.name}: ${error.message}`)
          analyzedResults.push(result)
        }
      } else {
        analyzedResults.push(result)
      }
    }
    
    // Generate summary
    const summary = this.generateSummary(analyzedResults, totalDuration)
    
    // Create comprehensive report
    const report = {
      metadata: {
        testRunId: `stress-test-${Date.now()}`,
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        totalDuration: totalDuration,
        totalTests: this.testConfigs.length,
        completedTests: this.results.filter(r => r.status === 'completed').length,
        failedTests: this.results.filter(r => r.status === 'failed').length
      },
      summary: summary,
      detailedResults: analyzedResults,
      recommendations: this.generateOverallRecommendations(analyzedResults)
    }
    
    // Save report
    const reportPath = path.join(__dirname, '../results', `comprehensive-stress-report-${Date.now()}.json`)
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    
    // Display summary
    this.displaySummary(summary)
    
    console.log(`\n📄 Comprehensive report saved to: ${reportPath}`)
    console.log('\n✅ All stress tests completed!')
  }

  /**
   * Generate test summary
   * @param {Array} results - Analyzed test results
   * @param {number} totalDuration - Total test duration
   * @returns {Object} Test summary
   */
  generateSummary(results, totalDuration) {
    const completedTests = results.filter(r => r.status === 'completed')
    const failedTests = results.filter(r => r.status === 'failed')
    
    // Calculate overall performance metrics
    const allThroughputs = completedTests
      .filter(r => r.analysis && r.analysis.overall)
      .map(r => r.analysis.overall.throughput.average)
    
    const allResponseTimes = completedTests
      .filter(r => r.analysis && r.analysis.overall)
      .map(r => r.analysis.overall.responseTime.p95)
    
    const allSuccessRates = completedTests
      .filter(r => r.analysis && r.analysis.overall)
      .map(r => r.analysis.overall.reliability.successRate)
    
    return {
      execution: {
        totalDuration: totalDuration,
        totalTests: results.length,
        completedTests: completedTests.length,
        failedTests: failedTests.length,
        successRate: (completedTests.length / results.length) * 100
      },
      performance: {
        averageThroughput: allThroughputs.length > 0 ? allThroughputs.reduce((a, b) => a + b, 0) / allThroughputs.length : 0,
        maxThroughput: allThroughputs.length > 0 ? Math.max(...allThroughputs) : 0,
        averageResponseTime: allResponseTimes.length > 0 ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length : 0,
        maxResponseTime: allResponseTimes.length > 0 ? Math.max(...allResponseTimes) : 0,
        averageSuccessRate: allSuccessRates.length > 0 ? allSuccessRates.reduce((a, b) => a + b, 0) / allSuccessRates.length : 0,
        minSuccessRate: allSuccessRates.length > 0 ? Math.min(...allSuccessRates) : 0
      },
      testResults: results.map(r => ({
        name: r.name,
        status: r.status,
        duration: r.duration,
        performance: r.analysis ? r.analysis.overall : null
      }))
    }
  }

  /**
   * Generate overall recommendations
   * @param {Array} results - Analyzed test results
   * @returns {Array} Overall recommendations
   */
  generateOverallRecommendations(results) {
    const recommendations = []
    const completedTests = results.filter(r => r.status === 'completed' && r.analysis)
    
    // Performance recommendations
    const lowThroughputTests = completedTests.filter(r => r.analysis.overall.throughput.rating === 'poor')
    if (lowThroughputTests.length > 0) {
      recommendations.push('HIGH: Address throughput issues in multiple test scenarios')
    }
    
    const highResponseTimeTests = completedTests.filter(r => r.analysis.overall.responseTime.rating === 'poor')
    if (highResponseTimeTests.length > 0) {
      recommendations.push('HIGH: Optimize response times across multiple scenarios')
    }
    
    const lowReliabilityTests = completedTests.filter(r => r.analysis.overall.reliability.rating === 'poor')
    if (lowReliabilityTests.length > 0) {
      recommendations.push('CRITICAL: Fix reliability issues affecting multiple scenarios')
    }
    
    // Concurrency recommendations
    const poorConcurrencyTests = completedTests.filter(r => r.analysis.concurrency.overallRating === 'poor')
    if (poorConcurrencyTests.length > 0) {
      recommendations.push('CRITICAL: Strengthen concurrency control mechanisms')
    }
    
    // Bottleneck recommendations
    const testsWithBottlenecks = completedTests.filter(r => r.analysis.bottlenecks.length > 0)
    if (testsWithBottlenecks.length > 0) {
      recommendations.push('MEDIUM: Address performance bottlenecks identified in multiple tests')
    }
    
    return recommendations
  }

  /**
   * Display test summary
   * @param {Object} summary - Test summary
   */
  displaySummary(summary) {
    console.log('\n' + '='.repeat(80))
    console.log('📊 STRESS TEST SUMMARY')
    console.log('='.repeat(80))
    
    console.log(`\n⏱️  Execution:`)
    console.log(`   Total Duration: ${Math.round(summary.execution.totalDuration / 1000)}s`)
    console.log(`   Tests Run: ${summary.execution.completedTests}/${summary.execution.totalTests}`)
    console.log(`   Success Rate: ${Math.round(summary.execution.successRate)}%`)
    
    console.log(`\n🚀 Performance:`)
    console.log(`   Average Throughput: ${Math.round(summary.performance.averageThroughput)} RPS`)
    console.log(`   Max Throughput: ${Math.round(summary.performance.maxThroughput)} RPS`)
    console.log(`   Average Response Time: ${Math.round(summary.performance.averageResponseTime)}ms`)
    console.log(`   Max Response Time: ${Math.round(summary.performance.maxResponseTime)}ms`)
    console.log(`   Average Success Rate: ${Math.round(summary.performance.averageSuccessRate)}%`)
    console.log(`   Min Success Rate: ${Math.round(summary.performance.minSuccessRate)}%`)
    
    console.log(`\n📋 Test Results:`)
    summary.testResults.forEach(result => {
      const status = result.status === 'completed' ? '✅' : '❌'
      const performance = result.performance ? 
        `(${result.performance.throughput.rating} throughput, ${result.performance.responseTime.rating} response time)` : 
        ''
      console.log(`   ${status} ${result.name}: ${result.status} ${performance}`)
    })
    
    console.log('\n' + '='.repeat(80))
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new StressTestRunner()
  runner.runAllTests().catch(error => {
    console.error('❌ Stress test runner failed:', error)
    process.exit(1)
  })
}

module.exports = StressTestRunner
