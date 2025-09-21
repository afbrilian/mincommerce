// Monitoring and error tracking utilities
// Note: Sentry integration is optional and requires @sentry/react package
// import { init, captureException, captureMessage, addBreadcrumb } from '@sentry/react'

// Initialize Sentry for error tracking
export const initMonitoring = () => {
  if (import.meta.env.PROD) {
    // Sentry initialization would go here
    console.log('Monitoring initialized for production')
  }
}

// Performance monitoring
export const trackPerformance = (name: string, startTime: number) => {
  const duration = performance.now() - startTime
  console.log(`Performance: ${name} took ${duration}ms`)
  
  if (import.meta.env.PROD) {
    // Sentry tracking would go here
    console.log(`Performance: ${name} took ${duration}ms`)
  }
}

// User interaction tracking
export const trackUserAction = (action: string, data?: Record<string, unknown>) => {
  console.log(`User action: ${action}`, data)
}

// API error tracking
export const trackApiError = (endpoint: string, error: Error, statusCode?: number) => {
  console.error(`API Error: ${endpoint}`, { error, statusCode })
}

// Custom error boundary
export const logError = (error: Error, errorInfo?: { componentStack: string }) => {
  console.error('React Error Boundary:', error, errorInfo)
}
