const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate MD5 hash
 */
const generateMD5 = (data) => {
  return crypto.createHash('md5').update(data).digest('hex');
};

/**
 * Generate SHA256 hash
 */
const generateSHA256 = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Generate ETag for S3 object
 */
const generateETag = (data) => {
  return `"${generateMD5(data)}"`;
};

/**
 * Generate UUID
 */
const generateUUID = () => {
  return uuidv4();
};

/**
 * Validate bucket name according to S3 naming rules
 */
const validateBucketName = (name) => {
  // Basic validation (more comprehensive validation should be implemented)
  const bucketNameRegex = /^[a-z0-9][a-z0-9\-]*[a-z0-9]$/;
  
  if (!name || name.length < 3 || name.length > 63) {
    return false;
  }
  
  if (!bucketNameRegex.test(name)) {
    return false;
  }
  
  // Cannot contain consecutive periods or dashes
  if (name.includes('..') || name.includes('--')) {
    return false;
  }
  
  // Cannot be formatted as an IP address
  const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  if (ipRegex.test(name)) {
    return false;
  }
  
  return true;
};

/**
 * Validate object key
 */
const validateObjectKey = (key) => {
  if (!key || key.length === 0 || key.length > 1024) {
    return false;
  }
  
  // Basic validation - in production, implement more comprehensive rules
  return true;
};

/**
 * Parse content range header
 */
const parseContentRange = (range) => {
  const match = range.match(/bytes=(\d+)-(\d*)/);
  if (!match) return null;
  
  return {
    start: parseInt(match[1]),
    end: match[2] ? parseInt(match[2]) : undefined
  };
};

/**
 * Format bytes to human readable format
 */
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Sanitize filename
 */
const sanitizeFilename = (filename) => {
  return filename.replace(/[^\w\s.-]/gi, '').trim();
};

/**
 * Get MIME type from file extension
 */
const getMimeType = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'zip': 'application/zip',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
};

module.exports = {
  generateMD5,
  generateSHA256,
  generateETag,
  generateUUID,
  validateBucketName,
  validateObjectKey,
  parseContentRange,
  formatBytes,
  sanitizeFilename,
  getMimeType
};
