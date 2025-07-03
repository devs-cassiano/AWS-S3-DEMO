const config = require('../config');
const logger = require('../utils/logger');
const StorageProvider = require('./StorageProvider');

/**
 * Storage Factory
 * Cria instâncias de provedores de storage baseado na configuração
 */
class StorageFactory {
  static create(type = null, options = {}) {
    const storageType = type || config.storage.type;
    const baseOptions = {
      basePath: options.basePath || config.storage.path,
      ...options
    };
    
    // Usamos o StorageProvider como implementação padrão
    return new StorageProvider(baseOptions);
  }

  /**
   * Get default storage provider instance
   */
  static getDefault() {
    if (!this._defaultInstance) {
      this._defaultInstance = this.create();
      logger.info(`Default storage provider created: ${config.storage.type}`);
    }
    return this._defaultInstance;
  }

  /**
   * Reset default instance (useful for testing)
   */
  static resetDefault() {
    if (this._defaultInstance) {
      this._defaultInstance.cleanup?.();
      this._defaultInstance = null;
    }
  }
}

// Storage utility functions
const StorageUtils = {
  /**
   * Validate bucket name according to S3 naming rules
   */
  validateBucketName(bucketName) {
    if (!bucketName || typeof bucketName !== 'string') {
      throw new Error('Bucket name must be a non-empty string');
    }

    if (bucketName.length < 3 || bucketName.length > 63) {
      throw new Error('Bucket name must be between 3 and 63 characters long');
    }

    // Check for valid characters (lowercase letters, numbers, dots, hyphens)
    if (!/^[a-z0-9.\-]+$/.test(bucketName)) {
      throw new Error('Bucket name can only contain lowercase letters, numbers, dots, and hyphens');
    }

    // Must start and end with letter or number
    if (!/^[a-z0-9]/.test(bucketName) || !/[a-z0-9]$/.test(bucketName)) {
      throw new Error('Bucket name must start and end with a letter or number');
    }

    // Cannot be formatted as IP address
    if (/^\d+\.\d+\.\d+\.\d+$/.test(bucketName)) {
      throw new Error('Bucket name cannot be formatted as an IP address');
    }

    // Cannot contain consecutive dots
    if (bucketName.includes('..')) {
      throw new Error('Bucket name cannot contain consecutive dots');
    }

    // Cannot contain dot followed by hyphen or vice versa
    if (bucketName.includes('.-') || bucketName.includes('-.')) {
      throw new Error('Bucket name cannot contain dot followed by hyphen or vice versa');
    }

    return true;
  },

  /**
   * Validate object key
   */
  validateObjectKey(objectKey) {
    if (!objectKey || typeof objectKey !== 'string') {
      throw new Error('Object key must be a non-empty string');
    }

    if (objectKey.length > 1024) {
      throw new Error('Object key cannot exceed 1024 characters');
    }

    // Object key cannot start with '/'
    if (objectKey.startsWith('/')) {
      throw new Error('Object key cannot start with "/"');
    }

    // Check for invalid characters (control characters)
    if (/[\x00-\x1F\x7F]/.test(objectKey)) {
      throw new Error('Object key cannot contain control characters');
    }

    return true;
  },

  /**
   * Sanitize object key for safe storage
   */
  sanitizeObjectKey(objectKey) {
    return objectKey
      .replace(/[<>:"|?*]/g, '_')  // Replace invalid filesystem characters
      .replace(/\.\./g, '_')       // Prevent path traversal
      .replace(/\/+/g, '/')        // Normalize multiple slashes
      .trim();
  },

  /**
   * Parse content type from file extension
   */
  getContentTypeFromExtension(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const mimeTypes = {
      'txt': 'text/plain',
      'html': 'text/html',
      'htm': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'xml': 'application/xml',
      'pdf': 'application/pdf',
      'zip': 'application/zip',
      'tar': 'application/x-tar',
      'gz': 'application/gzip',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  },

  /**
   * Generate ETag for object
   */
  generateETag(data) {
    const crypto = require('crypto');
    if (Buffer.isBuffer(data)) {
      return crypto.createHash('md5').update(data).digest('hex');
    }
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  },

  /**
   * Parse range header for partial content requests
   */
  parseRangeHeader(rangeHeader, contentLength) {
    if (!rangeHeader) return null;

    const ranges = [];
    const rangeMatch = rangeHeader.match(/bytes=(.+)/);
    
    if (!rangeMatch) return null;

    const rangeSpecs = rangeMatch[1].split(',');
    
    for (const spec of rangeSpecs) {
      const range = spec.trim();
      let start, end;

      if (range.startsWith('-')) {
        // Suffix range: -500 means last 500 bytes
        end = contentLength - 1;
        start = Math.max(0, contentLength - parseInt(range.substring(1)));
      } else if (range.endsWith('-')) {
        // Prefix range: 500- means from byte 500 to end
        start = parseInt(range.substring(0, range.length - 1));
        end = contentLength - 1;
      } else {
        // Complete range: 0-499
        const parts = range.split('-');
        start = parseInt(parts[0]);
        end = parseInt(parts[1]);
      }

      if (start <= end && start < contentLength) {
        ranges.push({
          start: Math.max(0, start),
          end: Math.min(contentLength - 1, end)
        });
      }
    }

    return ranges.length > 0 ? ranges : null;
  }
};

// Exportamos o módulo com métodos do StorageFactory diretamente disponíveis
// E também exportamos as classes para uso mais detalhado
module.exports = {
  getDefault: StorageFactory.getDefault.bind(StorageFactory),
  create: StorageFactory.create.bind(StorageFactory),
  resetDefault: StorageFactory.resetDefault.bind(StorageFactory),
  StorageFactory,
  StorageUtils
};
