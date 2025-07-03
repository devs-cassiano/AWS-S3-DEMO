const { BucketService } = require('../../services');
const logger = require('../../utils/logger');

const createBucket = async (req, res, next) => {
  try {
    const bucketData = req.body;
    const { user } = req;

    const bucket = await BucketService.createBucket(bucketData, user.id);

    res.status(201).json({
      status: 'success',
      data: bucket
    });
  } catch (error) {
    logger.error('Create bucket error:', error);
    next(error);
  }
};

const listBuckets = async (req, res, next) => {
  try {
    const { user } = req;
    const options = req.query;

    const result = await BucketService.listBuckets(user.id, options);

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    logger.error('List buckets error:', error);
    next(error);
  }
};

const getBucket = async (req, res, next) => {
  try {
    const { bucketName } = req.params;
    const { user } = req;

    const bucket = await BucketService.getBucket(bucketName, user.id);

    res.json({
      status: 'success',
      data: bucket
    });
  } catch (error) {
    logger.error('Get bucket error:', error);
    next(error);
  }
};

const deleteBucket = async (req, res, next) => {
  try {
    const { bucketName } = req.params;
    const { user } = req;

    await BucketService.deleteBucket(bucketName, user.id);

    res.status(204).send();
  } catch (error) {
    logger.error('Delete bucket error:', error);
    next(error);
  }
};

const updatePolicy = async (req, res, next) => {
  try {
    const { bucketName } = req.params;
    const { policy } = req.body;
    const { user } = req;

    const bucket = await BucketService.updateBucketPolicy(bucketName, policy, user.id);

    res.json({
      status: 'success',
      data: bucket
    });
  } catch (error) {
    logger.error('Update bucket policy error:', error);
    next(error);
  }
};

const updateVersioning = async (req, res, next) => {
  try {
    const { bucketName } = req.params;
    const { enabled } = req.body;
    const { user } = req;

    const bucket = await BucketService.updateBucketVersioning(bucketName, enabled, user.id);

    res.json({
      status: 'success',
      data: bucket
    });
  } catch (error) {
    logger.error('Update bucket versioning error:', error);
    next(error);
  }
};

const updateCors = async (req, res, next) => {
  try {
    const { bucketName } = req.params;
    const { corsConfiguration } = req.body;
    const { user } = req;

    const bucket = await BucketService.updateBucketCors(bucketName, corsConfiguration, user.id);

    res.json({
      status: 'success',
      data: bucket
    });
  } catch (error) {
    logger.error('Update bucket CORS error:', error);
    next(error);
  }
};

const getPolicy = async (req, res, next) => {
  try {
    const { bucketName } = req.params;
    const { user } = req;

    const policy = await BucketService.getBucketPolicy(bucketName, user.id);

    res.json({
      status: 'success',
      data: policy
    });
  } catch (error) {
    logger.error('Get bucket policy error:', error);
    next(error);
  }
};

const deletePolicy = async (req, res, next) => {
  try {
    const { bucketName } = req.params;
    const { user } = req;

    await BucketService.deleteBucketPolicy(bucketName, user.id);

    res.status(204).send();
  } catch (error) {
    logger.error('Delete bucket policy error:', error);
    next(error);
  }
};

const getVersioning = async (req, res, next) => {
  try {
    const { bucketName } = req.params;
    const { user } = req;

    const versioning = await BucketService.getBucketVersioning(bucketName, user.id);

    res.json({
      status: 'success',
      data: versioning
    });
  } catch (error) {
    logger.error('Get bucket versioning error:', error);
    next(error);
  }
};

const getCors = async (req, res, next) => {
  try {
    const { bucketName } = req.params;
    const { user } = req;

    const cors = await BucketService.getBucketCors(bucketName, user.id);

    res.json({
      status: 'success',
      data: cors
    });
  } catch (error) {
    logger.error('Get bucket CORS error:', error);
    next(error);
  }
};

const deleteCors = async (req, res, next) => {
  try {
    const { bucketName } = req.params;
    const { user } = req;

    await BucketService.deleteBucketCors(bucketName, user.id);

    res.status(204).send();
  } catch (error) {
    logger.error('Delete bucket CORS error:', error);
    next(error);
  }
};

module.exports = {
  createBucket,
  listBuckets,
  getBucket,
  deleteBucket,
  updatePolicy,
  updateVersioning,
  updateCors,
  getPolicy,
  deletePolicy,
  getVersioning,
  getCors,
  deleteCors
};
