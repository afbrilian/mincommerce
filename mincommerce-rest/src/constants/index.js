/**
 * Constants and Configuration
 * Centralized location for all hardcoded values and configuration
 */

module.exports = {
  // Response codes for purchase attempts
  RESPONSE_CODES: {
    SUCCESS: 'SUCCESS',
    ALREADY_PURCHASED: 'ALREADY_PURCHASED',
    SALE_NOT_ACTIVE: 'SALE_NOT_ACTIVE',
    OUT_OF_STOCK: 'OUT_OF_STOCK',
    SALE_OUTSIDE_TIME_WINDOW: 'SALE_OUTSIDE_TIME_WINDOW',
    TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
    INVALID_REQUEST: 'INVALID_REQUEST',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
    SALE_NOT_FOUND: 'SALE_NOT_FOUND'
  },

  // Flash sale statuses
  SALE_STATUS: {
    UPCOMING: 'upcoming',
    ACTIVE: 'active',
    ENDED: 'ended'
  },

  // Order statuses
  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    FAILED: 'failed'
  },

  // Purchase job statuses
  PURCHASE_JOB_STATUS: {
    QUEUED: 'queued',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
  },

  // Redis cache keys
  REDIS_KEYS: {
    USER_ORDER: (userId) => `user_order:${userId}`,
    ORDER: orderId => `order:${orderId}`,
    FLASH_SALE_STATUS: (saleId = null) =>
      saleId ? `flash_sale_status_${saleId}` : 'flash_sale_status',
    RATE_LIMIT: userId => `rate_limit:${userId}`,
    STOCK: productId => `stock:${productId}`,
    SALE_STATS: saleId => `sale_stats:${saleId}`,
    // Queue-based purchase system keys
    PURCHASE_JOB: jobId => `purchase_job:${jobId}`,
    PURCHASE_STATUS: userId => `purchase_status:${userId}`,
    PURCHASE_QUEUE: 'purchase_queue',
    PURCHASE_WORKER_STATUS: workerId => `purchase_worker:${workerId}`,
    PURCHASE_METRICS: 'purchase_metrics',
    PURCHASE_QUEUE_STATS: 'purchase_queue_stats'
  },

  // Cache TTL (Time To Live) in seconds
  CACHE_TTL: {
    FLASH_SALE_STATUS: 30, // 30 seconds - frequently changing
    USER_ORDER: 3600, // 1 hour - stable data
    ORDER_DETAILS: 3600, // 1 hour - stable data
    STOCK_INFO: 60, // 1 minute - moderately changing
    SALE_STATS: 300, // 5 minutes - aggregated data
    RATE_LIMIT: 60, // 1 minute - rate limiting window
    // Queue-based purchase system TTL
    PURCHASE_JOB: 3600, // 1 hour - job status tracking
    PURCHASE_STATUS: 1800, // 30 minutes - user purchase status
    PURCHASE_WORKER_STATUS: 300, // 5 minutes - worker health check
    PURCHASE_METRICS: 900, // 15 minutes - performance metrics
    PURCHASE_QUEUE_STATS: 60 // 1 minute - queue statistics
  },

  // Rate limiting configuration
  RATE_LIMITS: {
    MAX_ATTEMPTS_PER_MINUTE: 10,
    WINDOW_MS: 60000, // 1 minute in milliseconds
    MAX_REQUESTS_PER_WINDOW: 100, // Global rate limit
    WINDOW_DURATION_MS: 15 * 60 * 1000 // 15 minutes
  },

  // Database configuration
  DATABASE: {
    ADVISORY_LOCK_PREFIX: 'sale_',
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
    CONNECTION_TIMEOUT_MS: 30000,
    QUERY_TIMEOUT_MS: 10000
  },

  // Queue configuration
  QUEUE: {
    JOB_TYPES: {
      PURCHASE_PROCESSING: 'purchase-processing'
    },
    JOB_OPTIONS: {
      PRIORITY_HIGH: 1,
      PRIORITY_NORMAL: 5,
      PRIORITY_LOW: 10,
      MAX_ATTEMPTS: 3,
      BACKOFF_DELAY_MS: 2000,
      REMOVE_ON_COMPLETE: 100,
      REMOVE_ON_FAIL: 50
    },
    CONCURRENCY: {
      PURCHASE_WORKERS: 10, // Number of concurrent purchase workers
      MAX_JOBS_PER_WORKER: 100, // Max jobs per worker before scaling
      WORKER_TIMEOUT_MS: 30000 // 30 seconds timeout per job
    },
    PERFORMANCE: {
      BATCH_SIZE: 50, // Process jobs in batches
      PROCESSING_INTERVAL_MS: 1000, // 1 second processing interval
      METRICS_UPDATE_INTERVAL_MS: 5000 // 5 seconds metrics update
    }
  },

  // WebSocket events
  WEBSOCKET_EVENTS: {
    JOIN_SALE_ROOM: 'join-sale-room',
    LEAVE_SALE_ROOM: 'leave-sale-room',
    SALE_STATUS_UPDATE: 'sale-status-update',
    STOCK_UPDATE: 'stock-update',
    PURCHASE_RESULT: 'purchase-result'
  },

  // HTTP status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },

  // Error messages
  ERROR_MESSAGES: {
    MISSING_REQUIRED_FIELDS: 'Missing required fields',
    INVALID_EMAIL_FORMAT: 'Invalid email format',
    USER_ALREADY_EXISTS: 'User with this email already exists',
    USER_NOT_FOUND: 'User not found',
    PRODUCT_NOT_FOUND: 'Product not found',
    SALE_NOT_FOUND: 'Flash sale not found',
    NO_ACTIVE_SALE: 'No active flash sale found',
    SALE_NOT_ACTIVE: 'Flash sale is not currently active',
    OUT_OF_STOCK: 'Product is out of stock',
    ALREADY_PURCHASED: 'User has already purchased this item',
    TOO_MANY_ATTEMPTS: 'Too many purchase attempts. Please try again later.',
    DATABASE_CONNECTION_FAILED: 'Database connection failed',
    REDIS_CONNECTION_FAILED: 'Redis connection failed',
    QUEUE_INITIALIZATION_FAILED: 'Queue initialization failed',
    INVALID_REQUEST_DATA: 'Invalid request data',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded'
  },

  // Success messages
  SUCCESS_MESSAGES: {
    PURCHASE_QUEUED: 'Purchase request queued successfully',
    PURCHASE_SUCCESSFUL: 'Purchase completed successfully',
    PURCHASE_PROCESSING: 'Purchase is being processed',
    USER_CREATED: 'User created successfully',
    SALE_CREATED: 'Flash sale created successfully',
    SALE_UPDATED: 'Flash sale updated successfully',
    JOB_CREATED: 'Job created successfully',
    JOB_COMPLETED: 'Job completed successfully'
  },

  // Validation rules
  VALIDATION: {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    MIN_PASSWORD_LENGTH: 8,
    MAX_NAME_LENGTH: 255,
    MAX_DESCRIPTION_LENGTH: 1000,
    MAX_IMAGE_URL_LENGTH: 500
  },

  // Business rules
  BUSINESS_RULES: {
    MAX_ITEMS_PER_USER: 1,
    MIN_FLASH_SALE_DURATION_MINUTES: 1,
    MAX_FLASH_SALE_DURATION_HOURS: 24,
    MIN_STOCK_QUANTITY: 0,
    MAX_STOCK_QUANTITY: 1000000
  },

  // Monitoring and logging
  LOGGING: {
    LEVELS: {
      ERROR: 'error',
      WARN: 'warn',
      INFO: 'info',
      DEBUG: 'debug'
    },
    LOG_FORMATS: {
      JSON: 'json',
      SIMPLE: 'simple',
      COMBINED: 'combined'
    }
  },

  // Environment-specific configurations
  ENVIRONMENT: {
    DEVELOPMENT: 'development',
    TEST: 'test',
    STAGING: 'staging',
    PRODUCTION: 'production'
  }
}
