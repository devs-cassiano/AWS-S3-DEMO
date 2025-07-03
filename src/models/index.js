const Bucket = require('./Bucket');
const S3Object = require('./S3Object');
const AccessLog = require('./AccessLog');

// NOTE: User data comes from external IAM service, not stored locally
// We only store user IDs as strings in our models

// Object to Bucket association
S3Object.belongsTo(Bucket, {
  foreignKey: 'bucketName',
  targetKey: 'name',
  as: 'bucket'
});

// Bucket to Objects association
Bucket.hasMany(S3Object, {
  foreignKey: 'bucketName',
  sourceKey: 'name',
  as: 'objects'
});

module.exports = {
  Bucket,
  S3Object,
  AccessLog
};
