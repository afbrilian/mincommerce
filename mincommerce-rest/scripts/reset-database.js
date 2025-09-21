#!/usr/bin/env node

/**
 * Database Reset Script
 * Resets the database to a clean state for testing
 */

const { execSync } = require('child_process')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

function resetDatabase() {
  log(`${colors.bright}${colors.blue}🔄 Resetting Database...${colors.reset}`)
  
  try {
    // Clear all orders
    execCommand(
      'PGPASSWORD=mincommerce_password psql -h localhost -U mincommerce_user -d mincommerce -c "DELETE FROM orders;"',
      'Clearing all orders'
    )
    
    // Reset stock to 1
    execCommand(
      'PGPASSWORD=mincommerce_password psql -h localhost -U mincommerce_user -d mincommerce -c "UPDATE stocks SET available_quantity = 1, total_quantity = 1;"',
      'Resetting stock to 1'
    )
    
    // Update flash sale to be active now
    const now = new Date()
    const startTime = new Date(now.getTime() - 60000).toISOString() // 1 minute ago
    const endTime = new Date(now.getTime() + 3600000).toISOString() // 1 hour from now
    
    execCommand(
      `PGPASSWORD=mincommerce_password psql -h localhost -U mincommerce_user -d mincommerce -c "UPDATE flash_sales SET start_time = '${startTime}', end_time = '${endTime}', status = 'active';"`,
      'Setting flash sale to active'
    )
    
    log(`${colors.green}${colors.bright}✅ Database reset successfully!${colors.reset}`)
    log(`${colors.yellow}Flash sale is now active with 1 item in stock${colors.reset}`)
  } catch (error) {
    log(`${colors.red}${colors.bright}❌ Failed to reset database: ${error.message}${colors.reset}`)
    process.exit(1)
  }
}

// Main execution
resetDatabase()
