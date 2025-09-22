#!/usr/bin/env node

/**
 * Generate Report Script
 * Analyzes stress test results and generates detailed reports
 */

const fs = require('fs').promises
const path = require('path')
const StressResultAnalyzer = require('../utils/result-analyzer')

class ReportGenerator {
  constructor() {
    this.resultsDir = path.join(__dirname, '../results')
  }

  /**
   * Generate report from results file
   * @param {string} resultsFile - Results filename
   */
  async generateReport(resultsFile) {
    console.log(`📊 Generating report from ${resultsFile}...`)

    try {
      // Load results
      const analyzer = new StressResultAnalyzer()
      await analyzer.loadResults(resultsFile)

      // Analyze results
      const analysis = analyzer.analyze()

      // Generate report
      const report = analyzer.generateReport()

      // Save report
      const reportFilename = resultsFile.replace('.json', '-analysis.json')
      await analyzer.saveMetrics(reportFilename)

      // Display report
      this.displayReport(report)

      console.log(`\n📄 Detailed report saved to: ${reportFilename}`)
    } catch (error) {
      console.error('❌ Error generating report:', error)
      process.exit(1)
    }
  }

  /**
   * Generate report from all results files
   */
  async generateAllReports() {
    console.log('📊 Generating reports from all results files...')

    try {
      const files = await fs.readdir(this.resultsDir)

      // Look for both individual result files and comprehensive reports
      const individualResultsFiles = files.filter(file => file.endsWith('-results.json'))
      const comprehensiveReports = files.filter(
        file => file.startsWith('comprehensive-stress-report-') && file.endsWith('.json')
      )

      if (individualResultsFiles.length === 0 && comprehensiveReports.length === 0) {
        console.log('⚠️  No results files found')
        return
      }

      // Process individual result files first
      if (individualResultsFiles.length > 0) {
        console.log(`Found ${individualResultsFiles.length} individual result files`)
        for (const file of individualResultsFiles) {
          console.log(`\n📄 Processing ${file}...`)
          await this.generateReport(file)
        }
      }

      // Process comprehensive reports
      if (comprehensiveReports.length > 0) {
        console.log(`\nFound ${comprehensiveReports.length} comprehensive report(s)`)
        for (const file of comprehensiveReports) {
          console.log(`\n📄 Processing comprehensive report: ${file}...`)
          await this.generateComprehensiveReport(file)
        }
      }

      console.log('\n✅ All reports generated successfully!')
    } catch (error) {
      console.error('❌ Error generating reports:', error)
      process.exit(1)
    }
  }

  /**
   * Generate report from comprehensive report file
   * @param {string} filename - Comprehensive report filename
   */
  async generateComprehensiveReport(filename) {
    console.log(`📊 Generating report from comprehensive report: ${filename}...`)

    try {
      const filepath = path.join(this.resultsDir, filename)
      const data = await fs.readFile(filepath, 'utf8')
      const comprehensiveData = JSON.parse(data)

      // Display comprehensive report summary
      this.displayComprehensiveReport(comprehensiveData)

      console.log(`\n📄 Comprehensive report processed: ${filename}`)
    } catch (error) {
      console.error('❌ Error processing comprehensive report:', error)
      throw error
    }
  }

