const logger = require('../utils/logger')

const errorHandler = (error, req, res, _next) => {
  let statusCode = error.statusCode || 500
  let message = error.message || 'Internal Server Error'

  // Log the error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation Error'
  }

  if (error.name === 'UnauthorizedError') {
    statusCode = 401
    message = 'Unauthorized'
  }

  if (error.code === '23505') {
    // PostgreSQL unique constraint violation
    statusCode = 409
    message = 'Resource already exists'
  }

  if (error.code === '23503') {
    // PostgreSQL foreign key constraint violation
    statusCode = 400
    message = 'Invalid reference'
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error'
  }

  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  })
}

module.exports = errorHandler
