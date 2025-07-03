const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const config = require('./config');
const logger = require('./utils/logger');
const errorHandler = require('./api/middlewares/errorHandler');
const routes = require('./api/routes');
const swaggerSetup = require('../swagger');
const initializeStorageDirs = require('./utils/ensureStorageDirs');

class App {
  constructor() {
    this.app = express();
    
    // Garantir que os diretórios de armazenamento existam
    this.storagePaths = initializeStorageDirs();
    
    this.setupMiddlewares();
    this.setupSwagger(); // Configurar Swagger antes das rotas e manipulador de erros
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddlewares() {
    // Security middlewares
    this.app.use(helmet());
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use(limiter);

    // Body parsing and compression
    this.app.use(compression());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.env
      });
    });

    // API routes
    this.app.use('/api/v1', routes);
    
    // Redirect root to documentation
    this.app.get('/', (req, res) => {
      res.redirect('/docs');
    });
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
      });
    });

    // Global error handler
    this.app.use(errorHandler);
  }

  setupSwagger() {
    swaggerSetup(this.app);
  }

  async start() {
    try {
      // Initialize database connection
      const { initializeDatabase } = require('./database');
      await initializeDatabase();
      logger.info('Database connection established successfully');

      // Start server
      const port = config.port;
      this.server = this.app.listen(port, () => {
        logger.info(`Server running on port ${port} in ${config.env} mode`);
        logger.info(`API Documentation available at http://localhost:${port}/docs`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async gracefulShutdown(signal) {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    
    if (this.server) {
      this.server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Close database connection
          const { closeConnection } = require('./database');
          await closeConnection();
          logger.info('Database connection closed');
          
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });
    }
  }
}

module.exports = App;
