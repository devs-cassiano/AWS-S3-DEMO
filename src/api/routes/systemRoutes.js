const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /system/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Process uptime in seconds
 *                 version:
 *                   type: string
 *                   description: API version
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * @swagger
 * /system/info:
 *   get:
 *     summary: Get system information
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: System information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: S3-like Storage API
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 description:
 *                   type: string
 *                   example: Sistema de armazenamento de objetos inspirado no Amazon S3
 *                 environment:
 *                   type: string
 *                   example: development
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["jwt-authentication", "iam-integration", "local-storage", "versioning"]
 */
router.get('/info', (req, res) => {
  res.json({
    name: 'S3-like Storage API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Sistema de armazenamento de objetos inspirado no Amazon S3',
    environment: process.env.NODE_ENV || 'development',
    features: [
      'jwt-authentication',
      'iam-integration', 
      'local-storage',
      'versioning',
      'bucket-policies',
      'access-logs',
      'multipart-uploads'
    ]
  });
});

module.exports = router;
