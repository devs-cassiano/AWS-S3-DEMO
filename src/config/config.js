require('dotenv').config();

const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 3000,

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 's3_demo',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: '7d'
  },

  // Storage
  storage: {
    type: process.env.STORAGE_TYPE || 'filesystem',
    path: process.env.STORAGE_PATH || './storage'
  },

  // IAM Service
  iam: {
    serviceUrl: process.env.IAM_SERVICE_URL || 'http://localhost:3001',
    timeout: parseInt(process.env.IAM_SERVICE_TIMEOUT) || 5000
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log'
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // Validation
  validation: {
    bucketNameMinLength: 3,
    bucketNameMaxLength: 63,
    objectKeyMaxLength: 1024,
    maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
    allowedMimeTypes: [] // Empty array means all types allowed
  }
};

module.exports = config;
