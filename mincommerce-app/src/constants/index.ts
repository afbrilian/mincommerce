// Application Constants
export const APP_CONFIG = {
  name: 'MinCommerce',
  version: '1.0.0',
  description: 'High-performance flash sale system'
} as const

// API Configuration
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 10000,
  retryAttempts: 3
} as const

// Database IDs (seeded data)
export const SEEDED_IDS = {
  PRODUCT_ID: 'a7d6dc16-0f52-43e8-99b3-6c4b84681a0b',
  FLASH_SALE_ID: '9cf1eaeb-df76-475f-9eb6-38ae4339cb3c'
} as const

// Flash Sale Configuration
export const FLASH_SALE_CONFIG = {
  maxDuration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  minDuration: 5 * 60 * 1000, // 5 minutes in milliseconds
  defaultDuration: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
  maxQuantity: 10000,
  minQuantity: 1
} as const

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user'
} as const

// Flash Sale Status
export const FLASH_SALE_STATUS = {
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  ENDED: 'ended'
} as const

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled'
} as const

// Purchase Status
export const PURCHASE_STATUS = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  NOT_PURCHASED: 'not_purchased'
} as const

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    VERIFY: '/auth/verify',
    LOGOUT: '/auth/logout'
  },
  FLASH_SALE: {
    STATUS: '/flash-sale/status',
    PURCHASE: '/flash-sale/purchase',
    QUEUE_PURCHASE: '/flash-sale/queue-purchase',
    PURCHASE_STATUS: '/flash-sale/purchase-status'
  },
  ADMIN: {
    FLASH_SALE: '/admin/flash-sale',
    FLASH_SALE_DETAILS: (id: string) => `/admin/flash-sale/${id}`,
    FLASH_SALE_STATS: (id: string) => `/admin/flash-sale/${id}/stats`,
    QUEUE_STATS: '/admin/queue/stats',
    QUEUE_HEALTH: '/admin/queue/health'
  },
  HEALTH: '/health'
} as const

// WebSocket Events
export const WS_EVENTS = {
  FLASH_SALE_UPDATE: 'flash_sale_update',
  PURCHASE_UPDATE: 'purchase_update',
  QUEUE_UPDATE: 'queue_update'
} as const

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_STORAGE: 'auth-storage',
  THEME: 'theme',
  LANGUAGE: 'language'
} as const

// Validation Rules
export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MIN_PASSWORD_LENGTH: 8,
  MAX_EMAIL_LENGTH: 254,
  MAX_NAME_LENGTH: 100
} as const

// UI Constants
export const UI_CONFIG = {
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 5000,
  ANIMATION_DURATION: 200,
  PAGINATION_SIZE: 20
} as const

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.'
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  LOGOUT_SUCCESS: 'Logged out successfully!',
  FLASH_SALE_CREATED: 'Flash sale created successfully!',
  FLASH_SALE_UPDATED: 'Flash sale updated successfully!',
  PURCHASE_SUCCESS: 'Purchase completed successfully!',
  PURCHASE_QUEUED: 'Purchase request queued successfully!'
} as const

// Test IDs (for E2E testing)
export const TEST_IDS = {
  // Login Page
  LOGIN_FORM: 'login-form',
  EMAIL_INPUT: 'email-input',
  LOGIN_BUTTON: 'login-button',
  VALIDATION_ERROR: 'validation-error',

  // Admin Page
  ADMIN_DASHBOARD: 'admin-dashboard',
  FLASH_SALE_MANAGEMENT: 'flash-sale-management',
  FLASH_SALE_FORM: 'flash-sale-form',
  START_TIME_INPUT: 'start-time-input',
  END_TIME_INPUT: 'end-time-input',
  SAVE_BUTTON: 'save-button',
  FLASH_SALE_STATUS: 'flash-sale-status',
  STATUS_BADGE: 'status-badge',
  PRODUCT_NAME: 'product-name',
  PRODUCT_PRICE: 'product-price',
  AVAILABLE_QUANTITY: 'available-quantity',
  TOTAL_QUANTITY: 'total-quantity',
  TIME_UNTIL_START: 'time-until-start',
  TIME_UNTIL_END: 'time-until-end',
  TIME_SINCE_START: 'time-since-start',
  TIME_SINCE_END: 'time-since-end',
  TOTAL_ORDERS: 'total-orders',
  CONFIRMED_ORDERS: 'confirmed-orders',
  PENDING_ORDERS: 'pending-orders',
  SOLD_QUANTITY: 'sold-quantity',
  SUCCESS_MESSAGE: 'success-message',
  ERROR_MESSAGE: 'error-message',
  RETRY_BUTTON: 'retry-button',

  // Flash Sale Page
  FLASH_SALE_INTERFACE: 'flash-sale-interface',
  PURCHASE_BUTTON: 'purchase-button',
  COUNTDOWN_TIMER: 'countdown-timer'
} as const

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_ERROR_TRACKING: import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'true',
  ENABLE_PWA: import.meta.env.VITE_ENABLE_PWA !== 'false',
  ENABLE_WEBSOCKETS: import.meta.env.VITE_ENABLE_WEBSOCKETS !== 'false',
  MOCK_API: import.meta.env.VITE_MOCK_API === 'true'
} as const

// Environment
export const ENV = {
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
  IS_TEST: import.meta.env.MODE === 'test'
} as const
