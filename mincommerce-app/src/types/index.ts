// User types
export interface User {
  userId: string
  email: string
  role: 'admin' | 'user'
  createdAt: string
}

// Authentication types
export interface AuthResponse {
  success: boolean
  token: string
  userType: 'admin' | 'user'
  email: string
  userId: string
}

export interface LoginRequest {
  email: string
}

// Product types
export interface Product {
  productId: string
  name: string
  description: string
  price: number
  imageUrl: string
  createdAt: string
}

// Flash Sale types
export interface FlashSale {
  saleId: string
  productId: string
  startTime: string
  endTime: string
  status: 'upcoming' | 'active' | 'ended'
  createdAt: string
  updatedAt: string
  productName: string
  productDescription: string
  productPrice: number
}

export interface UserPurchaseEligibility {
  canPurchase: boolean
  reason?: string
  hasCompletedPurchase?: boolean
  hasPendingPurchase?: boolean
  purchaseStatus?: string
  jobId?: string
}

export interface FlashSaleStatus {
  saleId: string
  productId: string
  status: 'upcoming' | 'active' | 'ended'
  productName: string
  productDescription: string
  productPrice: number
  availableQuantity: number
  timeUntilStart: number
  timeUntilEnd: number
  startTime: string
  endTime: string
  userPurchaseEligibility?: UserPurchaseEligibility
}

export interface FlashSaleStats {
  saleId: string
  totalOrders: number
  confirmedOrders: number
  pendingOrders: number
  totalQuantity: number
  availableQuantity: number
  soldQuantity: number
}

// Order types
export interface Order {
  orderId: string
  userId: string
  productId: string
  saleId: string
  quantity: number
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: string
}

// Purchase types
export interface PurchaseResponse {
  success: boolean
  data: {
    orderId: string
    purchasedAt: string
  }
}

export interface QueuePurchaseResponse {
  success: boolean
  data: {
    jobId: string
    status: 'queued' | 'processing' | 'completed' | 'failed'
    estimatedWaitTime: number
  }
}

export interface PurchaseStatus {
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'not_purchased'
  orderId?: string
  purchasedAt?: string
  jobId?: string
  estimatedWaitTime?: number
  success?: boolean
  reason?: string
}

// Queue types
export interface QueueStats {
  queue: {
    waiting: number
    active: number
    completed: number
    failed: number
  }
  workers: {
    total: number
    active: number
    idle: number
  }
  performance: {
    averageProcessingTime: number
    jobsPerSecond: number
  }
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

// Form types
export interface FlashSaleFormData {
  productId: string
  startTime: string
  endTime: string
  saleId?: string
}

// WebSocket types
export interface WebSocketMessage {
  type: 'flash_sale_update' | 'purchase_update' | 'queue_update'
  data: unknown
  timestamp: string
}