  /**
   * Display comprehensive report
   * @param {Object} data - Comprehensive report data
   */
  displayComprehensiveReport(data) {
    console.log('\n' + '='.repeat(80))
    console.log('📊 COMPREHENSIVE STRESS TEST REPORT')
    console.log('='.repeat(80))

    // Metadata
    if (data.metadata) {
      console.log(`\n📅 Test Run ID: ${data.metadata.testRunId}`)
      console.log(`⏱️  Start Time: ${data.metadata.startTime}`)
      console.log(`⏱️  End Time: ${data.metadata.endTime}`)
      console.log(`⏱️  Total Duration: ${Math.round(data.metadata.totalDuration / 1000)}s`)
      console.log(`📊 Tests Run: ${data.metadata.completedTests}/${data.metadata.totalTests}`)
      console.log(
        `✅ Success Rate: ${data.metadata.completedTests === data.metadata.totalTests ? '100%' : 'Partial'}`
      )
    }

    // Summary
    if (data.summary) {
      console.log(`\n🚀 Performance Summary:`)
      if (data.summary.performance) {
        console.log(`   Average Throughput: ${data.summary.performance.averageThroughput} RPS`)
        console.log(`   Max Throughput: ${data.summary.performance.maxThroughput} RPS`)
        console.log(`   Average Response Time: ${data.summary.performance.averageResponseTime}ms`)
        console.log(`   Max Response Time: ${data.summary.performance.maxResponseTime}ms`)
        console.log(
          `   Average Success Rate: ${(data.summary.performance.averageSuccessRate * 100).toFixed(2)}%`
        )
        console.log(
          `   Min Success Rate: ${(data.summary.performance.minSuccessRate * 100).toFixed(2)}%`
        )
      }
    }

    // Test Results
    if (data.summary && data.summary.testResults) {
      console.log(`\n📋 Individual Test Results:`)
      data.summary.testResults.forEach(test => {
        const status = test.status === 'completed' ? '✅' : '❌'
        console.log(`   ${status} ${test.name}: ${test.status}`)
        if (test.performance) {
          const throughput = test.performance.throughput?.average || 'N/A'
          const responseTime = test.performance.responseTime?.p95 || 'N/A'
          const successRate = test.performance.reliability?.successRate || 0
          console.log(`      Throughput: ${throughput} RPS`)
          console.log(`      Response Time P95: ${responseTime}ms`)
          console.log(`      Success Rate: ${(successRate * 100).toFixed(2)}%`)
        }
      })
    }

    // Key Findings
    if (data.keyFindings && data.keyFindings.length > 0) {
      console.log(`\n🔍 Key Findings:`)
      data.keyFindings.forEach(finding => {
        console.log(`   • ${finding}`)
      })
    }

    // Recommendations
    if (data.recommendations && data.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`)
      data.recommendations.forEach(recommendation => {
        console.log(`   • ${recommendation}`)
      })
    }

    console.log('\n' + '='.repeat(80))
  }

  /**
   * Display report
   * @param {Object} report - Generated report
   */
  displayReport(report) {
    console.log('\n' + '='.repeat(80))
    console.log('📊 STRESS TEST ANALYSIS REPORT')
    console.log('='.repeat(80))

    // Summary
    console.log(`\n📅 Test Date: ${report.summary.testDate}`)
    console.log(`⏱️  Duration: ${report.summary.duration}s`)
    console.log(`⭐ Overall Rating: ${report.summary.overallRating.toUpperCase()}`)

    // Performance
    console.log(`\n🚀 Performance Metrics:`)
    console.log(
      `   Throughput: ${report.analysis.overall.throughput.average} RPS (${report.analysis.overall.throughput.rating})`
    )
    console.log(
      `   Response Time P95: ${report.analysis.overall.responseTime.p95}ms (${report.analysis.overall.responseTime.rating})`
    )
    console.log(
      `   Success Rate: ${report.analysis.overall.reliability.successRate}% (${report.analysis.overall.reliability.rating})`
    )

    // Scalability
    console.log(`\n📈 Scalability Analysis:`)
    console.log(
      `   Estimated User Capacity: ${report.analysis.scalability.currentCapacity.users} users`
    )
    console.log(
      `   Current Throughput: ${report.analysis.scalability.currentCapacity.requestsPerSecond} RPS`
    )
    console.log(`   Scalability Rating: ${report.analysis.scalability.currentCapacity.rating}`)

    // Reliability
    console.log(`\n🛡️  Reliability Analysis:`)
    console.log(`   Overall Success Rate: ${report.analysis.reliability.overall.successRate}%`)
    console.log(`   Error Rate: ${report.analysis.reliability.overall.errorRate}%`)
    console.log(`   Reliability Rating: ${report.analysis.reliability.overall.rating}`)

    // Concurrency Control
    console.log(`\n🔒 Concurrency Control:`)
    console.log(
      `   Race Conditions: ${report.analysis.concurrency.raceConditions.detected ? 'Detected' : 'Not Detected'}`
    )
    console.log(
      `   Stock Consistency: ${report.analysis.concurrency.stockConsistency.maintained ? 'Maintained' : 'Not Maintained'}`
    )
    console.log(
      `   User Limits: ${report.analysis.concurrency.userLimits.enforced ? 'Enforced' : 'Not Enforced'}`
    )
    console.log(`   Overall Rating: ${report.analysis.concurrency.overallRating}`)

    // Bottlenecks
    if (report.analysis.bottlenecks.length > 0) {
      console.log(`\n⚠️  Performance Bottlenecks:`)
      report.analysis.bottlenecks.forEach(bottleneck => {
        console.log(`   ${bottleneck.severity.toUpperCase()}: ${bottleneck.description}`)
        console.log(`     Value: ${bottleneck.value}, Threshold: ${bottleneck.threshold}`)
      })
    }

    // Key Findings
    console.log(`\n🔍 Key Findings:`)
    report.keyFindings.forEach(finding => {
      console.log(`   • ${finding}`)
    })

    // Action Items
    if (report.actionItems.length > 0) {
      console.log(`\n📋 Action Items:`)
      report.actionItems.forEach(item => {
        console.log(`   • ${item}`)
      })
    }

    // Recommendations
    if (report.analysis.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`)
      report.analysis.recommendations.forEach(recommendation => {
        console.log(`   • ${recommendation}`)
      })
    }

    console.log('\n' + '='.repeat(80))
  }

  /**
   * List available results files
   */
  async listResultsFiles() {
    try {
      const files = await fs.readdir(this.resultsDir)
      const individualResultsFiles = files.filter(file => file.endsWith('-results.json'))
      const comprehensiveReports = files.filter(
        file => file.startsWith('comprehensive-stress-report-') && file.endsWith('.json')
      )

      if (individualResultsFiles.length === 0 && comprehensiveReports.length === 0) {
        console.log('⚠️  No results files found')
        return
      }

      if (individualResultsFiles.length > 0) {
        console.log('📄 Available individual result files:')
        individualResultsFiles.forEach((file, index) => {
          console.log(`   ${index + 1}. ${file}`)
        })
      }

      if (comprehensiveReports.length > 0) {
        console.log('\n📄 Available comprehensive reports:')
        comprehensiveReports.forEach((file, index) => {
          console.log(`   ${index + 1}. ${file}`)
        })
      }
    } catch (error) {
      console.error('❌ Error listing results files:', error)
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const generator = new ReportGenerator()

  if (args.length === 0) {
    console.log('📊 Stress Test Report Generator')
    console.log('\nUsage:')
    console.log('  node generate-report.js <results-file>  - Generate report from specific file')
    console.log('  node generate-report.js --all           - Generate reports from all files')
    console.log('  node generate-report.js --list          - List available results files')
    return
  }

  if (args[0] === '--all') {
    await generator.generateAllReports()
  } else if (args[0] === '--list') {
    await generator.listResultsFiles()
  } else {
    await generator.generateReport(args[0])
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Report generator failed:', error)
    process.exit(1)
  })
}

module.exports = ReportGenerator
