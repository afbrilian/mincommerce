import axios from 'axios'
import type { AxiosInstance, AxiosResponse } from 'axios'
import type {
  AuthResponse,
  LoginRequest,
  FlashSaleStatus,
  FlashSaleStats,
  FlashSaleFormData,
  FlashSale,
  PurchaseStatus,
  QueueStats,
  ApiResponse
} from '../types'

class ApiService {
  private api: AxiosInstance
  private baseURL: string

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      config => {
        // Get token from Zustand persisted state
        const authStorage = localStorage.getItem('auth-storage')
        if (authStorage) {
          try {
            const { state } = JSON.parse(authStorage)
            if (state.token) {
              config.headers.Authorization = `Bearer ${state.token}`
            }
          } catch (error) {
            console.error('Error parsing auth storage:', error)
          }
        }
        return config
      },
      error => {
        return Promise.reject(error)
      }
    )

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('auth-storage')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  // Authentication endpoints
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/login', data)
    return response.data
  }

  async verifyToken(token: string): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/auth/verify', { token })
    return response.data
  }

  // Flash Sale endpoints
  async getFlashSaleStatus(): Promise<ApiResponse<FlashSaleStatus>> {
    const response: AxiosResponse<ApiResponse<FlashSaleStatus>> =
      await this.api.get('/flash-sale/status')
    return response.data
  }

  // Admin endpoints
  async createFlashSale(data: FlashSaleFormData): Promise<ApiResponse<FlashSale>> {
    const response: AxiosResponse<ApiResponse<FlashSale>> = await this.api.post(
      '/admin/flash-sale',
      data
    )
    return response.data
  }

  async updateFlashSale(data: FlashSaleFormData): Promise<ApiResponse<FlashSale>> {
    const response: AxiosResponse<ApiResponse<FlashSale>> = await this.api.post(
      '/admin/flash-sale',
      data
    )
    return response.data
  }

  async getFlashSaleDetails(saleId: string): Promise<ApiResponse<FlashSale>> {
    const response: AxiosResponse<ApiResponse<FlashSale>> = await this.api.get(
      `/admin/flash-sale/${saleId}`
    )
    return response.data
  }

  async getFlashSaleStats(saleId: string): Promise<ApiResponse<FlashSaleStats>> {
    const response: AxiosResponse<ApiResponse<FlashSaleStats>> = await this.api.get(
      `/admin/flash-sale/${saleId}/stats`
    )
    return response.data
  }

  // Purchase endpoints
  async queuePurchase(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/purchase')
    return response.data
  }

  async getPurchaseStatus(): Promise<ApiResponse<PurchaseStatus>> {
    const response: AxiosResponse<ApiResponse<PurchaseStatus>> =
      await this.api.get('/purchase/status')
    return response.data
  }

  // Queue monitoring endpoints
  async getQueueStats(): Promise<ApiResponse<QueueStats>> {
    const response: AxiosResponse<ApiResponse<QueueStats>> = await this.api.get('/queue/stats')
    return response.data
  }

  async getQueueHealth(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.get('/queue/health')
    return response.data
  }

  // Health check
  async getHealth(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.get('/health')
    return response.data
  }
}

// Create and export a singleton instance
const apiService = new ApiService()

// Export organized API methods
export const api = {
  auth: {
    login: (email: string) => apiService.login({ email }),
    verifyToken: (token: string) => apiService.verifyToken(token)
  },
  flashSale: {
    getStatus: () => apiService.getFlashSaleStatus()
  },
  admin: {
    createFlashSale: (data: FlashSaleFormData) => apiService.createFlashSale(data),
    updateFlashSale: (data: FlashSaleFormData) => apiService.updateFlashSale(data),
    getFlashSaleDetails: (saleId: string) => apiService.getFlashSaleDetails(saleId),
    getFlashSaleStats: (saleId: string) => apiService.getFlashSaleStats(saleId)
  },
  purchase: {
    queuePurchase: () => apiService.queuePurchase(),
    getStatus: () => apiService.getPurchaseStatus()
  },
  queue: {
    getStats: () => apiService.getQueueStats(),
    getHealth: () => apiService.getQueueHealth()
  },
  health: {
    check: () => apiService.getHealth()
  }
}

export default api
