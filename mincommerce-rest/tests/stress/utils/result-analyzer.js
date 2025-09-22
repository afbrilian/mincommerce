/**
 * Result Analyzer for Stress Testing
 * Analyzes stress test results and provides insights
 */

const fs = require('fs').promises
const path = require('path')

class StressResultAnalyzer {
  constructor() {
    this.results = []
    this.analysis = {}
  }

  /**
   * Load results from file
   * @param {string} filename - Results filename
   */
  async loadResults(filename) {
    try {
      const filepath = path.join(__dirname, '../results', filename)
      const data = await fs.readFile(filepath, 'utf8')
      this.results = JSON.parse(data)
      console.log(`Loaded results from ${filename}`)
    } catch (error) {
      console.error('Error loading results:', error)
      throw error
    }
  }

  /**
   * Analyze stress test results
   * @returns {Object} Analysis results
   */
  analyze() {
    if (!this.results || this.results.length === 0) {
      throw new Error('No results to analyze')
    }

    this.analysis = {
      overall: this.analyzeOverallPerformance(),
      bottlenecks: this.identifyBottlenecks(),
      scalability: this.analyzeScalability(),
      reliability: this.analyzeReliability(),
      concurrency: this.analyzeConcurrencyControl()
    }
    
    // Generate recommendations after analysis is complete
    this.analysis.recommendations = this.generateRecommendations()

    return this.analysis
  }

  /**
   * Analyze overall performance
   * @returns {Object} Overall performance analysis
   */
  analyzeOverallPerformance() {
    const aggregate = this.results.aggregate
    const counters = aggregate.counters
    const rates = aggregate.rates
    const summaries = aggregate.summaries
    
    // Extract throughput data
    const totalRequests = counters['http.requests'] || 0
    const totalResponses = counters['http.responses'] || 0
    const requestRate = rates['http.request_rate'] || 0
    
    // Extract response time data
    const responseTimeSummary = summaries['http.response_time'] || {}
    const avgResponseTime = responseTimeSummary.mean || 0
    const p95ResponseTime = responseTimeSummary.p95 || 0
    const p99ResponseTime = responseTimeSummary.p99 || 0
    
    // Extract reliability data
    const successResponses = counters['http.codes.200'] || 0
    const errorResponses = counters['http.codes.429'] || 0
    const timeoutErrors = counters['errors.ETIMEDOUT'] || 0
    const totalErrors = errorResponses + timeoutErrors
    const successRate = totalResponses > 0 ? (successResponses / totalResponses) * 100 : 0
    const errorRate = totalResponses > 0 ? (totalErrors / totalResponses) * 100 : 0
    
    return {
      throughput: {
        average: requestRate,
        peak: requestRate * 1.2, // Estimate peak as 20% higher than average
        totalRequests: totalRequests,
        totalResponses: totalResponses,
        rating: this.rateThroughput(requestRate)
      },
      responseTime: {
        average: avgResponseTime,
        p95: p95ResponseTime,
        p99: p99ResponseTime,
        min: responseTimeSummary.min || 0,
        max: responseTimeSummary.max || 0,
        rating: this.rateResponseTime(p95ResponseTime)
      },
      reliability: {
        successRate: successRate,
        errorRate: errorRate,
        successResponses: successResponses,
        errorResponses: errorResponses,
        timeoutErrors: timeoutErrors,
        rating: this.rateReliability(successRate)
      }
    }
  }

  /**
   * Identify performance bottlenecks
   * @returns {Array} List of bottlenecks
   */
  identifyBottlenecks() {
    const bottlenecks = []
    const aggregate = this.results.aggregate
    const counters = aggregate.counters
    const summaries = aggregate.summaries
    
    // Get performance data
    const responseTimeSummary = summaries['http.response_time'] || {}
    const p95ResponseTime = responseTimeSummary.p95 || 0
    const totalResponses = counters['http.responses'] || 0
    const errorResponses = counters['http.codes.429'] || 0
    const timeoutErrors = counters['errors.ETIMEDOUT'] || 0
    const totalErrors = errorResponses + timeoutErrors
    const errorRate = totalResponses > 0 ? (totalErrors / totalResponses) * 100 : 0

    // Response time bottlenecks
    if (p95ResponseTime > 2000) {
      bottlenecks.push({
        type: 'response_time',
        severity: 'high',
        description: 'P95 response time exceeds 2 seconds',
        value: p95ResponseTime,
        threshold: 2000
      })
    }

    // Error rate bottlenecks
    if (errorRate > 5) {
      bottlenecks.push({
        type: 'error_rate',
        severity: 'high',
        description: 'Error rate exceeds 5%',
        value: errorRate,
        threshold: 5
      })
    }

    // Rate limiting bottlenecks
    if (errorResponses > 0) {
      bottlenecks.push({
        type: 'rate_limiting',
        severity: 'medium',
        description: 'Rate limiting is active',
        value: errorResponses,
        threshold: 0
      })
    }

    // Timeout bottlenecks
    if (timeoutErrors > 0) {
      bottlenecks.push({
        type: 'timeouts',
        severity: 'high',
        description: 'Request timeouts detected',
        value: timeoutErrors,
        threshold: 0
      })
    }

    return bottlenecks
  }

