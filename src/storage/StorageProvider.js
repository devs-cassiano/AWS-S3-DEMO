const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream').promises;
const logger = require('../utils/logger');

/**
 * Abstract Storage Provider Interface
 * Define a interface comum para todos os provedores de storage
 */
class StorageProvider {
  constructor(options = {}) {
    this.basePath = options.basePath || path.join(process.cwd(), 'storage');
  }

  /**
   * Store an object in the storage
   * @param {string} bucketName - Nome do bucket
   * @param {string} objectKey - Chave do objeto
   * @param {Buffer|Stream} data - Dados do objeto
   * @param {Object} metadata - Metadados do objeto
   * @returns {Promise<Object>} Storage result
   */
  async putObject(bucketName, objectKey, data, metadata = {}) {
    try {
      const storageKey = this._generateStorageKey(bucketName, objectKey);
      const objectPath = this._getObjectPath(storageKey);
      const metadataPath = `${objectPath}.meta`;
      
      // Ensure directory exists
      await this._ensureDirectory(path.dirname(objectPath));
      
      let size = 0;
      let etag = '';
      
      if (Buffer.isBuffer(data)) {
        await fs.writeFile(objectPath, data);
        size = data.length;
        etag = this._calculateHash(data);
      } else if (data.readable) {
        const writeStream = createWriteStream(objectPath);
        const hash = crypto.createHash('md5');
        
        data.on('data', (chunk) => {
          size += chunk.length;
          hash.update(chunk);
        });
        
        await pipeline(data, writeStream);
        etag = hash.digest('hex');
      } else {
        throw new Error('Unsupported data type. Expected Buffer or Stream.');
      }
      
      // Store metadata
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
        storageKey
      });
      
