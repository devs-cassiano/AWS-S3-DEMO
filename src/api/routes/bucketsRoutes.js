const express = require('express');
const bucketController = require('../controllers/bucketController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorization');
const { validate, validateParams, validateQuery, commonSchemas } = require('../middlewares/validation');
const Joi = require('joi');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation schemas
const createBucketSchema = Joi.object({
  name: commonSchemas.bucketName,
  region: Joi.string().default('us-east-1'),
  versioningEnabled: Joi.boolean().default(false),
  corsConfiguration: Joi.object().optional(),
  tags: Joi.object().default({})
});

const bucketParamsSchema = Joi.object({
  bucketName: commonSchemas.bucketName
});

const listBucketsQuerySchema = Joi.object({
  ...commonSchemas.pagination
});

const updatePolicySchema = Joi.object({
  policy: Joi.object().required()
});

/**
 * @swagger
 * /buckets:
 *   post:
 *     summary: Create a new bucket
 *     tags: [Buckets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 pattern: '^[a-z0-9][a-z0-9\-]*[a-z0-9]$'
 *                 minLength: 3
 *                 maxLength: 63
 *               region:
 *                 type: string
 *                 default: us-east-1
 *               versioningEnabled:
 *                 type: boolean
 *                 default: false
 *               corsConfiguration:
 *                 type: object
 *               tags:
 *                 type: object
 *     responses:
 *       201:
 *         description: Bucket created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Bucket'
 */
router.post('/', 
  validate(createBucketSchema), 
  authorize('create', 'bucket', (req) => req.body.name), 
  bucketController.createBucket
);

/**
 * @swagger
 * /buckets:
 *   get:
 *     summary: List all buckets for the authenticated user
 *     tags: [Buckets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 50
 *     responses:
 *       200:
 *         description: List of buckets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     buckets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Bucket'
 *                     pagination:
 *                       type: object
 */
router.get('/', 
  validateQuery(listBucketsQuerySchema), 
  authorize('list', 'bucket'), 
  bucketController.listBuckets
);

/**
 * @swagger
 * /buckets/{bucketName}:
 *   get:
 *     summary: Get bucket details
 *     tags: [Buckets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bucket details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Bucket'
 */
router.get('/:bucketName', 
  validateParams(bucketParamsSchema), 
  authorize('read', 'bucket', (req) => req.params.bucketName), 
  bucketController.getBucket
);

/**
 * @swagger
 * /buckets/{bucketName}:
 *   delete:
 *     summary: Delete a bucket
 *     tags: [Buckets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Bucket deleted successfully
 *       409:
 *         description: Bucket is not empty
 */
router.delete('/:bucketName', 
  validateParams(bucketParamsSchema), 
  authorize('delete', 'bucket', (req) => req.params.bucketName), 
  bucketController.deleteBucket
);

/**
 * @swagger
 * /buckets/{bucketName}/policy:
 *   put:
 *     summary: Update bucket policy
 *     tags: [Buckets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - policy
 *             properties:
 *               policy:
 *                 type: object
 *     responses:
 *       200:
 *         description: Policy updated successfully
 */
router.put('/:bucketName/policy', 
  validateParams(bucketParamsSchema), 
  validate(updatePolicySchema), 
  authorize('write', 'bucket', (req) => req.params.bucketName),
  bucketController.updatePolicy
);

/**
 * @swagger
 * /buckets/{bucketName}/versioning:
 *   put:
 *     summary: Update bucket versioning configuration
 *     tags: [Buckets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabled
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Enable or disable versioning
 *     responses:
 *       200:
 *         description: Versioning configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 */
// Versioning routes
router.put('/:bucketName/versioning', 
  validateParams(bucketParamsSchema), 
  validate(Joi.object({ enabled: Joi.boolean().required() })),
  authorize('write', 'bucket', (req) => req.params.bucketName),
  bucketController.updateVersioning
);

/**
 * @swagger
 * /buckets/{bucketName}/cors:
 *   put:
 *     summary: Update bucket CORS configuration
 *     tags: [Buckets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - corsConfiguration
 *             properties:
 *               corsConfiguration:
 *                 type: object
 *                 description: CORS configuration rules
 *                 properties:
 *                   corsRules:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         allowedOrigins:
 *                           type: array
 *                           items:
 *                             type: string
 *                         allowedMethods:
 *                           type: array
 *                           items:
 *                             type: string
 *                             enum: [GET, PUT, POST, DELETE, HEAD]
 *                         allowedHeaders:
 *                           type: array
 *                           items:
 *                             type: string
 *                         maxAgeSeconds:
 *                           type: integer
 *     responses:
 *       200:
 *         description: CORS configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 */
// CORS routes  
router.put('/:bucketName/cors', 
  validateParams(bucketParamsSchema), 
  validate(Joi.object({ corsConfiguration: Joi.object().required() })),
  authorize('write', 'bucket', (req) => req.params.bucketName),
  bucketController.updateCors
);

/**
 * @swagger
 * /buckets/{bucketName}/policy:
 *   get:
 *     summary: Get bucket policy
 *     tags: [Buckets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bucket policy retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BucketPolicy'
 *       404:
 *         description: No policy found for this bucket
 */
router.get('/:bucketName/policy', 
  validateParams(bucketParamsSchema), 
  authorize('read', 'bucket', (req) => req.params.bucketName),
  bucketController.getPolicy
);

/**
 * @swagger
 * /buckets/{bucketName}/policy:
 *   delete:
 *     summary: Delete bucket policy
 *     tags: [Buckets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Policy deleted successfully
 *       404:
 *         description: No policy found for this bucket
 */
router.delete('/:bucketName/policy', 
  validateParams(bucketParamsSchema), 
  authorize('write', 'bucket', (req) => req.params.bucketName),
  bucketController.deletePolicy
);

/**
 * @swagger
 * /buckets/{bucketName}/versioning:
 *   get:
 *     summary: Get bucket versioning configuration
 *     tags: [Buckets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Versioning configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [Enabled, Suspended]
 */
router.get('/:bucketName/versioning', 
  validateParams(bucketParamsSchema), 
  authorize('read', 'bucket', (req) => req.params.bucketName),
  bucketController.getVersioning
);

/**
 * @swagger
 * /buckets/{bucketName}/cors:
 *   get:
 *     summary: Get bucket CORS configuration
 *     tags: [Buckets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CORS configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 corsRules:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       allowedOrigins:
 *                         type: array
 *                         items:
 *                           type: string
 *                       allowedMethods:
 *                         type: array
 *                         items:
 *                           type: string
 *                       allowedHeaders:
 *                         type: array
 *                         items:
 *                           type: string
 *                       maxAgeSeconds:
 *                         type: integer
 */
router.get('/:bucketName/cors', 
  validateParams(bucketParamsSchema), 
  authorize('read', 'bucket', (req) => req.params.bucketName),
  bucketController.getCors
);

/**
 * @swagger
 * /buckets/{bucketName}/cors:
 *   delete:
 *     summary: Delete bucket CORS configuration
 *     tags: [Buckets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: CORS configuration deleted successfully
 */
router.delete('/:bucketName/cors', 
  validateParams(bucketParamsSchema), 
  authorize('write', 'bucket', (req) => req.params.bucketName),
  bucketController.deleteCors
);

module.exports = router;