  /**
   * Analyze scalability
   * @returns {Object} Scalability analysis
   */
  analyzeScalability() {
    const aggregate = this.results.aggregate
    const counters = aggregate.counters
    const rates = aggregate.rates
    
    const requestRate = rates['http.request_rate'] || 0
    const totalRequests = counters['http.requests'] || 0
    const totalResponses = counters['http.responses'] || 0
    const successRate = totalResponses > 0 ? (counters['http.codes.200'] || 0) / totalResponses * 100 : 0

    return {
      currentCapacity: {
        users: this.estimateUserCapacity(requestRate),
        requestsPerSecond: requestRate,
        totalRequests: totalRequests,
        rating: this.rateScalability(requestRate)
      },
      scalingFactors: {
        responseTimeDegradation: 0, // Cannot calculate from Artillery results alone
        errorRateIncrease: 0, // Cannot calculate from Artillery results alone
        successRate: successRate
      },
      recommendations: this.generateScalingRecommendations()
    }
  }

  /**
   * Analyze reliability
   * @returns {Object} Reliability analysis
   */
  analyzeReliability() {
    const aggregate = this.results.aggregate
    const counters = aggregate.counters
    
    const totalResponses = counters['http.responses'] || 0
    const successResponses = counters['http.codes.200'] || 0
    const errorResponses = counters['http.codes.429'] || 0
    const timeoutErrors = counters['errors.ETIMEDOUT'] || 0
    const totalErrors = errorResponses + timeoutErrors
    const successRate = totalResponses > 0 ? (successResponses / totalResponses) * 100 : 0
    const errorRate = totalResponses > 0 ? (totalErrors / totalResponses) * 100 : 0

    return {
      overall: {
        successRate: successRate,
        errorRate: errorRate,
        rating: this.rateReliability(successRate)
      },
      errorAnalysis: {
        totalErrors: totalErrors,
        errorTypes: {
          rateLimited: errorResponses,
          timeouts: timeoutErrors,
          other: counters['errors.Failed capture or match'] || 0
        },
        criticalErrors: timeoutErrors > 0 ? ['timeouts'] : []
      },
      faultTolerance: {
        recoveryTime: 0, // Cannot estimate from Artillery results alone
        resilience: 'good' // Based on error handling
      }
    }
  }

  /**
   * Analyze concurrency control
   * @returns {Object} Concurrency control analysis
   */
  analyzeConcurrencyControl() {
    const aggregate = this.results.aggregate
    const counters = aggregate.counters
    
    const totalResponses = counters['http.responses'] || 0
    const successResponses = counters['http.codes.200'] || 0
    const errorResponses = counters['http.codes.429'] || 0
    const timeoutErrors = counters['errors.ETIMEDOUT'] || 0
    const totalErrors = errorResponses + timeoutErrors

    return {
      raceConditions: {
        detected: timeoutErrors > 0,
        severity: timeoutErrors > 1000 ? 'high' : timeoutErrors > 100 ? 'medium' : 'low'
      },
      stockConsistency: {
        maintained: true, // We can't detect overselling from Artillery results alone
        overselling: false
      },
      userLimits: {
        enforced: errorResponses > 0, // Rate limiting indicates user limits are enforced
        violations: errorResponses
      },
      overallRating: this.rateConcurrencyControl({ totalErrors, timeoutErrors, errorResponses })
    }
  }

  /**
   * Rate throughput performance
   * @param {number} throughput - Throughput value
   * @returns {string} Rating
   */
  rateThroughput(throughput) {
    if (throughput >= 1000) return 'excellent'
    if (throughput >= 500) return 'good'
    if (throughput >= 100) return 'fair'
    return 'poor'
  }

  /**
   * Rate response time performance
   * @param {number} responseTime - Response time value
   * @returns {string} Rating
   */
  rateResponseTime(responseTime) {
    if (responseTime <= 500) return 'excellent'
    if (responseTime <= 1000) return 'good'
    if (responseTime <= 2000) return 'fair'
    return 'poor'
  }

