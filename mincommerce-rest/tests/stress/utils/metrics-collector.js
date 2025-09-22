/**
 * Metrics Collector for Stress Testing
 * Collects and analyzes performance metrics during stress tests
 */

const fs = require('fs').promises
const path = require('path')

class StressMetricsCollector {
  constructor() {
    this.metrics = {
      startTime: null,
      endTime: null,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errorRates: {},
      throughput: [],
      memoryUsage: [],
      cpuUsage: [],
      databaseConnections: [],
      redisConnections: [],
      queueStats: []
    }
    this.isCollecting = false
  }

  /**
   * Start collecting metrics
   */
  startCollection() {
    this.metrics.startTime = Date.now()
    this.isCollecting = true
    console.log('Started metrics collection')
  }

  /**
   * Stop collecting metrics
   */
  stopCollection() {
    this.metrics.endTime = Date.now()
    this.isCollecting = false
    console.log('Stopped metrics collection')
  }

  /**
   * Record a request metric
   * @param {Object} requestData - Request data
   */
  recordRequest(requestData) {
    if (!this.isCollecting) return

    this.metrics.totalRequests++
    
    if (requestData.success) {
      this.metrics.successfulRequests++
    } else {
      this.metrics.failedRequests++
      
      // Track error rates by type
      const errorType = requestData.errorType || 'unknown'
      this.metrics.errorRates[errorType] = (this.metrics.errorRates[errorType] || 0) + 1
    }
    
    // Record response time
    if (requestData.responseTime) {
      this.metrics.responseTimes.push(requestData.responseTime)
    }
  }

  /**
   * Record throughput metric
   * @param {number} requestsPerSecond - Requests per second
   */
  recordThroughput(requestsPerSecond) {
    if (!this.isCollecting) return
    
    this.metrics.throughput.push({
      timestamp: Date.now(),
      rps: requestsPerSecond
    })
  }

  /**
   * Record system resource usage
   * @param {Object} resourceData - Resource usage data
   */
  recordResourceUsage(resourceData) {
    if (!this.isCollecting) return
    
    const timestamp = Date.now()
    
    if (resourceData.memory) {
      this.metrics.memoryUsage.push({
        timestamp,
        ...resourceData.memory
      })
    }
    
    if (resourceData.cpu) {
      this.metrics.cpuUsage.push({
        timestamp,
        ...resourceData.cpu
      })
    }
    
    if (resourceData.databaseConnections) {
      this.metrics.databaseConnections.push({
        timestamp,
        connections: resourceData.databaseConnections
      })
    }
    
    if (resourceData.redisConnections) {
      this.metrics.redisConnections.push({
        timestamp,
        connections: resourceData.redisConnections
      })
    }
  }

  /**
   * Record queue statistics
   * @param {Object} queueData - Queue statistics
   */
  recordQueueStats(queueData) {
    if (!this.isCollecting) return
    
    this.metrics.queueStats.push({
      timestamp: Date.now(),
      ...queueData
    })
  }

