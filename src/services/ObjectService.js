const { Bucket, S3Object, AccessLog } = require('../models');
const { AppError } = require('../api/middlewares/errorHandler');
const logger = require('../utils/logger');
const { iamService } = require('../iam/iamService');
const storage = require('../storage');
const path = require('path');
const crypto = require('crypto');
const { Op } = require('sequelize');

class ObjectService {
  /**
   * Upload object to bucket
   * @param {string} bucketName - Bucket name
   * @param {string} key - Object key
   * @param {Buffer} data - Object data
   * @param {Object} metadata - Object metadata
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Created object
   */
  async uploadObject(bucketName, key, data, metadata = {}, userId) {
    // Check if bucket exists and user has access
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
      'object',
      `${bucketName}/${key}`
    );

    if (!permissionResult || !permissionResult.allowed) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Get storage provider
    const storageProvider = storage.getDefault();
    
    // Store physical file with metadata
    const result = await storageProvider.putObject(bucketName, key, data, {
      contentType: metadata.contentType || 'application/octet-stream',
      userMetadata: metadata.userMetadata || {}
    });
    
    // Use provided etag from storage
    const storageKey = result.storageKey;
    const etag = result.etag;

    // Handle versioning
    let version = null;
    if (bucket.versioningEnabled) {
      // Em sistemas com versionamento, cada objeto tem seu próprio versionId (já gerado pelo UUID)
      // Aqui marcamos todos os objetos anteriores como não sendo a versão mais recente
      await S3Object.update(
        { isLatest: false },
        { where: { bucketId: bucket.id, key: key } }
      );
    } else {
      // Remove existing object if not versioned
      const existingObject = await S3Object.findOne({
        where: { bucketName, key }
      });
      
      if (existingObject) {
        await storageProvider.delete(existingObject.storageKey);
        await existingObject.destroy();
      }
    }

    // Create database record
    const s3Object = await S3Object.create({
      bucketId: bucket.id,
      bucketName,  // campo personalizado não no modelo
      key,
      size: data.length,
      etag,
      contentType: metadata.contentType || 'application/octet-stream',
      metadata: metadata.userMetadata || {},
      storagePath: `${bucketName}/${key}`,  // caminho de armazenamento
      isLatest: true,  // Esta é a versão mais recente
      ownerId: userId
    });

    // Log access
    await this._logAccess(userId, 'PUT', bucketName, key, 'SUCCESS');

    logger.info(`Object uploaded: ${bucketName}/${key} by user ${userId}`);
    