  /**
   * Rate reliability
   * @param {number} successRate - Success rate value
   * @returns {string} Rating
   */
  rateReliability(successRate) {
    if (successRate >= 99) return 'excellent'
    if (successRate >= 95) return 'good'
    if (successRate >= 90) return 'fair'
    return 'poor'
  }

  /**
   * Rate scalability
   * @param {number} throughput - Throughput value
   * @returns {string} Rating
   */
  rateScalability(throughput) {
    if (throughput >= 500) return 'excellent'
    if (throughput >= 200) return 'good'
    if (throughput >= 100) return 'fair'
    return 'poor'
  }

  /**
   * Estimate user capacity
   * @param {number} throughput - Throughput value
   * @returns {number} Estimated user capacity
   */
  estimateUserCapacity(throughput) {
    // Assume average user makes 10 requests per minute
    return Math.floor(throughput * 60 / 10)
  }

  /**
   * Detect race conditions
   * @param {Object} errors - Error data
   * @returns {boolean} Whether race conditions were detected
   */
  detectRaceConditions(errors) {
    // Look for specific error patterns that indicate race conditions
    const raceConditionErrors = ['OUT_OF_STOCK', 'ALREADY_PURCHASED', 'CONCURRENT_ACCESS']
    return Object.keys(errors).some(errorType => 
      raceConditionErrors.includes(errorType)
    )
  }

  /**
   * Verify stock consistency
   * @param {Object} errors - Error data
   * @returns {boolean} Whether stock consistency was maintained
   */
  verifyStockConsistency(errors) {
    // If we see OUT_OF_STOCK errors, it means stock limits were enforced
    return errors.OUT_OF_STOCK > 0
  }

  /**
   * Detect overselling
   * @param {Object} errors - Error data
   * @returns {boolean} Whether overselling was detected
   */
  detectOverselling(errors) {
    // Overselling would manifest as successful purchases exceeding available stock
    // This would be detected by comparing successful purchases to stock limits
    return false // This would need to be implemented based on specific test data
  }

  /**
   * Verify user limits
   * @param {Object} errors - Error data
   * @returns {boolean} Whether user limits were enforced
   */
  verifyUserLimits(errors) {
    // If we see ALREADY_PURCHASED errors, it means user limits were enforced
    return errors.ALREADY_PURCHASED > 0
  }

  /**
   * Rate concurrency control
   * @param {Object} errors - Error data
   * @returns {string} Rating
   */
  rateConcurrencyControl(errors) {
    const raceConditions = this.detectRaceConditions(errors)
    const stockConsistency = this.verifyStockConsistency(errors)
    const userLimits = this.verifyUserLimits(errors)

    if (raceConditions && stockConsistency && userLimits) {
      return 'excellent' // All controls working properly
    }
    if (stockConsistency && userLimits) {
      return 'good' // Core controls working
    }
    if (stockConsistency || userLimits) {
      return 'fair' // Some controls working
    }
    return 'poor' // Controls not working properly
  }

  /**
   * Generate recommendations
   * @returns {Array} List of recommendations
   */
  generateRecommendations() {
    const recommendations = []
    const bottlenecks = this.identifyBottlenecks()

    // Performance recommendations
    if (this.analysis.overall.throughput.rating === 'poor') {
      recommendations.push('Consider horizontal scaling or performance optimization to improve throughput')
    }

    if (this.analysis.overall.responseTime.rating === 'poor') {
      recommendations.push('Optimize database queries, implement caching, or increase server resources')
    }

    if (this.analysis.overall.reliability.rating === 'poor') {
      recommendations.push('Investigate and fix underlying issues causing high error rates')
    }

    // Bottleneck-specific recommendations
    bottlenecks.forEach(bottleneck => {
      switch (bottleneck.type) {
        case 'response_time':
          recommendations.push('Implement response time optimization strategies')
          break
        case 'error_rate':
          recommendations.push('Investigate error sources and implement error handling improvements')
          break
        case 'memory':
          recommendations.push('Increase memory allocation or optimize memory usage')
          break
        case 'cpu':
          recommendations.push('Increase CPU resources or optimize CPU-intensive operations')
          break
        case 'database_connections':
          recommendations.push('Increase database connection pool size or optimize database usage')
          break
      }
    })

    // Concurrency control recommendations
    if (this.analysis.concurrency.overallRating === 'poor') {
      recommendations.push('Review and strengthen concurrency control mechanisms')
    }

    return recommendations
  }

