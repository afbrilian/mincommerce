#!/usr/bin/env node

/**
 * Queue Manager Script
 * Utility script for managing the Bull queue and Redis cache
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function execCommand(command, description) {
  try {
    log(`\n${colors.cyan}${description}...${colors.reset}`)
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' })
    if (result.trim()) {
      console.log(result)
    }
    log(`${colors.green}✓ ${description} completed${colors.reset}`)
    return result
  } catch (error) {
    log(`${colors.red}✗ ${description} failed: ${error.message}${colors.reset}`)
    throw error
  }
}

function clearQueue() {
  log(`${colors.bright}${colors.blue}🧹 Clearing Queue and Cache...${colors.reset}`)

  try {
    // Clear Bull queue data
    execCommand('redis-cli keys "bull:*" | xargs redis-cli del', 'Clearing Bull queue data')

    // Clear purchase job cache
    execCommand(
      'redis-cli keys "purchase_job:*" | xargs redis-cli del',
      'Clearing purchase job cache'
    )

    // Clear purchase status cache
    execCommand(
      'redis-cli keys "purchase_status:*" | xargs redis-cli del',
      'Clearing purchase status cache'
    )

    // Clear purchase metrics
    execCommand('redis-cli keys "purchase_*" | xargs redis-cli del', 'Clearing purchase metrics')

    // Clear user order cache
    execCommand('redis-cli keys "user_order:*" | xargs redis-cli del', 'Clearing user order cache')

    log(`${colors.green}${colors.bright}✅ Queue and cache cleared successfully!${colors.reset}`)
  } catch (error) {
    log(`${colors.red}${colors.bright}❌ Failed to clear queue: ${error.message}${colors.reset}`)
    process.exit(1)
  }
}

function showStats() {
  log(`${colors.bright}${colors.blue}📊 Queue Statistics...${colors.reset}`)

  try {
    const stats = execCommand(
      'curl -s http://localhost:3001/queue/stats | jq ".data.queue"',
      'Fetching queue statistics'
    )

    if (stats.trim()) {
      console.log(stats)
    }
  } catch (error) {
    log(`${colors.yellow}⚠️  Could not fetch stats (server might not be running)${colors.reset}`)
  }
}

function showRedisKeys() {
  log(`${colors.bright}${colors.blue}🔍 Redis Keys...${colors.reset}`)

  try {
    execCommand('redis-cli keys "*" | head -20', 'Showing Redis keys (first 20)')
  } catch (error) {
    log(`${colors.yellow}⚠️  Could not fetch Redis keys${colors.reset}`)
  }
}

function showHelp() {
  log(`${colors.bright}${colors.cyan}Queue Manager - Available Commands:${colors.reset}`)
  log(`${colors.green}  clear${colors.reset}     - Clear all queue data and cache`)
  log(`${colors.green}  stats${colors.reset}     - Show queue statistics`)
  log(`${colors.green}  keys${colors.reset}      - Show Redis keys`)
  log(`${colors.green}  reset${colors.reset}     - Clear queue and show stats`)
  log(`${colors.green}  help${colors.reset}      - Show this help message`)
  log(`\n${colors.yellow}Usage:${colors.reset}`)
  log(`  npm run queue:clear`)
  log(`  npm run queue:stats`)
  log(`  node scripts/queue-manager.js clear`)
  log(`  node scripts/queue-manager.js stats`)
}

// Main execution
const command = process.argv[2]

switch (command) {
  case 'clear':
    clearQueue()
    break
  case 'stats':
    showStats()
    break
  case 'keys':
    showRedisKeys()
    break
  case 'reset':
    clearQueue()
    showStats()
    break
  case 'help':
  case '--help':
  case '-h':
    showHelp()
    break
  default:
    if (command) {
      log(`${colors.red}Unknown command: ${command}${colors.reset}`)
    }
    showHelp()
    break
}
