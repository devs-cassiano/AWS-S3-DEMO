const express = require('express');
const objectController = require('../controllers/objectController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorization');
const { validateParams, validateQuery, validate, commonSchemas } = require('../middlewares/validation');
const Joi = require('joi');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation schemas
const objectParamsSchema = Joi.object({
  bucketName: commonSchemas.bucketName,
  key: commonSchemas.objectKey
});

const listObjectsQuerySchema = Joi.object({
  ...commonSchemas.pagination,
  prefix: Joi.string().optional(),
  delimiter: Joi.string().optional(),
  marker: Joi.string().optional(),
  maxKeys: Joi.number().integer().min(1).max(1000).default(1000),
  versions: Joi.boolean().default(false)
});

const copyObjectSchema = Joi.object({
  copySource: Joi.string().required()
});

/**
 * @swagger
 * /objects/{bucketName}/{key}:
 *   put:
 *     summary: Upload an object to a bucket
 *     tags: [Objects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               metadata:
 *                 type: string
 *                 description: JSON string of user metadata
 *     responses:
 *       201:
 *         description: Object uploaded successfully
 */
router.put('/:bucketName/:key', 
  validateParams(objectParamsSchema),
  objectController.upload.single('file'),
  authorize('write', 'object', (req) => `${req.params.bucketName}/${req.params.key}`),
  objectController.uploadObject
);

/**
 * @swagger
 * /objects/{bucketName}/{key}:
 *   get:
 *     summary: Download an object from a bucket
 *     tags: [Objects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: versionId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Object downloaded successfully
 */
router.get('/:bucketName/:key', 
  validateParams(objectParamsSchema),
  authorize('read', 'object', (req) => `${req.params.bucketName}/${req.params.key}`),
  objectController.downloadObject
);

/**
 * @swagger
 * /objects/{bucketName}:
 *   get:
 *     summary: List objects in a bucket
 *     tags: [Objects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: prefix
 *         schema:
 *           type: string
 *       - in: query
 *         name: delimiter
 *         schema:
 *           type: string
 *       - in: query
 *         name: marker
 *         schema:
 *           type: string
 *       - in: query
 *         name: maxKeys
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *       - in: query
 *         name: versions
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Objects listed successfully
 */
router.get('/:bucketName', 
  validateParams(Joi.object({ bucketName: commonSchemas.bucketName })),
  validateQuery(listObjectsQuerySchema),
  authorize('read', 'bucket', (req) => req.params.bucketName),
  objectController.listObjects
);

/**
 * @swagger
 * /objects/{bucketName}/{key}:
 *   delete:
 *     summary: Delete an object from a bucket
 *     tags: [Objects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: versionId
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Object deleted successfully
 */
router.delete('/:bucketName/:key', 
  validateParams(objectParamsSchema),
  authorize('delete', 'object', (req) => `${req.params.bucketName}/${req.params.key}`),
  objectController.deleteObject
);

/**
 * @swagger
 * /objects/{bucketName}/{key}:
 *   post:
 *     summary: Copy an object
 *     tags: [Objects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: key
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
 *               - copySource
 *             properties:
 *               copySource:
 *                 type: string
 *                 description: Source object path in format /sourceBucket/sourceKey
 *     responses:
 *       201:
 *         description: Object copied successfully
 */
router.post('/:bucketName/:key', 
  validateParams(objectParamsSchema),
  validate(copyObjectSchema),
  authorize('write', 'object', (req) => `${req.params.bucketName}/${req.params.key}`),
  objectController.copyObject
);

/**
 * @swagger
 * /objects/{bucketName}/{key}/metadata:
 *   head:
 *     summary: Get object metadata
 *     tags: [Objects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: versionId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Object metadata retrieved successfully
 */
router.head('/:bucketName/:key', 
  validateParams(objectParamsSchema),
  authorize('read', 'object', (req) => `${req.params.bucketName}/${req.params.key}`),
  objectController.getObjectMetadata
);

/**
 * @swagger
 * /objects/{bucketName}:
 *   post:
 *     summary: Initiate multipart upload
 *     tags: [Objects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: uploads
 *         required: true
 *         schema:
 *           type: string
 *           enum: [""]
 *       - in: query
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Multipart upload initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uploadId:
 *                   type: string
 *                 bucket:
 *                   type: string
 *                 key:
 *                   type: string
 */
router.post('/:bucketName', 
  validateParams(objectParamsSchema),
  authorize('write', 'object', (req) => `${req.params.bucketName}/${req.query.key}`),
  (req, res, next) => {
    if (req.query.uploads !== undefined) {
      return objectController.initiateMultipartUpload(req, res, next);
    }
    next();
  }
);

/**
 * @swagger
 * /objects/{bucketName}/{key}:
 *   put:
 *     summary: Upload part for multipart upload
 *     tags: [Objects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: uploadId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: partNumber
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10000
 *     requestBody:
 *       required: true
 *       content:
 *         application/octet-stream:
 *           schema:
 *             type: string
 *             format: binary
 *     responses:
 *       200:
 *         description: Part uploaded successfully
 *         headers:
 *           ETag:
 *             description: Entity tag for the uploaded part
 *             schema:
 *               type: string
 */

/**
 * @swagger
 * /objects/{bucketName}/{key}/acl:
 *   get:
 *     summary: Get object ACL
 *     tags: [Objects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Object ACL retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 owner:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     displayName:
 *                       type: string
 *                 grants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       grantee:
 *                         type: object
 *                       permission:
 *                         type: string
 *                         enum: [FULL_CONTROL, READ, WRITE, READ_ACP, WRITE_ACP]
 */
router.get('/:bucketName/:key/acl',
  validateParams(objectParamsSchema),
  authorize('read', 'object', (req) => `${req.params.bucketName}/${req.params.key}`),
  objectController.getObjectAcl
);

/**
 * @swagger
 * /objects/{bucketName}/{key}/acl:
 *   put:
 *     summary: Update object ACL
 *     tags: [Objects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               grants:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Object ACL updated successfully
 */
router.put('/:bucketName/:key/acl',
  validateParams(objectParamsSchema),
  authorize('write', 'object', (req) => `${req.params.bucketName}/${req.params.key}`),
  objectController.updateObjectAcl
);

/**
 * @swagger
 * /objects/{bucketName}/{key}/tagging:
 *   get:
 *     summary: Get object tags
 *     tags: [Objects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Object tags retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tagSet:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                       value:
 *                         type: string
 */
router.get('/:bucketName/:key/tagging',
  validateParams(objectParamsSchema),
  authorize('read', 'object', (req) => `${req.params.bucketName}/${req.params.key}`),
  objectController.getObjectTags
);

/**
 * @swagger
 * /objects/{bucketName}/{key}/tagging:
 *   put:
 *     summary: Update object tags
 *     tags: [Objects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bucketName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tagSet:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     key:
 *                       type: string
 *                     value:
 *                       type: string
 *     responses:
 *       200:
 *         description: Object tags updated successfully
 */
router.put('/:bucketName/:key/tagging',
  validateParams(objectParamsSchema),
  authorize('write', 'object', (req) => `${req.params.bucketName}/${req.params.key}`),
  objectController.updateObjectTags
);

module.exports = router;
