// Environment configuration
export const config = {
  // API Configuration
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3001',

  // App Configuration
  appName: import.meta.env.VITE_APP_NAME || 'MinCommerce',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',

  // Monitoring & Analytics
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  gaTrackingId: import.meta.env.VITE_GA_TRACKING_ID,

  // Feature Flags
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  enableErrorTracking: import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'true',
  enablePWA: import.meta.env.VITE_ENABLE_PWA !== 'false',

  // Development
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  debug: import.meta.env.VITE_DEBUG === 'true',
  mockApi: import.meta.env.VITE_MOCK_API === 'true'
} as const

export type Config = typeof config
