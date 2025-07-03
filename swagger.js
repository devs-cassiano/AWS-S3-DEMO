const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('./src/config');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'S3-like Storage API',
      version: '1.0.0',
      description: 'Sistema de armazenamento de objetos inspirado no Amazon S3',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.port || 3000}/api/v1`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'string',
              description: 'Error code'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        },
        Bucket: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string',
              description: 'Bucket name'
            },
            region: {
              type: 'string',
              description: 'Bucket region'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            versioning: {
              type: 'boolean',
              description: 'Versioning enabled'
            }
          }
        },
        Object: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            key: {
              type: 'string',
              description: 'Object key'
            },
            bucket: {
              type: 'string',
              description: 'Bucket name'
            },
            size: {
              type: 'integer',
              description: 'Object size in bytes'
            },
            contentType: {
              type: 'string',
              description: 'MIME type'
            },
            lastModified: {
              type: 'string',
              format: 'date-time'
            },
            etag: {
              type: 'string',
              description: 'Entity tag'
            },
            storageClass: {
              type: 'string',
              enum: ['STANDARD', 'REDUCED_REDUNDANCY', 'GLACIER', 'DEEP_ARCHIVE'],
              description: 'Storage class'
            },
            metadata: {
              type: 'object',
              description: 'User-defined metadata'
            },
            tags: {
              type: 'object',
              description: 'Object tags'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID from external IAM'
            },
            email: {
              type: 'string',
              format: 'email'
            },
            role: {
              type: 'string',
              enum: ['admin', 'user']
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          }
        },
        MultipartUpload: {
          type: 'object',
          properties: {
            uploadId: {
              type: 'string',
              format: 'uuid'
            },
            bucket: {
              type: 'string'
            },
            key: {
              type: 'string'
            },
            initiated: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        ObjectACL: {
          type: 'object',
          properties: {
            owner: {
              type: 'object',
              properties: {
                id: {
                  type: 'string'
                },
                displayName: {
                  type: 'string'
                }
              }
            },
            grants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  grantee: {
                    type: 'object'
                  },
                  permission: {
                    type: 'string',
                    enum: ['FULL_CONTROL', 'READ', 'WRITE', 'READ_ACP', 'WRITE_ACP']
                  }
                }
              }
            }
          }
        },
        BucketPolicy: {
          type: 'object',
          properties: {
            version: {
              type: 'string',
              default: '2012-10-17'
            },
            statement: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  effect: {
                    type: 'string',
                    enum: ['Allow', 'Deny']
                  },
                  principal: {
                    type: 'object'
                  },
                  action: {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  },
                  resource: {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  },
                  condition: {
                    type: 'object'
                  }
                }
              }
            }
          }
        },
        AccessLog: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            userId: {
              type: 'string',
              description: 'User ID from external IAM'
            },
            bucketId: {
              type: 'string',
              format: 'uuid'
            },
            objectId: {
              type: 'string',
              format: 'uuid'
            },
            action: {
              type: 'string',
              description: 'Action performed'
            },
            resource: {
              type: 'string',
              description: 'Resource accessed'
            },
            httpMethod: {
              type: 'string',
              enum: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']
            },
            httpStatus: {
              type: 'integer',
              description: 'HTTP status code'
            },
            ipAddress: {
              type: 'string',
              description: 'Client IP address'
            },
            userAgent: {
              type: 'string',
              description: 'User agent string'
            },
            responseTime: {
              type: 'integer',
              description: 'Response time in milliseconds'
            },
            bytesTransferred: {
              type: 'integer',
              description: 'Bytes transferred'
            },
            allowed: {
              type: 'boolean',
              description: 'Whether the request was allowed'
            },
            errorCode: {
              type: 'string',
              description: 'Error code if applicable'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/api/routes/*.js'] // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

function setupSwagger(app) {
  console.log('Setting up Swagger documentation...');
  console.log('Swagger specs generated:', Object.keys(specs));
  
  // Configurar middleware para desativar políticas restritivas do helmet para as rotas do Swagger
  app.use(['/docs', '/docs/*', '/swagger.json'], (req, res, next) => {
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Content-Security-Policy');
    next();
  });
  
  // Configurar o Swagger UI
  app.use('/docs', swaggerUi.serve);
  app.get('/docs', swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'S3-like Storage API Documentation'
  }));

  // Serve raw swagger.json
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
  
  console.log('Swagger setup completed');
}

module.exports = setupSwagger;
