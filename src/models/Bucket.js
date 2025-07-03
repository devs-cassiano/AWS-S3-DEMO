const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Bucket = sequelize.define('Bucket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 63],
      is: /^[a-z0-9][a-z0-9\-]*[a-z0-9]$/
    }
  },
  region: {
    type: DataTypes.STRING,
    defaultValue: 'us-east-1'
  },
  versioningEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  corsConfiguration: {
    type: DataTypes.JSON,
    allowNull: true
  },
  policy: {
    type: DataTypes.JSON,
    allowNull: true
  },
  lifecycleConfiguration: {
    type: DataTypes.JSON,
    allowNull: true
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  ownerId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'owner_id',
    comment: 'User ID from external IAM service'
  }
}, {
  tableName: 'buckets',
  indexes: [
    {
      unique: true,
      fields: ['name']
    },
    {
      fields: ['owner_id']
    }
  ]
});

module.exports = Bucket;
