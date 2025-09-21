const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MinCommerce Flash Sale API',
      version: '1.0.0',
      description:
        'A high-throughput flash sale system built with Node.js, Express, PostgreSQL, and Redis',
      contact: {
        name: 'MinCommerce Team',
        email: 'admin@brilian.af'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.mincommerce.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Error message'
            },
            code: {
              type: 'string',
              example: 'VALIDATION_ERROR'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com'
            },
            role: {
              type: 'string',
              enum: ['admin', 'user'],
              example: 'user'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00.000Z'
            }
          }
        },
        Product: {
          type: 'object',
          properties: {
            productId: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            name: {
              type: 'string',
              example: 'Limited Edition Gaming Console'
            },
            description: {
              type: 'string',
              example: 'The most advanced gaming console with exclusive features'
            },
            price: {
              type: 'number',
              format: 'float',
              example: 599.99
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://via.placeholder.com/400x300?text=Gaming+Console'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00.000Z'
            }
          }
        },
        FlashSale: {
          type: 'object',
          properties: {
            saleId: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            productId: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            startTime: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T10:00:00.000Z'
            },
            endTime: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T12:00:00.000Z'
            },
            status: {
              type: 'string',
              enum: ['upcoming', 'active', 'ended'],
              example: 'active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00.000Z'
            }
          }
        },
        FlashSaleStatus: {
          type: 'object',
          properties: {
            saleId: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            status: {
              type: 'string',
              enum: ['upcoming', 'active', 'ended'],
              example: 'active'
            },
            productName: {
              type: 'string',
              example: 'Limited Edition Gaming Console'
            },
            productDescription: {
              type: 'string',
              example: 'The most advanced gaming console with exclusive features'
            },
            productPrice: {
              type: 'number',
              format: 'float',
              example: 599.99
            },
            availableQuantity: {
              type: 'integer',
              example: 100
            },
            timeUntilStart: {
              type: 'integer',
              description: 'Seconds until sale starts (negative if already started)',
              example: -3600
            },
            timeUntilEnd: {
              type: 'integer',
              description: 'Seconds until sale ends (negative if already ended)',
              example: 3600
            }
          }
        },
        Order: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            userId: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            productId: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            saleId: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            quantity: {
              type: 'integer',
              example: 1
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'cancelled'],
              example: 'confirmed'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00.000Z'
            }
          }
        },
        PurchaseResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                orderId: {
                  type: 'string',
                  format: 'uuid',
                  example: '123e4567-e89b-12d3-a456-426614174000'
                },
                purchasedAt: {
                  type: 'string',
                  format: 'date-time',
                  example: '2023-01-01T00:00:00.000Z'
                }
              }
            }
          }
        },
        QueuePurchaseResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                jobId: {
                  type: 'string',
                  example: 'job_123456789'
                },
                status: {
                  type: 'string',
                  enum: ['queued', 'processing', 'completed', 'failed'],
                  example: 'queued'
                },
                estimatedWaitTime: {
                  type: 'integer',
                  description: 'Estimated wait time in seconds',
                  example: 30
                }
              }
            }
          }
        },
        PurchaseStatus: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['queued', 'processing', 'completed', 'failed', 'not_purchased'],
                  example: 'completed'
                },
                orderId: {
                  type: 'string',
                  format: 'uuid',
                  example: '123e4567-e89b-12d3-a456-426614174000'
                },
                purchasedAt: {
                  type: 'string',
                  format: 'date-time',
                  example: '2023-01-01T00:00:00.000Z'
                },
                jobId: {
                  type: 'string',
                  example: 'job_123456789'
                },
                estimatedWaitTime: {
                  type: 'integer',
                  description: 'Estimated wait time in seconds',
                  example: 30
                }
              }
            }
          }
        },
        FlashSaleStats: {
          type: 'object',
          properties: {
            saleId: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            totalOrders: {
              type: 'integer',
              example: 150
            },
            confirmedOrders: {
              type: 'integer',
              example: 145
            },
            pendingOrders: {
              type: 'integer',
              example: 5
            },
            totalQuantity: {
              type: 'integer',
              example: 1000
            },
            availableQuantity: {
              type: 'integer',
              example: 855
            },
            soldQuantity: {
              type: 'integer',
              example: 145
            }
          }
        },
        QueueStats: {
          type: 'object',
          properties: {
            queue: {
              type: 'object',
              properties: {
                waiting: {
                  type: 'integer',
                  example: 10
                },
                active: {
                  type: 'integer',
                  example: 5
                },
                completed: {
                  type: 'integer',
                  example: 100
                },
                failed: {
                  type: 'integer',
                  example: 2
                }
              }
            },
            workers: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  example: 3
                },
                active: {
                  type: 'integer',
                  example: 3
                },
                idle: {
                  type: 'integer',
                  example: 0
                }
              }
            },
            performance: {
              type: 'object',
              properties: {
                averageProcessingTime: {
                  type: 'number',
                  format: 'float',
                  example: 1.5
                },
                jobsPerSecond: {
                  type: 'number',
                  format: 'float',
                  example: 10.5
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Admin',
        description: 'Admin-only endpoints for managing flash sales'
      },
      {
        name: 'Flash Sale',
        description: 'Public flash sale information'
      },
      {
        name: 'Purchase',
        description: 'User purchase operations'
      },
      {
        name: 'Queue',
        description: 'Queue monitoring and management'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/routes/**/*.js']
}

const specs = swaggerJSDoc(options)

module.exports = {
  swaggerUi,
  specs,
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'MinCommerce Flash Sale API',
    swaggerOptions: {
      url: '/api-docs/swagger.json',
      tryItOutEnabled: true,
      requestInterceptor: req => {
        // Allow requests to localhost:3001
        return req
      }
    }
  })
}
