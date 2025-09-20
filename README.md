# MinCommerce - High-Throughput Flash Sale System

A scalable flash sale platform designed to handle millions of concurrent requests with robust inventory management and real-time updates.

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React SPA     │    │   Nginx LB       │    │   Express API   │
│   (Frontend)    │───▶│   (Load Balancer)│───▶│   (Clustered)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                       ┌──────────────────┐             │
                       │   Redis Cache    │◀────────────┤
                       │   + Bull Queue   │             │
                       └──────────────────┘             │
                                                        │
                       ┌──────────────────┐             │
                       │   PostgreSQL     │◀────────────┘
                       │   (Primary DB)   │
                       └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)

### 1. Clone and Setup
```bash
git clone <your-repo>
cd mincommerce
```

### 2. Start Services
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- Redis cache on port 6379
- Express.js API on port 3001
- React frontend on port 3000
- Nginx load balancer on port 80

### 3. Run Database Migrations
```bash
cd mincommerce-rest
npm install
npm run migrate
npm run seed
```

### 4. Access the Application
- Frontend: http://localhost:3000
- API: http://localhost:3001/api
- Health Check: http://localhost:3001/api/health

## 📊 API Endpoints

### Flash Sale
- `GET /api/flash-sale/status` - Get current sale status
- `GET /api/flash-sale/stats` - Get sale statistics

### Purchase
- `POST /api/purchase/attempt` - Attempt to purchase an item
- `GET /api/purchase/status` - Check purchase status
- `GET /api/purchase/user/:userId` - Get user's orders

### Health
- `GET /api/health` - System health check
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe

## 🔧 Development

### Local Development
```bash
# Start infrastructure only
docker-compose up postgres redis -d

# Run API locally
cd mincommerce-rest
npm install
npm run dev

# Run frontend locally
cd mincommerce-app
npm install
npm start
```

### Testing
```bash
# Run tests
cd mincommerce-rest
npm test

# Run stress tests
npm run test:stress
```

## 🏛️ Database Schema

### Core Tables
- **users** - User information
- **products** - Product details (read-heavy)
- **stocks** - Inventory management (write-heavy)
- **flash_sales** - Sale configuration
- **orders** - Purchase records
- **purchase_attempts** - Rate limiting

### Key Design Decisions
1. **Separated Products and Stocks** - Better locking granularity
2. **PostgreSQL Advisory Locks** - Atomic inventory operations
3. **Redis Caching** - Fast access to frequently accessed data
4. **Bull Queue** - Async purchase processing
5. **WebSocket Support** - Real-time updates

## 🚀 Scalability Features

- **Clustering** - Utilizes all CPU cores
- **Connection Pooling** - Efficient database connections
- **Rate Limiting** - Prevents abuse
- **Caching Strategy** - Redis for performance
- **Queue Processing** - Handles traffic spikes
- **Health Checks** - Monitoring and reliability

## 🧪 Stress Testing

The system includes comprehensive stress testing to simulate high-traffic scenarios:

```bash
npm run test:stress
```

Tests include:
- 10K concurrent users (moderate load)
- 100K+ concurrent users (high load)
- Different traffic patterns and scenarios

## 🔒 Security Features

- **Helmet.js** - Security headers
- **Rate Limiting** - Request throttling
- **Input Validation** - Joi schema validation
- **SQL Injection Protection** - Knex.js ORM
- **CORS Configuration** - Cross-origin protection

## 📈 Monitoring

- **Winston Logging** - Structured logging
- **Health Endpoints** - System monitoring
- **Error Tracking** - Comprehensive error handling
- **Performance Metrics** - Built-in monitoring

## 🏗️ Architectural Decisions

### Why We Didn't Implement Event-Driven Architecture & CQRS

#### **Event-Driven Architecture**

**Why we didn't implement it:**

**Complexity vs. Requirements:**
- **Flash Sale is a simple domain** - Single product, limited time window
- **Event-driven adds complexity** without clear benefits for this use case
- **Our current architecture already handles the core requirements** efficiently

**When Event-Driven Makes Sense:**
```javascript
// Event-driven would be beneficial for:
✅ Multiple microservices communicating
✅ Complex business workflows
✅ Audit trails and event sourcing
✅ Real-time analytics across services
```

**Our Current Approach is Better Because:**
- **Direct database operations** are faster for inventory management
- **PostgreSQL advisory locks** provide ACID guarantees
- **Simpler debugging** and monitoring
- **Lower latency** for purchase operations

#### **CQRS (Command Query Responsibility Segregation)**

**Why we didn't implement CQRS:**

**Single Database is Sufficient:**
- **Flash sale has simple read/write patterns**
- **No complex query requirements** that need separate read models
- **PostgreSQL handles both reads and writes efficiently**

**CQRS Adds Complexity:**
```javascript
// CQRS would require:
❌ Separate read/write databases
❌ Event sourcing infrastructure
❌ Event handlers and projections
❌ Complex data synchronization
```

**Our Repository Pattern is Better Because:**
- **Single source of truth** - easier to maintain
- **ACID transactions** - data consistency guaranteed
- **Simpler testing** - no event synchronization issues
- **Better performance** - no event processing overhead

#### **NestJS vs Express.js**

**Why We Chose Express.js:**

**1. Simplicity & Learning Curve:**
- **Easier to understand** for the demo
- **Less opinionated** - more flexibility
- **Familiar to most developers**

**2. Performance:**
- **Lower overhead** - no framework abstraction
- **Direct control** over request handling
- **Better for high-throughput scenarios**

**3. Migration Path:**
- **Easy to migrate to NestJS later** with our current architecture
- **Repository pattern** translates well to NestJS services
- **Clean separation** makes framework migration straightforward

**When to Use Each Pattern:**

**Event-Driven Architecture:**
```javascript
// Use when:
✅ Multiple microservices
✅ Complex business workflows
✅ Need audit trails
✅ Real-time analytics
✅ Integration with external systems

// Our flash sale: ❌ Single service, simple workflow
```

**CQRS Pattern:**
```javascript
// Use when:
✅ Complex read/write patterns
✅ Different scaling needs for reads vs writes
✅ Need event sourcing
✅ Complex reporting requirements

// Our flash sale: ❌ Simple read/write, single database sufficient
```

**NestJS Framework:**
```typescript
// Use when:
✅ Building microservices
✅ Need dependency injection
✅ Want built-in validation
✅ Planning event-driven architecture
✅ Team familiar with Angular patterns

// Our case: ⚖️ Express.js is simpler for demo, but NestJS would be better for production
```

## 🔄 Production Deployment

The system is designed for easy migration to cloud infrastructure:

- **Docker Containers** - Ready for Kubernetes
- **Environment Configuration** - 12-factor app compliance
- **Health Checks** - Container orchestration ready
- **Scalable Architecture** - Horizontal scaling support

## 📝 Environment Variables

Copy `mincommerce-rest/env.example` to `.env` and configure:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mincommerce
DB_USER=mincommerce_user
DB_PASSWORD=mincommerce_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=your-secret-key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
