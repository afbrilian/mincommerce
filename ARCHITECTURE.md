# MinCommerce Architecture Documentation

## 🏗️ System Architecture Overview

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

## 📁 Code Organization (Repository Pattern + Service Layer)

### **Layer Structure:**
```
src/
├── models/              # Data Transfer Objects (DTOs)
│   ├── User.js
│   ├── Product.js
│   ├── Stock.js
│   ├── FlashSale.js
│   └── Order.js
├── repositories/        # Database Access Layer (like DAOs)
│   ├── BaseRepository.js
│   ├── UserRepository.js
│   ├── ProductRepository.js
│   ├── StockRepository.js
│   ├── FlashSaleRepository.js
│   └── OrderRepository.js
├── services/           # Business Logic Layer (like Services)
│   ├── UserService.js
│   ├── FlashSaleService.js
│   └── PurchaseService.js
├── routes/             # HTTP Endpoints (like Controllers)
│   ├── health.js
│   ├── flashSale.js
│   └── purchase.js
├── middleware/         # Express Middleware
│   ├── errorHandler.js
│   └── notFound.js
├── config/            # Configuration
│   ├── database.js
│   ├── redis.js
│   └── queue.js
├── jobs/              # Background Jobs
│   └── processPurchase.js
└── utils/             # Utilities
    └── logger.js
```

## 🔄 Data Flow

### **Request Flow:**
```
HTTP Request → Route → Service → Repository → Database
                     ↓
                  Cache (Redis)
                     ↓
                  Queue (Bull)
```

### **Purchase Flow:**
```
1. User submits purchase request
2. Route validates input
3. Service checks business rules
4. Service adds job to queue
5. Queue worker processes purchase
6. Repository handles database operations
7. Cache is updated
8. Response sent to user
```

## 🗄️ Database Schema

### **Tables:**
- **users** - User information
- **products** - Product details (read-heavy)
- **stocks** - Inventory management (write-heavy) 
- **flash_sales** - Sale configuration
- **orders** - Purchase records
- **purchase_attempts** - Rate limiting

### **Key Design Decisions:**
1. **Separated Products and Stocks** - Better locking granularity
2. **UUID Primary Keys** - Better for distributed systems
3. **Proper Indexes** - Optimized for common queries
4. **Constraints** - Data integrity at database level

## 🚀 Scalability Features

### **Concurrency Control:**
- **PostgreSQL Advisory Locks** - Atomic inventory operations
- **Optimistic Locking** - High performance for reads
- **Queue Processing** - Handles traffic spikes

### **Caching Strategy:**
- **Redis** - Fast access to frequently accessed data
- **Multi-layer Caching** - Sale status, user orders, stock info
- **Cache Invalidation** - Automatic updates on data changes

### **Performance Optimizations:**
- **Connection Pooling** - Efficient database connections
- **Clustering** - Multi-process Node.js
- **Rate Limiting** - Prevents abuse
- **Background Jobs** - Non-blocking operations

## 🔧 Technology Stack

### **Backend:**
- **Node.js** with Express.js
- **PostgreSQL** with Knex.js ORM
- **Redis** for caching and queues
- **Bull** for background job processing
- **Socket.io** for real-time updates

### **Development Tools:**
- **ESLint** - Code quality
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **Docker** - Containerization

### **Infrastructure:**
- **Docker Compose** - Local development
- **Nginx** - Load balancing
- **Health Checks** - Monitoring

## 📊 API Endpoints

### **Flash Sale:**
- `GET /api/flash-sale/status` - Get current sale status
- `GET /api/flash-sale/stats` - Get sale statistics

### **Purchase:**
- `POST /api/purchase/attempt` - Attempt to purchase
- `GET /api/purchase/status` - Check purchase status
- `GET /api/purchase/user/:userId` - Get user's orders

### **Health:**
- `GET /api/health` - System health check
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe

## 🔒 Security Features

- **Helmet.js** - Security headers
- **Rate Limiting** - Request throttling
- **Input Validation** - Joi schema validation
- **SQL Injection Protection** - Knex.js ORM
- **CORS Configuration** - Cross-origin protection

## 🧪 Testing Strategy

- **Unit Tests** - Individual components
- **Integration Tests** - API endpoints
- **Stress Tests** - High load scenarios
- **Database Tests** - Data integrity

## 📈 Monitoring & Logging

- **Winston** - Structured logging
- **Health Endpoints** - System monitoring
- **Error Tracking** - Comprehensive error handling
- **Performance Metrics** - Built-in monitoring

## 🔄 Deployment Ready

The system is designed for easy migration to cloud infrastructure:
- **Docker Containers** - Ready for Kubernetes
- **Environment Configuration** - 12-factor app compliance
- **Health Checks** - Container orchestration ready
- **Horizontal Scaling** - Load balancer ready