    return s3Object;
  }

  /**
   * Download object from bucket
   * @param {string} bucketName - Bucket name
   * @param {string} key - Object key
   * @param {string} userId - User ID for authorization
   * @param {string} versionId - Optional version ID
   * @returns {Promise<Object>} Object data and metadata
   */
  async downloadObject(bucketName, key, userId, versionId = null) {
    // Check if bucket exists
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
      'object',
      `${bucketName}/${key}`
    );

    if (!permissionResult || !permissionResult.allowed) {
      await this._logAccess(userId, 'GET', bucketName, key, 'DENIED');
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Find object
    const whereCondition = { bucketId: bucket.id, key };
    if (versionId) {
      whereCondition.versionId = versionId;
    } else {
      whereCondition.isLatest = true;
    }

    const s3Object = await S3Object.findOne({
      where: whereCondition
    });

    if (!s3Object) {
      await this._logAccess(userId, 'GET', bucketName, key, 'NOT_FOUND');
      throw new AppError('Object not found', 404, 'OBJECT_NOT_FOUND');
    }

    // Get storage provider
    const storageProvider = storage.getDefault();
    
    // Get physical file
    const result = await storageProvider.getObject(bucketName, key);

    // Log access
    await this._logAccess(userId, 'GET', bucketName, key, 'SUCCESS');

    return {
      stream: result.stream,
      metadata: {
        contentType: result.contentType || s3Object.contentType,
        size: result.size || s3Object.size,
        etag: result.etag || s3Object.etag,
        lastModified: result.lastModified || s3Object.updatedAt,
        userMetadata: result.metadata?.userMetadata || s3Object.metadata,
        version: s3Object.version
      }
    };
  }

  /**
   * List objects in bucket
   * @param {string} bucketName - Bucket name
   * @param {string} userId - User ID for authorization
   * @param {Object} options - List options
   * @returns {Promise<Object>} List of objects
   */
  async listObjects(bucketName, userId, options = {}) {
    // Check if bucket exists
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

    const {
      prefix = '',
      delimiter = '',
      marker = '',
      maxKeys = 1000,
      versions = false
    } = options;

    // Build where conditions
    const whereConditions = { bucketId: bucket.id };
    
    // Apenas objetos ativos se não estiver listando versões
    if (!versions) {
      whereConditions.isLatest = true;
    }
    
    if (prefix) {
      whereConditions.key = { [Op.like]: `${prefix}%` };
    }
    
    if (marker) {
      whereConditions.key = {
        ...whereConditions.key,
        [Op.gt]: marker
      };
    }      // Query objects
    const queryOptions = {
      where: whereConditions,
      limit: Math.min(parseInt(maxKeys), 1000),
      order: [['key', 'ASC']]
    };

    if (!versions) {
      // Only get latest versions
      queryOptions.attributes = [
        'key',
        'size',
        'etag',
        'contentType',
        'updatedAt'
      ];
      // Versioning é gerenciado pelo campo versionId, não version
      queryOptions.where.isLatest = true;
    }

    const objects = await S3Object.findAll(queryOptions);

    // Handle delimiter logic for hierarchical listing
    let contents = objects;
    let commonPrefixes = [];

    if (delimiter) {
      const prefixMap = new Map();
      const filteredContents = [];

      objects.forEach(obj => {
        const keyAfterPrefix = obj.key.substring(prefix.length);
        const delimiterIndex = keyAfterPrefix.indexOf(delimiter);
        
        if (delimiterIndex !== -1) {
          // This is a "folder"
          const commonPrefix = prefix + keyAfterPrefix.substring(0, delimiterIndex + 1);
          prefixMap.set(commonPrefix, true);
        } else {
          // This is a direct object
          filteredContents.push(obj);
        }
      });

      contents = filteredContents;
      commonPrefixes = Array.from(prefixMap.keys());
    }

    return {
      contents: contents.map(obj => ({
        key: obj.key,
        size: obj.size,
        etag: obj.etag,
        lastModified: obj.updatedAt,
        storageClass: 'STANDARD'
      })),
      commonPrefixes,
      isTruncated: objects.length === parseInt(maxKeys),
      nextMarker: objects.length > 0 ? objects[objects.length - 1].key : null
    };
  }

  /**
   * Delete object from bucket
   * @param {string} bucketName - Bucket name
   * @param {string} key - Object key
   * @param {string} userId - User ID for authorization
   * @param {string} versionId - Optional version ID
   * @returns {Promise<void>}
   */
  async deleteObject(bucketName, key, userId, versionId = null) {
    // Check if bucket exists
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
      'object',
      `${bucketName}/${key}`
    );

    if (!permissionResult || !permissionResult.allowed) {
      await this._logAccess(userId, 'DELETE', bucketName, key, 'DENIED');
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Find object(s) to delete
    const whereCondition = { bucketId: bucket.id, key };
    if (versionId) {
      whereCondition.versionId = versionId;
    } else {
      // Se não especificar versão, exclui apenas a mais recente
      whereCondition.isLatest = true;
    }

    const objectsToDelete = await S3Object.findAll({
      where: whereCondition
    });

    if (objectsToDelete.length === 0) {
      await this._logAccess(userId, 'DELETE', bucketName, key, 'NOT_FOUND');
      throw new AppError('Object not found', 404, 'OBJECT_NOT_FOUND');
    }

    // Get storage provider
    const storageProvider = storage.getDefault();

    // Delete physical files and database records
    for (const obj of objectsToDelete) {
      await storageProvider.deleteObject(bucketName, key);
      await obj.destroy();
    }

    // Log access
    await this._logAccess(userId, 'DELETE', bucketName, key, 'SUCCESS');

    logger.info(`Object deleted: ${bucketName}/${key} by user ${userId}`);
  }

  /**
   * Copy object
   * @param {string} sourceBucket - Source bucket name
   * @param {string} sourceKey - Source object key
   * @param {string} destBucket - Destination bucket name
   * @param {string} destKey - Destination object key
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Copied object
   */
  async copyObject(sourceBucket, sourceKey, destBucket, destKey, userId) {
    try {
      logger.info(`Copying object from ${sourceBucket}/${sourceKey} to ${destBucket}/${destKey}`);
      
      // Verificar se os buckets existem
      const sourceBucketObj = await Bucket.findOne({ where: { name: sourceBucket } });
      const destBucketObj = await Bucket.findOne({ where: { name: destBucket } });
      
      if (!sourceBucketObj) {
        throw new AppError('Source bucket not found', 404, 'SOURCE_BUCKET_NOT_FOUND');
      }
      
      if (!destBucketObj) {
        throw new AppError('Destination bucket not found', 404, 'DEST_BUCKET_NOT_FOUND');
      }
      
      // Verificar permissões
      const readPermission = await iamService.checkPermission(
        userId,
        'read',
        'object',
        `${sourceBucket}/${sourceKey}`
      );
      
      const writePermission = await iamService.checkPermission(
        userId,
        'write',
        'object',
        `${destBucket}/${destKey}`
      );
      
      if (!readPermission?.allowed) {
        throw new AppError('Access denied to source object', 403, 'ACCESS_DENIED');
      }
      
      if (!writePermission?.allowed) {
        throw new AppError('Access denied to destination', 403, 'ACCESS_DENIED');
      }
      
      // Encontrar o objeto fonte
      const sourceObj = await S3Object.findOne({
        where: {
          bucketId: sourceBucketObj.id,
          key: sourceKey,
          isLatest: true
        }
      });
      
      if (!sourceObj) {
        throw new AppError('Source object not found', 404, 'SOURCE_OBJECT_NOT_FOUND');
      }
      
      // Get storage provider
      const storageProvider = storage.getDefault();
      
      // Obter o objeto fonte do armazenamento
      const sourceData = await storageProvider.getObject(sourceBucket, sourceKey);
      
      // Criar um buffer dos dados da stream
      const chunks = [];
      for await (const chunk of sourceData.stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      
      // Upload to destination
      const copiedObject = await this.uploadObject(
        destBucket,
        destKey,
        buffer,
        {
          contentType: sourceObj.contentType,
          userMetadata: sourceObj.metadata || {}
        },
        userId
      );

      logger.info(`Object copied: ${sourceBucket}/${sourceKey} -> ${destBucket}/${destKey} by user ${userId}`);
      
      return copiedObject;
    } catch (error) {
      logger.error(`Error copying object ${sourceBucket}/${sourceKey} to ${destBucket}/${destKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get object metadata (HEAD)
   * @param {string} bucketName - Bucket name
   * @param {string} key - Object key
   * @param {string} userId - User ID for authorization
   * @param {string} versionId - Optional version ID
   * @returns {Promise<Object>} Object metadata
   */
  async getObjectMetadata(bucketName, key, userId, versionId = null) {
    // Check if bucket exists
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
      'object',
      `${bucketName}/${key}`
    );

    if (!permissionResult || !permissionResult.allowed) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Find object
    const whereCondition = { bucketId: bucket.id, key };
    if (versionId) {
      whereCondition.versionId = versionId;
    } else {
      whereCondition.isLatest = true;
    }

    const s3Object = await S3Object.findOne({
      where: whereCondition
    });

    if (!s3Object) {
      throw new AppError('Object not found', 404, 'OBJECT_NOT_FOUND');
    }

    // Debug log para diagnóstico
    logger.info(`Found object metadata for ${bucketName}/${key}: ID=${s3Object.id}, updatedAt=${s3Object.updatedAt}`);
    
    // Garantir que lastModified seja um objeto Date válido
    let lastModified = new Date();
    try {
      if (s3Object.updatedAt instanceof Date) {
        lastModified = s3Object.updatedAt;
      } else if (s3Object.updatedAt) {
        lastModified = new Date(s3Object.updatedAt);
      }
      // Verificação adicional
      if (isNaN(lastModified.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (e) {
      logger.warn(`Invalid updatedAt date for object ${bucketName}/${key}, using current date. Error: ${e.message}`);
    }

    return {
      contentType: s3Object.contentType,
      size: s3Object.size,
      etag: s3Object.etag,
      lastModified: lastModified,
      userMetadata: s3Object.metadata,
      versionId: s3Object.versionId,
      isLatest: s3Object.isLatest
    };
  }

  /**
   * Log access for audit trail
   * @private
   */
  async _logAccess(userId, action, bucketName, objectKey, status) {
    try {
      await AccessLog.create({
        userId,
        action,
        resource: `${bucketName}/${objectKey}`,
        status,
        timestamp: new Date(),
        ipAddress: null, // Will be populated by middleware
        userAgent: null  // Will be populated by middleware
      });
    } catch (error) {
      logger.error('Failed to log access:', error);
    }
  }

  /**
   * Get object ACL (Access Control List)
   * @param {string} bucketName - Bucket name
   * @param {string} key - Object key
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Object ACL
   */
  async getObjectAcl(bucketName, key, userId) {
    // Check if bucket exists
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
      'object',
      `${bucketName}/${key}`
    );

    if (!permissionResult || !permissionResult.allowed) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Find object
    const s3Object = await S3Object.findOne({
      where: { bucketId: bucket.id, key, isLatest: true }
    });

    if (!s3Object) {
      throw new AppError('Object not found', 404, 'OBJECT_NOT_FOUND');
    }

    // Log access
    await this._logAccess(userId, 'GetObjectACL', bucketName, key, 'success');

    // Return ACL - se não houver ACL definida, retornar uma ACL padrão
    const acl = s3Object.acl || {
      owner: {
        id: userId,
        displayName: 'Object Owner'
      },
      grants: [
        {
          grantee: {
            id: userId,
            displayName: 'Object Owner',
            type: 'CanonicalUser'
          },
          permission: 'FULL_CONTROL'
        }
      ]
    };

    return acl;
  }

  /**
   * Update object ACL (Access Control List)
   * @param {string} bucketName - Bucket name
   * @param {string} key - Object key
   * @param {Array} grants - ACL grants to apply
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Updated object ACL
   */
  async updateObjectAcl(bucketName, key, grants, userId) {
    // Check if bucket exists
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
      'object',
      `${bucketName}/${key}`
    );

    if (!permissionResult || !permissionResult.allowed) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Find object
    const s3Object = await S3Object.findOne({
      where: { bucketId: bucket.id, key, isLatest: true }
    });

    if (!s3Object) {
      throw new AppError('Object not found', 404, 'OBJECT_NOT_FOUND');
    }

    // Validate grants
    if (!Array.isArray(grants)) {
      throw new AppError('Invalid grants format', 400, 'INVALID_GRANTS');
    }

    // Update ACL
    const acl = {
      owner: {
        id: userId,
        displayName: 'Object Owner'
      },
      grants: grants
    };

    await s3Object.update({ acl });
    
    // Log access
    await this._logAccess(userId, 'PutObjectACL', bucketName, key, 'success');

    return acl;
  }

  /**
   * Get object tags
   * @param {string} bucketName - Bucket name
   * @param {string} key - Object key
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Object tags
   */
  async getObjectTags(bucketName, key, userId) {
    // Check if bucket exists
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
      'object',
      `${bucketName}/${key}`
    );

    if (!permissionResult || !permissionResult.allowed) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Find object
    const s3Object = await S3Object.findOne({
      where: { bucketId: bucket.id, key, isLatest: true }
    });

    if (!s3Object) {
      throw new AppError('Object not found', 404, 'OBJECT_NOT_FOUND');
    }

    // Log access
    await this._logAccess(userId, 'GetObjectTagging', bucketName, key, 'success');

    // Convert tags to tagSet format expected by S3 API
    const tags = s3Object.tags || {};
    const tagSet = Object.entries(tags).map(([key, value]) => ({
      key,
      value
    }));

    return { tagSet };
  }

  /**
   * Update object tags
   * @param {string} bucketName - Bucket name
   * @param {string} key - Object key
   * @param {Array} tagSet - Array of tag objects {key, value}
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Updated object tags
   */
  async updateObjectTags(bucketName, key, tagSet, userId) {
    // Check if bucket exists
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
      'object',
      `${bucketName}/${key}`
    );

    if (!permissionResult || !permissionResult.allowed) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Find object
    const s3Object = await S3Object.findOne({
      where: { bucketId: bucket.id, key, isLatest: true }
    });

    if (!s3Object) {
      throw new AppError('Object not found', 404, 'OBJECT_NOT_FOUND');
    }

    // Validate tagSet
    if (!Array.isArray(tagSet)) {
      throw new AppError('Invalid tagSet format', 400, 'INVALID_TAGSET');
    }

    // Convert tagSet to tags object format
    const tags = {};
    for (const tag of tagSet) {
      if (!tag.key || !tag.value) {
        throw new AppError('Invalid tag format, must include key and value', 400, 'INVALID_TAG');
      }
      tags[tag.key] = tag.value;
    }

    // Update tags
    await s3Object.update({ tags });
    
    // Log access
    await this._logAccess(userId, 'PutObjectTagging', bucketName, key, 'success');

    return { tagSet };
  }
}

module.exports = new ObjectService();
