const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream').promises;
const StorageProvider = require('./StorageProvider');
const logger = require('../utils/logger');

/**
 * File System Storage Provider
 * Implementa armazenamento local no sistema de arquivos
 */
class FileSystemProvider extends StorageProvider {
  constructor(options = {}) {
    super();
    this.basePath = options.basePath || './storage';
    this.ensureBasePath();
  }

  /**
   * Garante que o diretório base existe
   */
  async ensureBasePath() {
    try {
      await fs.access(this.basePath);
    } catch (error) {
      await fs.mkdir(this.basePath, { recursive: true });
      logger.info(`Created storage directory: ${this.basePath}`);
    }
  }

  /**
   * Constrói o caminho completo para um objeto
   */
  getObjectPath(bucketName, objectKey) {
    // Sanitize bucket name and object key
    const sanitizedBucket = this.sanitizePath(bucketName);
    const sanitizedKey = this.sanitizePath(objectKey);
    
    return path.join(this.basePath, sanitizedBucket, sanitizedKey);
  }

  /**
   * Constrói o caminho do diretório do bucket
   */
  getBucketPath(bucketName) {
    const sanitizedBucket = this.sanitizePath(bucketName);
    return path.join(this.basePath, sanitizedBucket);
  }

  /**
   * Sanitiza caminhos para evitar path traversal
   */
  sanitizePath(pathStr) {
    return pathStr.replace(/[<>:"|?*]/g, '_').replace(/\.\./g, '_');
  }

  /**
   * Calcula hash MD5 de dados
   */
  calculateMD5(data) {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Store an object in the filesystem
   */
  async putObject(bucketName, objectKey, data, metadata = {}) {
    try {
      const objectPath = this.getObjectPath(bucketName, objectKey);
      const objectDir = path.dirname(objectPath);
      
      // Ensure directory exists
      await fs.mkdir(objectDir, { recursive: true });

      let size = 0;
      let etag = '';

      if (Buffer.isBuffer(data)) {
        // Handle Buffer data
        await fs.writeFile(objectPath, data);
        size = data.length;
        etag = this.calculateMD5(data);
      } else if (data.readable) {
        // Handle Stream data
        const writeStream = createWriteStream(objectPath);
        const hash = crypto.createHash('md5');
        
        // Calculate size and hash while writing
        data.on('data', (chunk) => {
          size += chunk.length;
          hash.update(chunk);
        });

        await pipeline(data, writeStream);
        etag = hash.digest('hex');
      } else {
        throw new Error('Unsupported data type. Expected Buffer or Stream');
      }

      // Store metadata
      const metadataPath = `${objectPath}.meta`;
      const fullMetadata = {
        ...metadata,
        size,
        etag,
        lastModified: new Date().toISOString(),
        contentType: metadata.contentType || 'application/octet-stream'
      };

      await fs.writeFile(metadataPath, JSON.stringify(fullMetadata, null, 2));

      logger.info(`Object stored: ${bucketName}/${objectKey}`, {
        size,
        etag,
        path: objectPath
      });

      return {
        etag,
        size,
        lastModified: fullMetadata.lastModified,
        path: objectPath
      };

    } catch (error) {
      logger.error(`Failed to store object ${bucketName}/${objectKey}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve an object from filesystem
   */
  async getObject(bucketName, objectKey) {
    try {
      const objectPath = this.getObjectPath(bucketName, objectKey);
      const metadataPath = `${objectPath}.meta`;

      // Check if object exists
      await fs.access(objectPath);

      // Get metadata
      let metadata = {};
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf8');
        metadata = JSON.parse(metadataContent);
      } catch (error) {
        logger.warn(`Metadata not found for ${bucketName}/${objectKey}`);
      }

      // Create read stream
      const stream = createReadStream(objectPath);

      return {
        stream,
        metadata,
        size: metadata.size || 0,
        etag: metadata.etag || '',
        lastModified: metadata.lastModified || '',
        contentType: metadata.contentType || 'application/octet-stream'
      };

    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Object not found: ${bucketName}/${objectKey}`);
      }
      logger.error(`Failed to retrieve object ${bucketName}/${objectKey}:`, error);
      throw error;
    }
  }

  /**
   * Delete an object from filesystem
   */
  async deleteObject(bucketName, objectKey) {
    try {
      const objectPath = this.getObjectPath(bucketName, objectKey);
      const metadataPath = `${objectPath}.meta`;

      // Delete object file
      try {
        await fs.unlink(objectPath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Delete metadata file
      try {
        await fs.unlink(metadataPath);
      } catch (error) {
        // Metadata file might not exist, ignore
      }

      logger.info(`Object deleted: ${bucketName}/${objectKey}`);
      return true;

    } catch (error) {
      logger.error(`Failed to delete object ${bucketName}/${objectKey}:`, error);
      throw error;
    }
  }

  /**
   * Check if object exists
   */
  async objectExists(bucketName, objectKey) {
    try {
      const objectPath = this.getObjectPath(bucketName, objectKey);
      await fs.access(objectPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get object metadata only
   */
  async getObjectMetadata(bucketName, objectKey) {
    try {
      const objectPath = this.getObjectPath(bucketName, objectKey);
      const metadataPath = `${objectPath}.meta`;

      // Check if object exists
      await fs.access(objectPath);

      // Get metadata
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf8');
        return JSON.parse(metadataContent);
      } catch (error) {
        // If metadata file doesn't exist, get basic info from file stats
        const stats = await fs.stat(objectPath);
        return {
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          contentType: 'application/octet-stream'
        };
      }

    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Object not found: ${bucketName}/${objectKey}`);
      }
      throw error;
    }
  }

  /**
   * Copy object within filesystem
   */
  async copyObject(sourceBucket, sourceKey, destBucket, destKey) {
    try {
      const sourcePath = this.getObjectPath(sourceBucket, sourceKey);
      const destPath = this.getObjectPath(destBucket, destKey);
      const sourceMetaPath = `${sourcePath}.meta`;
      const destMetaPath = `${destPath}.meta`;

      // Ensure destination directory exists
      const destDir = path.dirname(destPath);
      await fs.mkdir(destDir, { recursive: true });

      // Copy object file
      await fs.copyFile(sourcePath, destPath);

      // Copy metadata file if exists
      try {
        await fs.copyFile(sourceMetaPath, destMetaPath);
      } catch (error) {
        // Metadata file might not exist, ignore
      }

      logger.info(`Object copied: ${sourceBucket}/${sourceKey} -> ${destBucket}/${destKey}`);
      return true;

    } catch (error) {
      logger.error(`Failed to copy object ${sourceBucket}/${sourceKey}:`, error);
      throw error;
    }
  }

  /**
   * List objects in a bucket
   */
  async listObjects(bucketName, options = {}) {
    try {
      const bucketPath = this.getBucketPath(bucketName);
      const { prefix = '', delimiter = '', maxKeys = 1000, marker = '' } = options;

      // Check if bucket directory exists
      try {
        await fs.access(bucketPath);
      } catch (error) {
        return {
          objects: [],
          isTruncated: false,
          nextMarker: null
        };
      }

      const objects = [];
      const commonPrefixes = new Set();

      const scanDirectory = async (dir, currentPrefix = '') => {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name.endsWith('.meta')) continue; // Skip metadata files

          const fullKey = currentPrefix ? `${currentPrefix}/${entry.name}` : entry.name;
          
          // Apply prefix filter
          if (prefix && !fullKey.startsWith(prefix)) continue;

          // Apply marker filter
          if (marker && fullKey <= marker) continue;

          if (entry.isDirectory()) {
            if (delimiter) {
              // If delimiter is specified, treat directories as common prefixes
              const prefixEnd = fullKey.indexOf(delimiter, prefix.length);
              if (prefixEnd !== -1) {
                commonPrefixes.add(fullKey.substring(0, prefixEnd + 1));
                continue;
              }
            }
            // Recursively scan subdirectories
            await scanDirectory(path.join(dir, entry.name), fullKey);
          } else {
            // It's a file
            if (delimiter) {
              // If delimiter is specified, treat directories as common prefixes
              const prefixEnd = fullKey.indexOf(delimiter, prefix.length);
              if (prefixEnd !== -1) {
                commonPrefixes.add(fullKey.substring(0, prefixEnd + 1));
                continue;
              }
            }

            try {
              const objectPath = path.join(dir, entry.name);
              const stats = await fs.stat(objectPath);
              
              // Try to get metadata
              let metadata = {
                contentType: 'application/octet-stream',
                etag: ''
              };

              try {
                const metadataPath = `${objectPath}.meta`;
                const metadataContent = await fs.readFile(metadataPath, 'utf8');
                metadata = { ...metadata, ...JSON.parse(metadataContent) };
              } catch (error) {
                // Metadata file doesn't exist, use defaults
              }

              objects.push({
                key: fullKey,
                size: stats.size,
                lastModified: stats.mtime.toISOString(),
                etag: metadata.etag,
                contentType: metadata.contentType
              });
            } catch (error) {
              logger.warn(`Failed to get stats for ${fullKey}:`, error);
            }
          }
        }
      };

      await scanDirectory(bucketPath);

      // Sort objects by key
      objects.sort((a, b) => a.key.localeCompare(b.key));

      const isTruncated = objects.length > maxKeys;
      const result = {
        objects: objects.slice(0, maxKeys),
        commonPrefixes: Array.from(commonPrefixes).sort(),
        isTruncated,
        nextMarker: isTruncated ? objects[maxKeys - 1].key : null
      };

      return result;

    } catch (error) {
      logger.error(`Failed to list objects in bucket ${bucketName}:`, error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(bucketName = null) {
    try {
      const targetPath = bucketName ? this.getBucketPath(bucketName) : this.basePath;
      
      let totalSize = 0;
      let objectCount = 0;

      const scanDirectory = async (dir) => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
              await scanDirectory(fullPath);
            } else if (!entry.name.endsWith('.meta')) {
              // Count only actual object files, not metadata
              const stats = await fs.stat(fullPath);
              totalSize += stats.size;
              objectCount++;
            }
          }
        } catch (error) {
          // Directory might not be accessible, skip
        }
      };

      await scanDirectory(targetPath);

      return {
        bucketName,
        objectCount,
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize)
      };

    } catch (error) {
      logger.error(`Failed to get storage stats:`, error);
      throw error;
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    // No persistent connections to clean up for filesystem
    logger.info('FileSystem storage provider cleaned up');
  }
}

module.exports = FileSystemProvider;
