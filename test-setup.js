#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing MinCommerce Setup...\n');

// Check if all required files exist
const requiredFiles = [
  'docker-compose.yml',
  'nginx.conf',
  'mincommerce-rest/package.json',
  'mincommerce-rest/Dockerfile',
  'mincommerce-rest/knexfile.js',
  'mincommerce-rest/src/server.js',
  'mincommerce-rest/src/config/database.js',
  'mincommerce-rest/src/config/redis.js',
  'mincommerce-rest/src/config/queue.js',
  'mincommerce-rest/src/database/migrations/001_create_users_table.js',
  'mincommerce-rest/src/database/migrations/002_create_products_table.js',
  'mincommerce-rest/src/database/migrations/003_create_stocks_table.js',
  'mincommerce-rest/src/database/migrations/004_create_flash_sales_table.js',
  'mincommerce-rest/src/database/migrations/005_create_orders_table.js',
  'mincommerce-rest/src/database/migrations/006_create_purchase_attempts_table.js',
  'mincommerce-rest/src/database/seeds/01_sample_data.js'
];

let allFilesExist = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

// Check Docker Compose syntax
console.log('\n🐳 Checking Docker Compose configuration:');
try {
  const dockerCompose = fs.readFileSync(path.join(__dirname, 'docker-compose.yml'), 'utf8');
  const hasPostgres = dockerCompose.includes('postgres:15-alpine');
  const hasRedis = dockerCompose.includes('redis:7-alpine');
  const hasApi = dockerCompose.includes('build:');
  
  console.log(`   ${hasPostgres ? '✅' : '❌'} PostgreSQL service configured`);
  console.log(`   ${hasRedis ? '✅' : '❌'} Redis service configured`);
  console.log(`   ${hasApi ? '✅' : '❌'} API service configured`);
  
  if (hasPostgres && hasRedis && hasApi) {
    console.log('   ✅ Docker Compose configuration looks good');
  } else {
    allFilesExist = false;
  }
} catch (error) {
  console.log('   ❌ Error reading docker-compose.yml');
  allFilesExist = false;
}

// Check package.json
console.log('\n📦 Checking package.json:');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'mincommerce-rest/package.json'), 'utf8'));
  const hasExpress = packageJson.dependencies && packageJson.dependencies.express;
  const hasKnex = packageJson.dependencies && packageJson.dependencies.knex;
  const hasRedis = packageJson.dependencies && packageJson.dependencies.redis;
  const hasBull = packageJson.dependencies && packageJson.dependencies.bull;
  
  console.log(`   ${hasExpress ? '✅' : '❌'} Express.js dependency`);
  console.log(`   ${hasKnex ? '✅' : '❌'} Knex.js dependency`);
  console.log(`   ${hasRedis ? '✅' : '❌'} Redis dependency`);
  console.log(`   ${hasBull ? '✅' : '❌'} Bull queue dependency`);
  
  if (hasExpress && hasKnex && hasRedis && hasBull) {
    console.log('   ✅ All required dependencies configured');
  } else {
    allFilesExist = false;
  }
} catch (error) {
  console.log('   ❌ Error reading package.json');
  allFilesExist = false;
}

// Check database migrations
console.log('\n🗄️  Checking database migrations:');
const migrationFiles = [
  '001_create_users_table.js',
  '002_create_products_table.js',
  '003_create_stocks_table.js',
  '004_create_flash_sales_table.js',
  '005_create_orders_table.js',
  '006_create_purchase_attempts_table.js'
];

let allMigrationsExist = true;
migrationFiles.forEach(migration => {
  const exists = fs.existsSync(path.join(__dirname, 'mincommerce-rest/src/database/migrations', migration));
  console.log(`   ${exists ? '✅' : '❌'} ${migration}`);
  if (!exists) allMigrationsExist = false;
});

// Summary
console.log('\n📊 Setup Summary:');
if (allFilesExist && allMigrationsExist) {
  console.log('   🎉 All files and configurations are in place!');
  console.log('\n🚀 Next steps:');
  console.log('   1. Start Docker Desktop');
  console.log('   2. Run: docker compose up -d');
  console.log('   3. Run: cd mincommerce-rest && npm install');
  console.log('   4. Run: npm run migrate && npm run seed');
  console.log('   5. Access: http://localhost:3000');
} else {
  console.log('   ⚠️  Some files or configurations are missing');
  console.log('   Please check the errors above and fix them');
}

console.log('\n✨ Setup test completed!');