      return {
        etag,
        size,
        lastModified: fullMetadata.lastModified,
        storageKey
      };
    } catch (error) {
      logger.error(`Failed to store object ${bucketName}/${objectKey}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve an object from storage
   * @param {string} bucketName - Nome do bucket
   * @param {string} objectKey - Chave do objeto
   * @returns {Promise<Object>} Object data and metadata
   */
  async getObject(bucketName, objectKey) {
    try {
      const storageKey = this._generateStorageKey(bucketName, objectKey);
      const objectPath = this._getObjectPath(storageKey);
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
   * Delete an object from storage
   * @param {string} bucketName - Nome do bucket
   * @param {string} objectKey - Chave do objeto
   * @returns {Promise<boolean>} Success status
   */
  async deleteObject(bucketName, objectKey) {
    try {
      const storageKey = this._generateStorageKey(bucketName, objectKey);
      const objectPath = this._getObjectPath(storageKey);
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
        // Ignorar se o arquivo não existe
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
   * @param {string} bucketName - Nome do bucket
   * @param {string} objectKey - Chave do objeto
   * @returns {Promise<boolean>} Existence status
   */
  async objectExists(bucketName, objectKey) {
    try {
      const storageKey = this._generateStorageKey(bucketName, objectKey);
      const objectPath = this._getObjectPath(storageKey);
      await fs.access(objectPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get object metadata only
   * @param {string} bucketName - Nome do bucket
   * @param {string} objectKey - Chave do objeto
   * @returns {Promise<Object>} Object metadata
   */
  async getObjectMetadata(bucketName, objectKey) {
    try {
      const storageKey = this._generateStorageKey(bucketName, objectKey);
      const objectPath = this._getObjectPath(storageKey);
      const metadataPath = `${objectPath}.meta`;
      
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf8');
        return JSON.parse(metadataContent);
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error(`Object metadata not found: ${bucketName}/${objectKey}`);
        }
        throw error;
      }
    } catch (error) {
      logger.error(`Failed to get object metadata ${bucketName}/${objectKey}:`, error);
      throw error;
    }
  }
  
  /**
   * List objects in a bucket
   * @param {string} bucketName - Nome do bucket
   * @param {Object} options - Opções de listagem
   * @returns {Promise<Object>} List result
   */
  async listObjects(bucketName, options = {}) {
    try {
      const bucketPath = path.join(this.basePath, bucketName);
      
      // Ensure bucket directory exists
      try {
        await fs.access(bucketPath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          return { objects: [], prefixes: [] };
        }
        throw error;
      }
      
      const { prefix = '', delimiter = '/', maxKeys = 1000 } = options;
      
      // List all files recursively
      const objects = [];
      const prefixes = new Set();
      
      // Função auxiliar para listar arquivos recursivamente
      const listFilesRecursively = async (dir, currentPrefix = '') => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.join(currentPrefix, entry.name);
          
          if (entry.isDirectory()) {
            // Add as common prefix if delimiter is specified
            if (delimiter) {
              const commonPrefix = `${relativePath}${delimiter}`;
              if (commonPrefix.startsWith(prefix)) {
                prefixes.add(commonPrefix);
              }
            }
            
            // Continue recursion if no delimiter or we're collecting all objects
            if (!delimiter) {
              await listFilesRecursively(fullPath, relativePath);
            }
          } else if (!entry.name.endsWith('.meta')) {
            // It's a file, check if it matches the prefix
            if (relativePath.startsWith(prefix)) {
              try {
                const stats = await fs.stat(fullPath);
                const metadataPath = `${fullPath}.meta`;
                let metadata = {};
                
                try {
                  const metadataContent = await fs.readFile(metadataPath, 'utf8');
                  metadata = JSON.parse(metadataContent);
                } catch (error) {
                  // Metadata might not exist
                }
                
                objects.push({
                  key: relativePath,
                  size: stats.size,
                  lastModified: metadata.lastModified || stats.mtime.toISOString(),
                  etag: metadata.etag || '',
                });
              } catch (error) {
                // Skip problematic files
                logger.warn(`Error reading file ${relativePath}: ${error.message}`);
              }
            }
          }
          
          // Stop if we reached the max keys
          if (objects.length >= maxKeys) {
            break;
          }
        }
      };
      
      await listFilesRecursively(bucketPath);
      
      return {
        objects: objects.slice(0, maxKeys),
        prefixes: Array.from(prefixes),
        isTruncated: objects.length > maxKeys,
        nextMarker: objects.length > maxKeys ? objects[maxKeys - 1].key : null
      };
    } catch (error) {
      logger.error(`Failed to list objects in bucket ${bucketName}:`, error);
      throw error;
    }
  }
  
  /**
   * Create a bucket directory
   * @param {string} bucketName - Nome do bucket
   * @returns {Promise<boolean>} Success status
   */
  async createBucket(bucketName) {
    try {
      const bucketPath = path.join(this.basePath, bucketName);
      await this._ensureDirectory(bucketPath);
      logger.info(`Bucket created: ${bucketName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to create bucket ${bucketName}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a bucket directory
   * @param {string} bucketName - Nome do bucket
   * @returns {Promise<boolean>} Success status
   */
  async deleteBucket(bucketName) {
    try {
      const bucketPath = path.join(this.basePath, bucketName);
      
      // Check if bucket is empty
      const entries = await fs.readdir(bucketPath);
      if (entries.length > 0) {
        throw new Error('Cannot delete non-empty bucket');
      }
      
      await fs.rmdir(bucketPath);
      logger.info(`Bucket deleted: ${bucketName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete bucket ${bucketName}:`, error);
      throw error;
    }
  }
  
  /**
   * Generate a unique storage key for an object
   * @param {string} bucketName - Nome do bucket
   * @param {string} objectKey - Chave do objeto
   * @returns {string} Storage key
   */
  _generateStorageKey(bucketName, objectKey) {
    return path.join(bucketName, objectKey);
  }
  
  /**
   * Get full object path from storage key
   * @param {string} storageKey - Storage key
   * @returns {string} Full object path
   */
  _getObjectPath(storageKey) {
    return path.join(this.basePath, storageKey);
  }
  
  /**
   * Ensure a directory exists
   * @param {string} dir - Directory path
   */
  async _ensureDirectory(dir) {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
  
  /**
   * Calculate MD5 hash of data
   * @param {Buffer} data - Data to hash
   * @returns {string} MD5 hash
   */
  _calculateHash(data) {
    return crypto.createHash('md5').update(data).digest('hex');
  }
}

module.exports = StorageProvider;