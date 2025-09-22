# 🚀 Stress Testing Suite

Comprehensive stress testing infrastructure for the MinCommerce Flash Sale system, designed to validate system performance under extreme load conditions.

## 📋 Overview

This stress testing suite implements **4 core scenarios** to validate the system's ability to handle:
- **10K+ concurrent users**
- **1K+ concurrent purchases**
- **100K+ API requests**
- **Database stress testing**

## 🎯 Test Scenarios

### 1. **10K Concurrent Users Test** (`10k-users.yml`)
- **Purpose**: Validate system scalability with 10,000 concurrent users
- **Load**: 1,000 RPS peak, 800 RPS sustained
- **Duration**: 7 minutes total
- **Expected**: < 2s P95 response time, < 1% error rate

### 2. **1K Concurrent Purchases Test** (`1k-purchases.yml`)
- **Purpose**: Test race condition handling with 1,000 concurrent purchase attempts
- **Load**: 1,000 RPS peak, 500 RPS sustained
- **Duration**: 3.5 minutes total
- **Expected**: Only 1 successful purchase (stock = 1), 999 failures

### 3. **100K Requests Throughput Test** (`100k-requests.yml`)
- **Purpose**: Validate high-throughput API performance
- **Load**: 1,000 RPS peak, 800 RPS sustained
- **Duration**: 6 minutes total
- **Expected**: > 800 RPS throughput, < 2% error rate

### 4. **Database Stress Test** (`database-stress.yml`)
- **Purpose**: Test database connection pool limits and query performance
- **Load**: 500 RPS peak, 400 RPS sustained
- **Duration**: 4.5 minutes total
- **Expected**: < 5s P95 response time, < 10% error rate


## 🛠️ Usage

### Prerequisites
```bash
# Ensure Artillery is installed
npm install

# Ensure test database is set up
NODE_ENV=test npm run migrate
NODE_ENV=test npm run seed
```

### Quick Start
```bash
# Setup stress test data
npm run stress:setup

# Run all stress tests
npm run stress:run

# Generate reports
npm run stress:report --all
```

### Individual Test Execution
```bash
# Run specific stress tests
npm run stress:10k-users
npm run stress:1k-purchases
npm run stress:100k-requests
npm run stress:database
```

### Enhanced Jest Load Tests
```bash
# Run enhanced Jest load tests (1000+ concurrent users)
npm run test:enhanced-load
```

## 📊 Performance Benchmarks

### Expected Performance Targets
- **Throughput**: > 100 RPS average, > 500 RPS peak
- **Response Time**: < 2s P95, < 5s P99
- **Success Rate**: > 95% overall, > 99% for core operations
- **Concurrency Control**: 100% effective (no overselling)
- **System Stability**: < 5% error rate under normal load

### Concurrency Control Validation
- **Stock Consistency**: Only available stock can be purchased
- **User Limits**: One purchase per user enforced
- **Race Conditions**: Handled gracefully with proper locking
- **Overselling Prevention**: 100% effective under all load conditions

## 📈 Monitoring & Metrics

### Real-time Metrics
- **Response Time**: P50, P95, P99 percentiles
- **Throughput**: Requests per second (RPS)
- **Error Rate**: Success/failure percentages
- **Resource Usage**: CPU, Memory, Database connections
- **Queue Metrics**: Job processing rates and backlogs

### Performance Analysis
- **Bottleneck Identification**: Automatic detection of performance bottlenecks
- **Scalability Assessment**: User capacity estimation
- **Reliability Analysis**: Fault tolerance evaluation
- **Concurrency Control Validation**: Race condition detection

## 🔧 Configuration

### Artillery Configuration
Each test scenario is configured in YAML files with:
- **Load Phases**: Warm-up, ramp-up, peak, sustained, cool-down
- **Arrival Rates**: Users per second at each phase
- **Scenarios**: Different user behavior patterns
- **Assertions**: Performance thresholds and error rate limits

### Test Data Generation
- **Users**: 1,000-10,000 test users generated automatically
- **Products**: Multiple products with configurable stock levels
- **Flash Sales**: Active flash sales with realistic time windows
- **Race Conditions**: Limited stock scenarios for concurrency testing

## 📄 Reports & Analysis

### Comprehensive Reports
- **Performance Summary**: Overall system performance metrics
- **Bottleneck Analysis**: Identified performance bottlenecks
- **Scalability Assessment**: System capacity and scaling recommendations
- **Reliability Analysis**: Error rates and fault tolerance
- **Concurrency Control Validation**: Race condition and overselling analysis

### Action Items
- **High Priority**: Critical issues requiring immediate attention
- **Medium Priority**: Performance optimizations
- **Low Priority**: Future improvements and enhancements

## 🚨 Troubleshooting

### Common Issues
1. **Database Connection Limits**: Increase connection pool size
2. **Memory Exhaustion**: Optimize memory usage or increase allocation
3. **Redis Performance**: Check Redis configuration and memory limits
4. **Queue Backlog**: Increase queue processing capacity
5. **Network Timeouts**: Adjust timeout configurations

### Performance Tuning
1. **Database Optimization**: Index optimization, query tuning
2. **Caching Strategy**: Redis cache optimization
3. **Connection Pooling**: Database and Redis connection optimization
4. **Queue Processing**: Bull queue configuration tuning
5. **Resource Allocation**: CPU and memory scaling

## 📚 Additional Resources

- **Artillery Documentation**: https://artillery.io/docs/
- **Performance Testing Best Practices**: https://artillery.io/docs/guides/
- **Load Testing Strategies**: https://artillery.io/docs/guides/load-testing.html

## 🎯 Success Criteria

A successful stress test run should demonstrate:
- ✅ **System handles 10K+ concurrent users**
- ✅ **Concurrency controls prevent overselling**
- ✅ **Performance meets or exceeds benchmarks**
- ✅ **System recovers gracefully from overload**
- ✅ **No data corruption or consistency issues**
- ✅ **Error rates remain within acceptable limits**

---

**Note**: These stress tests are designed to validate system performance under extreme conditions. Always run them in a controlled environment and monitor system resources closely.
