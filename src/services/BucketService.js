const { Bucket, S3Object } = require('../models');
const { AppError } = require('../api/middlewares/errorHandler');
const { validateBucketName } = require('../utils/helpers');
const logger = require('../utils/logger');
const { iamService } = require('../iam/iamService');

class BucketService {
  /**
   * Create a new bucket
   * @param {Object} bucketData - Bucket creation data
   * @param {string} userId - User ID from JWT
   * @returns {Promise<Object>} Created bucket
   */
  async createBucket(bucketData, userId) {
    const { name, region, versioningEnabled, corsConfiguration, tags } = bucketData;

    // Validate bucket name
    if (!validateBucketName(name)) {
      throw new AppError('Invalid bucket name', 400, 'INVALID_BUCKET_NAME');
    }

    // Check if bucket already exists
    const existingBucket = await Bucket.findOne({ where: { name } });
    if (existingBucket) {
      throw new AppError('Bucket already exists', 409, 'BUCKET_ALREADY_EXISTS');
    }

    // Create bucket
    const bucket = await Bucket.create({
      name,
      region: region || 'us-east-1',
      versioningEnabled: versioningEnabled || false,
      corsConfiguration,
      tags: tags || {},
      ownerId: userId
    });

    logger.info(`Bucket created: ${name} by user ${userId}`);
    
    return bucket;
  }

  /**
   * List buckets for a user
   * @param {string} userId - User ID from JWT
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} List of buckets with pagination
   */
  async listBuckets(userId, options = {}) {
    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    const { count, rows: buckets } = await Bucket.findAndCountAll({
      where: { ownerId: userId },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    return {
      buckets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Get bucket by name
   * @param {string} bucketName - Bucket name
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Bucket data
   */
  async getBucket(bucketName, userId) {
    const bucket = await Bucket.findOne({
      where: { name: bucketName }
    });

    if (!bucket) {
      throw new AppError('Bucket not found', 404, 'BUCKET_NOT_FOUND');
    }

    // Check authorization using IAM
    const permissionResult = await iamService.checkPermission(
      userId,
      'read',
      'bucket',
      bucketName
    );

    if (!permissionResult || !permissionResult.allowed) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    return bucket;
  }

  /**
   * Delete bucket
   * @param {string} bucketName - Bucket name
   * @param {string} userId - User ID for authorization
   * @returns {Promise<void>}
   */
  async deleteBucket(bucketName, userId) {
    const bucket = await Bucket.findOne({
      where: { name: bucketName }
    });

    if (!bucket) {
      throw new AppError('Bucket not found', 404, 'BUCKET_NOT_FOUND');
    }

    // Check authorization using IAM
    const permissionResult = await iamService.checkPermission(
      userId,
      'delete',
      'bucket',
      bucketName
    );

    if (!permissionResult || !permissionResult.allowed) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if bucket is empty
    const objectCount = await S3Object.count({
      where: { bucketName }
    });

    if (objectCount > 0) {
      throw new AppError('Cannot delete non-empty bucket', 409, 'BUCKET_NOT_EMPTY');
    }

    await bucket.destroy();
    logger.info(`Bucket deleted: ${bucketName} by user ${userId}`);
  }

  /**
   * Update bucket policy
   * @param {string} bucketName - Bucket name
   * @param {Object} policy - New policy
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Updated bucket
   */
  async updateBucketPolicy(bucketName, policy, userId) {
    const bucket = await Bucket.findOne({
      where: { name: bucketName }
    });

    if (!bucket) {
      throw new AppError('Bucket not found', 404, 'BUCKET_NOT_FOUND');
    }

    // Check authorization using IAM
    const permissionResult = await iamService.checkPermission(
      userId,
      'write',
      'bucket',
      bucketName
    );

    if (!permissionResult || !permissionResult.allowed) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    bucket.policy = policy;
    await bucket.save();

    logger.info(`Bucket policy updated: ${bucketName} by user ${userId}`);
    return bucket;
  }

  /**
   * Update bucket versioning
   * @param {string} bucketName - Bucket name
   * @param {boolean} enabled - Versioning enabled
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Updated bucket
   */
  async updateBucketVersioning(bucketName, enabled, userId) {
    const bucket = await Bucket.findOne({
      where: { name: bucketName }
    });

    if (!bucket) {
      throw new AppError('Bucket not found', 404, 'BUCKET_NOT_FOUND');
    }

    // Check authorization using IAM
    const permissionResult = await iamService.checkPermission(
      userId,
      'write',
      'bucket',
      bucketName
    );

    if (!permissionResult || !permissionResult.allowed) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    bucket.versioningEnabled = enabled;
    await bucket.save();

    logger.info(`Bucket versioning ${enabled ? 'enabled' : 'disabled'}: ${bucketName} by user ${userId}`);
    return bucket;
  }

  /**
   * Update bucket CORS configuration
   * @param {string} bucketName - Bucket name
   * @param {Object} corsConfiguration - CORS configuration
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Updated bucket
   */
  async updateBucketCors(bucketName, corsConfiguration, userId) {
    const bucket = await Bucket.findOne({
      where: { name: bucketName }
    });

    if (!bucket) {
      throw new AppError('Bucket not found', 404, 'BUCKET_NOT_FOUND');
    }

    // Check authorization using IAM
    const permissionResult = await iamService.checkPermission(
      userId,
      'write',
      'bucket',
      bucketName
    );

    if (!permissionResult || !permissionResult.allowed) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    bucket.corsConfiguration = corsConfiguration;
    await bucket.save();

    logger.info(`Bucket CORS updated: ${bucketName} by user ${userId}`);
    return bucket;
  }
}

module.exports = new BucketService();