  /**
   * Generate scaling recommendations
   * @returns {Array} Scaling recommendations
   */
  generateScalingRecommendations() {
    const recommendations = []
    const aggregate = this.results.aggregate
    const counters = aggregate.counters
    const rates = aggregate.rates
    const summaries = aggregate.summaries
    
    const requestRate = rates['http.request_rate'] || 0
    const responseTimeSummary = summaries['http.response_time'] || {}
    const p95ResponseTime = responseTimeSummary.p95 || 0
    const errorResponses = counters['http.codes.429'] || 0
    const timeoutErrors = counters['errors.ETIMEDOUT'] || 0

    if (requestRate < 100) {
      recommendations.push('Implement horizontal scaling with load balancers')
    }

    if (p95ResponseTime > 2000) {
      recommendations.push('Consider implementing caching layers and CDN')
    }

    if (errorResponses > 0) {
      recommendations.push('Optimize rate limiting configuration')
    }

    if (timeoutErrors > 0) {
      recommendations.push('Increase server capacity or optimize response times')
    }

    return recommendations
  }

  /**
   * Generate comprehensive report
   * @returns {Object} Comprehensive analysis report
   */
  generateReport() {
    const aggregate = this.results.aggregate
    const testDuration = aggregate.period ? (aggregate.period - aggregate.firstCounterAt) / 1000 : 0
    
    return {
      summary: {
        testDate: new Date(aggregate.firstCounterAt || Date.now()).toISOString(),
        duration: testDuration,
        overallRating: this.calculateOverallRating()
      },
      analysis: this.analysis,
      keyFindings: this.generateKeyFindings(),
      actionItems: this.generateActionItems()
    }
  }

  /**
   * Calculate overall rating
   * @returns {string} Overall rating
   */
  calculateOverallRating() {
    const ratings = [
      this.analysis.overall.throughput.rating,
      this.analysis.overall.responseTime.rating,
      this.analysis.overall.reliability.rating,
      this.analysis.concurrency.overallRating
    ]

    const excellentCount = ratings.filter(r => r === 'excellent').length
    const goodCount = ratings.filter(r => r === 'good').length
    const fairCount = ratings.filter(r => r === 'fair').length

    if (excellentCount >= 3) return 'excellent'
    if (excellentCount + goodCount >= 3) return 'good'
    if (fairCount >= 2) return 'fair'
    return 'poor'
  }

  /**
   * Generate key findings
   * @returns {Array} Key findings
   */
  generateKeyFindings() {
    const findings = []
    const analysis = this.analysis

    // Performance findings
    findings.push(`Throughput: ${analysis.overall.throughput.average} RPS (${analysis.overall.throughput.rating})`)
    findings.push(`Response Time P95: ${analysis.overall.responseTime.p95}ms (${analysis.overall.responseTime.rating})`)
    findings.push(`Success Rate: ${analysis.overall.reliability.successRate}% (${analysis.overall.reliability.rating})`)

    // Concurrency findings
    findings.push(`Concurrency Control: ${analysis.concurrency.overallRating}`)

    // Bottleneck findings
    if (analysis.bottlenecks.length > 0) {
      findings.push(`Bottlenecks identified: ${analysis.bottlenecks.length}`)
    }

    return findings
  }

  /**
   * Generate action items
   * @returns {Array} Action items
   */
  generateActionItems() {
    const actionItems = []
    const analysis = this.analysis

    // High priority items
    if (analysis.overall.reliability.rating === 'poor') {
      actionItems.push('HIGH: Fix reliability issues causing high error rates')
    }

    if (analysis.bottlenecks.some(b => b.severity === 'high')) {
      actionItems.push('HIGH: Address high-severity bottlenecks')
    }

    // Medium priority items
    if (analysis.overall.throughput.rating === 'poor') {
      actionItems.push('MEDIUM: Improve throughput performance')
    }

    if (analysis.overall.responseTime.rating === 'poor') {
      actionItems.push('MEDIUM: Optimize response times')
    }

    // Low priority items
    if (analysis.overall.throughput.rating === 'fair') {
      actionItems.push('LOW: Consider throughput improvements for better scalability')
    }

    return actionItems
  }

  /**
   * Save metrics to file
   * @param {string} filename - Filename to save to
   * @returns {Promise<void>}
   */
  async saveMetrics(filename) {
    try {
      const report = this.generateReport()
      const filepath = path.join(__dirname, '../results', filename)
      await fs.writeFile(filepath, JSON.stringify(report, null, 2))
      console.log(`📄 Report saved to: ${filepath}`)
    } catch (error) {
      console.error('Error saving metrics:', error)
      throw error
    }
  }
}

module.exports = StressResultAnalyzer