  /**
   * Calculate performance statistics
   * @returns {Object} Performance statistics
   */
  calculateStats() {
    const duration = this.metrics.endTime - this.metrics.startTime
    const durationSeconds = duration / 1000
    
    // Handle edge cases
    if (durationSeconds <= 0 || this.metrics.totalRequests === 0) {
      return {
        duration: { total: duration, seconds: durationSeconds },
        requests: { total: 0, successful: 0, failed: 0, errorRate: 0 },
        responseTime: { average: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0 },
        throughput: { average: 0, peak: 0 },
        resources: { memory: 0, cpu: 0, databaseConnections: 0, redisConnections: 0 },
        errorRates: {}
      }
    }
    
    // Calculate response time statistics
    const responseTimes = this.metrics.responseTimes.length > 0 
      ? this.metrics.responseTimes.sort((a, b) => a - b)
      : [0]
    
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0
    
    const p50ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.5)] || 0
    const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0
    const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0
    
    // Calculate throughput
    const avgThroughput = this.metrics.totalRequests / durationSeconds
    
    // Calculate error rate
    const errorRate = this.metrics.totalRequests > 0 
      ? (this.metrics.failedRequests / this.metrics.totalRequests) * 100
      : 0
    
    // Calculate resource usage averages
    const avgMemoryUsage = this.calculateAverageResourceUsage(this.metrics.memoryUsage)
    const avgCpuUsage = this.calculateAverageResourceUsage(this.metrics.cpuUsage)
    const avgDatabaseConnections = this.calculateAverageResourceUsage(this.metrics.databaseConnections)
    const avgRedisConnections = this.calculateAverageResourceUsage(this.metrics.redisConnections)
    
    return {
      duration: {
        total: duration,
        seconds: durationSeconds
      },
      requests: {
        total: this.metrics.totalRequests,
        successful: this.metrics.successfulRequests,
        failed: this.metrics.failedRequests,
        errorRate: errorRate
      },
      responseTime: {
        average: avgResponseTime,
        p50: p50ResponseTime,
        p95: p95ResponseTime,
        p99: p99ResponseTime,
        min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
        max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0
      },
      throughput: {
        average: avgThroughput,
        peak: this.metrics.throughput.length > 0 
          ? Math.max(...this.metrics.throughput.map(t => t.rps))
          : avgThroughput
      },
      resources: {
        memory: avgMemoryUsage,
        cpu: avgCpuUsage,
        databaseConnections: avgDatabaseConnections,
        redisConnections: avgRedisConnections
      },
      errorRates: this.metrics.errorRates
    }
  }

  /**
   * Calculate average resource usage
   * @param {Array} resourceData - Resource usage data
   * @returns {number} Average usage
   */
  calculateAverageResourceUsage(resourceData) {
    if (resourceData.length === 0) return 0
    
    const total = resourceData.reduce((sum, data) => {
      const value = data.connections || data.usage || data.used || 0
      return sum + value
    }, 0)
    
    return total / resourceData.length
  }

  /**
   * Generate performance report
   * @returns {Object} Performance report
   */
  generateReport() {
    const stats = this.calculateStats()
    
    const report = {
      testInfo: {
        startTime: new Date(this.metrics.startTime).toISOString(),
        endTime: new Date(this.metrics.endTime).toISOString(),
        duration: stats.duration.seconds
      },
      performance: {
        throughput: {
          average: Math.round(stats.throughput.average * 100) / 100,
          peak: stats.throughput.peak
        },
        responseTime: {
          average: Math.round(stats.responseTime.average),
          p50: Math.round(stats.responseTime.p50),
          p95: Math.round(stats.responseTime.p95),
          p99: Math.round(stats.responseTime.p99)
        },
        reliability: {
          totalRequests: stats.requests.total,
          successRate: Math.round((100 - stats.requests.errorRate) * 100) / 100,
          errorRate: Math.round(stats.requests.errorRate * 100) / 100
        }
      },
      resources: stats.resources,
      errors: stats.errorRates,
      recommendations: this.generateRecommendations(stats)
    }
    
    return report
  }

  /**
   * Generate performance recommendations
   * @param {Object} stats - Performance statistics
   * @returns {Array} Recommendations
   */
  generateRecommendations(stats) {
    const recommendations = []
    
    // Response time recommendations
    if (stats.responseTime.p95 > 2000) {
      recommendations.push('P95 response time is high (>2s). Consider optimizing database queries or increasing server resources.')
    }
    
    if (stats.responseTime.p99 > 5000) {
      recommendations.push('P99 response time is very high (>5s). Consider implementing caching or load balancing.')
    }
    
    // Error rate recommendations
    if (stats.requests.errorRate > 5) {
      recommendations.push('Error rate is high (>5%). Investigate and fix underlying issues.')
    }
    
    // Throughput recommendations
    if (stats.throughput.average < 100) {
      recommendations.push('Throughput is low (<100 RPS). Consider horizontal scaling or performance optimization.')
    }
    
    // Resource recommendations
    if (stats.resources.memory > 80) {
      recommendations.push('Memory usage is high (>80%). Consider increasing memory or optimizing memory usage.')
    }
    
    if (stats.resources.cpu > 80) {
      recommendations.push('CPU usage is high (>80%). Consider increasing CPU resources or optimizing code.')
    }
    
    if (stats.resources.databaseConnections > 80) {
      recommendations.push('Database connection usage is high (>80%). Consider increasing connection pool size.')
    }
    
    return recommendations
  }

  /**
   * Save metrics to file
   * @param {string} filename - Filename to save to
   */
  async saveMetrics(filename) {
    const report = this.generateReport()
    const filepath = path.join(__dirname, '../results', filename)
    
    try {
      await fs.writeFile(filepath, JSON.stringify(report, null, 2))
      console.log(`Metrics saved to ${filepath}`)
    } catch (error) {
      console.error('Error saving metrics:', error)
    }
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      startTime: null,
      endTime: null,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errorRates: {},
      throughput: [],
      memoryUsage: [],
      cpuUsage: [],
      databaseConnections: [],
      redisConnections: [],
      queueStats: []
    }
    this.isCollecting = false
  }
}

module.exports = StressMetricsCollector
