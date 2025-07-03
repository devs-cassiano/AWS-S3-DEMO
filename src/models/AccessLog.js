const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const AccessLog = sequelize.define('AccessLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'user_id',
    comment: 'User ID from external IAM service (null for anonymous access)'
  },
  bucketId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'bucket_id',
    references: {
      model: 'buckets',
      key: 'id'
    }
  },
  objectId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'object_id',
    references: {
      model: 's3_objects',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  resource: {
    type: DataTypes.STRING,
    allowNull: false
  },
  httpMethod: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'http_method'
  },
  httpStatus: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'http_status'
  },
  ipAddress: {
    type: DataTypes.INET,
    allowNull: true,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  requestId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'request_id'
  },
  responseTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'response_time'
  },
  bytesTransferred: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    field: 'bytes_transferred'
  },
  policy: {
    type: DataTypes.JSON,
    allowNull: true
  },
  allowed: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  errorCode: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'error_code'
  }
}, {
  tableName: 'access_logs',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['bucket_id']
    },
    {
      fields: ['action']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['allowed']
    }
  ]
});

module.exports = AccessLog;
