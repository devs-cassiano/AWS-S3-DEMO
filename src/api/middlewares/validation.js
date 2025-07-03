const Joi = require('joi');
const { AppError } = require('./errorHandler');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR'));
    }

    next();
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params, {
      abortEarly: false,
      allowUnknown: false
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return next(new AppError('Parameter validation failed', 400, 'PARAM_VALIDATION_ERROR'));
    }

    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query, {
      abortEarly: false,
      allowUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return next(new AppError('Query validation failed', 400, 'QUERY_VALIDATION_ERROR'));
    }

    next();
  };
};

// Common validation schemas
const commonSchemas = {
  bucketName: Joi.string()
    .min(3)
    .max(63)
    .pattern(/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/)
    .required()
    .messages({
      'string.pattern.base': 'Bucket name must start and end with a letter or number, and can contain lowercase letters, numbers, and hyphens'
    }),

  objectKey: Joi.string()
    .min(1)
    .max(1024)
    .required(),

  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(50)
  }
};

module.exports = {
  validate,
  validateParams,
  validateQuery,
  commonSchemas
};
