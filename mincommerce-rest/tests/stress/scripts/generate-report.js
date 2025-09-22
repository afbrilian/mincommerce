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
      const resultsFiles = files.filter(file => file.endsWith('-results.json'))
      
      if (resultsFiles.length === 0) {
        console.log('⚠️  No results files found')
        return
      }
      
      console.log(`Found ${resultsFiles.length} results files`)
      
      for (const file of resultsFiles) {
        console.log(`\n📄 Processing ${file}...`)
        await this.generateReport(file)
      }
      
      console.log('\n✅ All reports generated successfully!')
      
    } catch (error) {
      console.error('❌ Error generating reports:', error)
      process.exit(1)
    }
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
    console.log(`   Throughput: ${report.analysis.overall.throughput.average} RPS (${report.analysis.overall.throughput.rating})`)
    console.log(`   Response Time P95: ${report.analysis.overall.responseTime.p95}ms (${report.analysis.overall.responseTime.rating})`)
    console.log(`   Success Rate: ${report.analysis.overall.reliability.successRate}% (${report.analysis.overall.reliability.rating})`)
    
    // Scalability
    console.log(`\n📈 Scalability Analysis:`)
    console.log(`   Estimated User Capacity: ${report.analysis.scalability.currentCapacity.users} users`)
    console.log(`   Current Throughput: ${report.analysis.scalability.currentCapacity.requestsPerSecond} RPS`)
    console.log(`   Scalability Rating: ${report.analysis.scalability.currentCapacity.rating}`)
    
    // Reliability
    console.log(`\n🛡️  Reliability Analysis:`)
    console.log(`   Overall Success Rate: ${report.analysis.reliability.overall.successRate}%`)
    console.log(`   Error Rate: ${report.analysis.reliability.overall.errorRate}%`)
    console.log(`   Reliability Rating: ${report.analysis.reliability.overall.rating}`)
    
    // Concurrency Control
    console.log(`\n🔒 Concurrency Control:`)
    console.log(`   Race Conditions: ${report.analysis.concurrency.raceConditions.detected ? 'Detected' : 'Not Detected'}`)
    console.log(`   Stock Consistency: ${report.analysis.concurrency.stockConsistency.maintained ? 'Maintained' : 'Not Maintained'}`)
    console.log(`   User Limits: ${report.analysis.concurrency.userLimits.enforced ? 'Enforced' : 'Not Enforced'}`)
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
      const resultsFiles = files.filter(file => file.endsWith('-results.json'))
      
      if (resultsFiles.length === 0) {
        console.log('⚠️  No results files found')
        return
      }
      
      console.log('📄 Available results files:')
      resultsFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`)
      })
      
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
