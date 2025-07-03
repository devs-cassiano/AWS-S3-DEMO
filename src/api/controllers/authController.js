const logger = require('../../utils/logger');
const { IAMService } = require('../../iam/mockService');

/**
 * Validates the JWT token and returns user information
 * Token validation is handled by the authenticate middleware
 */
const validateToken = async (req, res, next) => {
  try {
    const { user } = req; // Usuário já foi validado pelo middleware authenticate

    res.json({
      status: 'success',
      data: {
        userId: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        iat: user.iat,
        exp: user.exp
      }
    });
  } catch (error) {
    logger.error('Token validation error:', error);
    next(error);
  }
};

/**
 * Gets current authenticated user information from external IAM service
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const { user } = req;

    // Buscar informações atualizadas do usuário no IAM externo
    const userInfo = await IAMService.getUserById(user.id);

    res.json({
      status: 'success',
      data: {
        ...userInfo,
        profile: {
          firstName: userInfo.firstName || '',
          lastName: userInfo.lastName || '',
          avatar: userInfo.avatar || null,
          lastLogin: userInfo.lastLogin || new Date().toISOString()
        },
        settings: {
          timezone: userInfo.timezone || 'UTC',
          language: userInfo.language || 'en-US',
          notifications: userInfo.notifications !== false
        }
      }
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    
    if (error.message === 'User not found') {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (error.message === 'User suspended') {
      return res.status(403).json({
        error: 'User account is suspended',
        code: 'USER_SUSPENDED'
      });
    }

    next(error);
  }
};

/**
 * Gets user permissions and IAM policies
 */
const getUserPermissions = async (req, res, next) => {
  try {
    const { user } = req;
    const { resource, action } = req.query;

    // Buscar permissões detalhadas do usuário no IAM
    const permissions = await IAMService.getUserPermissions(user.id, {
      resource,
      action
    });

    const policies = await IAMService.getUserPolicies(user.id);

    res.json({
      status: 'success',
      data: {
        userId: user.id,
        permissions: permissions.map(perm => ({
          action: perm.action,
          resource: perm.resource,
          effect: perm.effect || 'Allow',
          conditions: perm.conditions || {}
        })),
        policies: policies.map(policy => ({
          id: policy.id,
          name: policy.name,
          version: policy.version || '2012-10-17',
          statements: policy.statements || []
        }))
      }
    });
  } catch (error) {
    logger.error('Get user permissions error:', error);
    next(error);
  }
};

module.exports = {
  validateToken,
  getCurrentUser,
  getUserPermissions
};
