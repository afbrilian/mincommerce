// Monitoring and error tracking utilities
import { init, captureException, captureMessage, addBreadcrumb } from '@sentry/react'

// Initialize Sentry for error tracking
export const initMonitoring = () => {
  if (import.meta.env.PROD) {
    init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      beforeSend(event) {
        // Filter out development errors
        if (event.exception) {
          const error = event.exception.values?.[0]
          if (error?.value?.includes('ResizeObserver loop limit exceeded')) {
            return null
          }
        }
        return event
      }
    })
  }
}

// Performance monitoring
export const trackPerformance = (name: string, startTime: number) => {
  const duration = performance.now() - startTime
  addBreadcrumb({
    message: `Performance: ${name}`,
    category: 'performance',
    data: { duration }
  })
  
  if (import.meta.env.PROD) {
    captureMessage(`Performance: ${name} took ${duration}ms`, 'info')
  }
}

// User interaction tracking
export const trackUserAction = (action: string, data?: Record<string, unknown>) => {
  addBreadcrumb({
    message: `User action: ${action}`,
    category: 'user',
    data
  })
}

// API error tracking
export const trackApiError = (endpoint: string, error: Error, statusCode?: number) => {
  captureException(error, {
    tags: {
      section: 'api',
      endpoint
    },
    extra: {
      statusCode,
      url: endpoint
    }
  })
}

// Custom error boundary
export const logError = (error: Error, errorInfo?: { componentStack: string }) => {
  captureException(error, {
    contexts: {
      react: {
        componentStack: errorInfo?.componentStack
      }
    }
  })
}
