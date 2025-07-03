const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

// Adicionamos o campo bucketName para compatibilidade com código existente
const S3Object = sequelize.define('S3Object', {
  bucketName: {
    type: DataTypes.VIRTUAL,
    allowNull: true,
    get() {
      return this.getDataValue('_bucketName');
    },
    set(val) {
      this.setDataValue('_bucketName', val);
    }
  },
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 1024]
    }
  },
  bucketId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'bucket_id',
    references: {
      model: 'buckets',
      key: 'id'
    }
  },
  versionId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    field: 'version_id'
  },
  isLatest: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_latest'
  },
  size: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0
  },
  contentType: {
    type: DataTypes.STRING,
    defaultValue: 'application/octet-stream',
    field: 'content_type'
  },
  etag: {
    type: DataTypes.STRING,
    allowNull: false
  },
  storageClass: {
    type: DataTypes.ENUM('STANDARD', 'REDUCED_REDUNDANCY', 'GLACIER', 'DEEP_ARCHIVE'),
    defaultValue: 'STANDARD',
    field: 'storage_class'
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  acl: {
    type: DataTypes.JSON,
    allowNull: true
  },
  storagePath: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'storage_path'
  },
  checksumMd5: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'checksum_md5'
  },
  checksumSha256: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'checksum_sha256'
  },
  ownerId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'owner_id',
    comment: 'User ID from external IAM service'
  },
  uploadId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'upload_id'
  },
  isMultipart: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_multipart'
  },
  isComplete: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_complete'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
  }
}, {
  tableName: 's3_objects',
  indexes: [
    {
      fields: ['bucket_id', 'key']
    },
    {
      fields: ['bucket_id', 'key', 'version_id']
    },
    {
      fields: ['owner_id']
    },
    {
      fields: ['upload_id']
    },
    {
      fields: ['is_latest']
    },
    {
      fields: ['expires_at']
    }
  ]
});

module.exports = S3Object;
