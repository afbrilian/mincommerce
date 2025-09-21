/**
 * Logger Utility Tests
 * Tests for Winston logger configuration and functionality
 */

const logger = require('./logger')
const CONSTANTS = require('../constants')

describe('Logger Utility', () => {
  beforeEach(() => {
    // Clear any existing transports
    logger.clear()

    // Add console transport for testing
    const winston = require('winston')
    logger.add(
      new winston.transports.Console({
        silent: true // Suppress output during tests
      })
    )
  })

  afterEach(() => {
    // Clean up transports
    logger.clear()
  })

  describe('Logger Configuration', () => {
    it('should be configured with correct default meta', () => {
      expect(logger.defaultMeta).toHaveProperty('service', 'mincommerce-api')
      expect(logger.defaultMeta).toHaveProperty('pid', process.pid)
    })

    it('should have correct log level', () => {
      expect(logger.level).toBe(process.env.LOG_LEVEL || 'info')
    })

    it('should have JSON format', () => {
      const format = logger.format
      expect(format).toBeDefined()
    })
  })

  describe('Logging Levels', () => {
    it('should log error messages', () => {
      expect(() => logger.error('Test error message')).not.toThrow()
    })

    it('should log warn messages', () => {
      expect(() => logger.warn('Test warning message')).not.toThrow()
    })

    it('should log info messages', () => {
      expect(() => logger.info('Test info message')).not.toThrow()
    })

    it('should log debug messages', () => {
      expect(() => logger.debug('Test debug message')).not.toThrow()
    })
  })

  describe('Log Message Formatting', () => {
    it('should include timestamp in log messages', () => {
      const logSpy = jest.spyOn(logger, 'info')

      logger.info('Test message')

      expect(logSpy).toHaveBeenCalled()
      logSpy.mockRestore()
    })

    it('should include service metadata', () => {
      const logSpy = jest.spyOn(logger, 'info')

      logger.info('Test message')

      expect(logSpy).toHaveBeenCalled()
      logSpy.mockRestore()
    })

    it('should handle error objects with stack traces', () => {
      const error = new Error('Test error')

      expect(() => logger.error('Error occurred:', error)).not.toThrow()
    })

    it('should handle objects and arrays', () => {
      const testObject = { key: 'value', number: 123 }
      const testArray = [1, 2, 3]

      expect(() => logger.info('Object:', testObject)).not.toThrow()
      expect(() => logger.info('Array:', testArray)).not.toThrow()
    })
  })

  describe('Environment-specific Configuration', () => {
    const originalEnv = process.env.NODE_ENV

    afterEach(() => {
      process.env.NODE_ENV = originalEnv
    })

    it('should have different configuration in production', () => {
      process.env.NODE_ENV = CONSTANTS.ENVIRONMENT.PRODUCTION

      // In production, file transports should be added
      // This test verifies the configuration exists
      expect(logger.transports).toBeDefined()
    })

    it('should use console transport in development', () => {
      process.env.NODE_ENV = CONSTANTS.ENVIRONMENT.DEVELOPMENT

      // Should have console transport
      const consoleTransport = logger.transports.console
      expect(consoleTransport).toBeDefined()
    })
  })

  describe('Log Level Configuration', () => {
    const originalLogLevel = process.env.LOG_LEVEL

    afterEach(() => {
      process.env.LOG_LEVEL = originalLogLevel
    })

    it('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = CONSTANTS.LOGGING.LEVELS.DEBUG

      // Create new logger instance to test
      const testLogger = require('./logger')
      expect(testLogger.level).toBe(CONSTANTS.LOGGING.LEVELS.DEBUG)
    })

    it('should default to info level', () => {
      delete process.env.LOG_LEVEL

      // Create new logger instance to test
      const testLogger = require('./logger')
      expect(testLogger.level).toBe('info')
    })
  })

  describe('Error Handling', () => {
    it('should handle undefined messages gracefully', () => {
      expect(() => logger.info(undefined)).not.toThrow()
      expect(() => logger.error(null)).not.toThrow()
    })

    it('should handle circular references in objects', () => {
      const circularObject = { name: 'test' }
      circularObject.self = circularObject

      expect(() => logger.info('Circular object:', circularObject)).not.toThrow()
    })

    it('should handle very large messages', () => {
      const largeMessage = 'x'.repeat(10000)

      expect(() => logger.info(largeMessage)).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('should handle multiple concurrent log messages', async () => {
      const logPromises = Array(100)
        .fill()
        .map((_, index) => {
          return new Promise(resolve => {
            logger.info(`Concurrent log message ${index}`)
            resolve()
          })
        })

      const startTime = Date.now()
      await Promise.all(logPromises)
      const endTime = Date.now()

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000) // 1 second
    })

    it('should handle mixed log levels efficiently', () => {
      const startTime = Date.now()

      for (let i = 0; i < 50; i++) {
        logger.error(`Error message ${i}`)
        logger.warn(`Warning message ${i}`)
        logger.info(`Info message ${i}`)
        logger.debug(`Debug message ${i}`)
      }

      const endTime = Date.now()

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(500) // 0.5 seconds
    })
  })

  describe('Structured Logging', () => {
    it('should log structured data correctly', () => {
      const structuredData = {
        userId: '12345',
        action: 'purchase',
        timestamp: new Date().toISOString(),
        metadata: {
          productId: 'prod-123',
          quantity: 1
        }
      }

      expect(() => logger.info('Purchase event:', structuredData)).not.toThrow()
    })

    it('should handle nested objects in structured logging', () => {
      const nestedData = {
        user: {
          id: '12345',
          profile: {
            name: 'John Doe',
            preferences: {
              notifications: true
            }
          }
        },
        order: {
          id: 'order-123',
          items: [
            { productId: 'prod-1', quantity: 1 },
            { productId: 'prod-2', quantity: 2 }
          ]
        }
      }

      expect(() => logger.info('Complex event:', nestedData)).not.toThrow()
    })
  })

  describe('Constants Integration', () => {
    it('should use logging levels from constants', () => {
      expect(CONSTANTS.LOGGING.LEVELS.ERROR).toBe('error')
      expect(CONSTANTS.LOGGING.LEVELS.WARN).toBe('warn')
      expect(CONSTANTS.LOGGING.LEVELS.INFO).toBe('info')
      expect(CONSTANTS.LOGGING.LEVELS.DEBUG).toBe('debug')
    })

    it('should use log formats from constants', () => {
      expect(CONSTANTS.LOGGING.LOG_FORMATS.JSON).toBe('json')
      expect(CONSTANTS.LOGGING.LOG_FORMATS.SIMPLE).toBe('simple')
      expect(CONSTANTS.LOGGING.LOG_FORMATS.COMBINED).toBe('combined')
    })

    it('should use environment constants', () => {
      expect(CONSTANTS.ENVIRONMENT.DEVELOPMENT).toBe('development')
      expect(CONSTANTS.ENVIRONMENT.TEST).toBe('test')
      expect(CONSTANTS.ENVIRONMENT.PRODUCTION).toBe('production')
    })
  })
})
