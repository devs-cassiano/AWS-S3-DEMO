const { iamService } = require('../../iam/iamService');
const logger = require('../../utils/logger');

/**
 * Authorization Middleware
 * Verifica permissões usando o serviço IAM externo via iamService
 */
class AuthorizationMiddleware {
  /**
   * Middleware para verificar permissão específica
   * @param {string} action - Ação a ser verificada (ex: 's3:GetObject')
   * @param {string|Function} resource - Recurso ou função que retorna o recurso
   */
  static requirePermission(action, resource) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        // Se for função, chama para obter o recurso dinâmico
        let targetResource = resource;
        if (typeof resource === 'function') {
          targetResource = resource(req);
        }

        // Substituir parâmetros da URL no recurso
        targetResource = AuthorizationMiddleware.substituteParams(targetResource, req.params);

        // Consultar IAM usando o serviço externo
        const decision = await iamService.checkPermission(
          req.user.id,
          action,
          targetResource,
          {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
          }
        );

        if (!decision.allowed) {
          logger.warn('Permission denied', {
            userId: req.user.id,
            action,
            resource: targetResource,
            reason: decision.reason,
            policy: decision.policy
          });

          return res.status(403).json({
            error: 'Forbidden',
            message: decision.reason || 'Permission denied',
            code: 'PERMISSION_DENIED',
            action,
            resource: targetResource
          });
        }

        // Adicionar informações de autorização à requisição
        req.authorization = {
          action,
          resource: targetResource,
          policy: decision.policy,
          decision
        };

        logger.info('Permission granted', {
          userId: req.user.id,
          action,
          resource: targetResource,
          policy: decision.policy
        });

        next();
      } catch (error) {
        logger.error('Authorization error:', error);
        
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Authorization service unavailable',
          code: 'AUTHZ_SERVICE_ERROR'
        });
      }
    };
  }

  /**
   * Middleware para verificar múltiplas permissões (OR logic)
   * @param {Array} permissions - Array de {action, resource}
   */
  static requireAnyPermission(permissions) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        let allowed = false;
        let lastDecision = null;

        // Verificar cada permissão até encontrar uma permitida
        for (const permission of permissions) {
          let targetResource = permission.resource;
          if (typeof targetResource === 'function') {
            targetResource = targetResource(req);
          }
          targetResource = AuthorizationMiddleware.substituteParams(targetResource, req.params);

          const decision = await iamService.checkPermission(
            req.user.id,
            permission.action,
            targetResource
          );

          lastDecision = decision;

          if (decision.allowed) {
            allowed = true;
            req.authorization = {
              action: permission.action,
              resource: targetResource,
              policy: decision.policy,
              decision
            };
            break;
          }
        }

        if (!allowed) {
          logger.warn('All permissions denied', {
            userId: req.user.id,
            permissions,
            lastReason: lastDecision?.reason
          });

          return res.status(403).json({
            error: 'Forbidden',
            message: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS'
          });
        }

        next();
      } catch (error) {
        logger.error('Authorization error:', error);
        
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Authorization service unavailable',
          code: 'AUTHZ_SERVICE_ERROR'
        });
      }
    };
  }

  /**
   * Middleware para verificar se usuário é dono do recurso
   * @param {string|Function} resourceOwnerField - Campo que contém o ID do dono
   */
  static requireOwnership(resourceOwnerField = 'ownerId') {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        // Se usuário é anônimo, negar acesso
        if (req.user.id === 'anonymous') {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Resource ownership verification failed',
            code: 'OWNERSHIP_REQUIRED'
          });
        }

        // Obter o ID do dono do recurso
        let ownerId;
        if (typeof resourceOwnerField === 'function') {
          ownerId = resourceOwnerField(req);
        } else if (req.resource && req.resource[resourceOwnerField]) {
          ownerId = req.resource[resourceOwnerField];
        } else if (req.params[resourceOwnerField]) {
          ownerId = req.params[resourceOwnerField];
        } else {
          // Se não conseguir determinar o dono, deixar passar para outros middlewares decidirem
          return next();
        }

        if (ownerId !== req.user.id) {
          logger.warn('Ownership verification failed', {
            userId: req.user.id,
            resourceOwnerId: ownerId,
            path: req.path
          });

          return res.status(403).json({
            error: 'Forbidden',
            message: 'You can only access your own resources',
            code: 'OWNERSHIP_DENIED'
          });
        }

        next();
      } catch (error) {
        logger.error('Ownership verification error:', error);
        next(error);
      }
    };
  }

  /**
   * Middleware para verificar permissões administrativas
   */
  static requireAdmin() {
    return AuthorizationMiddleware.requirePermission('admin:*', '*');
  }

  /**
   * Middleware que sempre permite acesso (útil para endpoints públicos)
   */
  static allowAll(req, res, next) {
    req.authorization = {
      action: 'public:access',
      resource: '*',
      policy: 'public-access',
      decision: { allowed: true, reason: 'Public access' }
    };
    next();
  }

  /**
   * Middleware para logging de decisões de autorização
   */
  static logAuthorizationDecision(req, res, next) {
    res.on('finish', () => {
      if (req.authorization) {
        logger.info('Authorization decision logged', {
          userId: req.user?.id || 'anonymous',
          action: req.authorization.action,
          resource: req.authorization.resource,
          allowed: req.authorization.decision?.allowed || false,
          policy: req.authorization.policy,
          statusCode: res.statusCode,
          method: req.method,
          path: req.path
        });
      }
    });

    next();
  }

  /**
   * Substitui parâmetros no recurso
   * @param {string} resource - String do recurso com placeholders
   * @param {Object} params - Parâmetros da URL
   * @returns {string} Recurso com parâmetros substituídos
   */
  static substituteParams(resource, params) {
    let result = resource;
    
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`:${key}`, 'g'), value);
    }
    
    return result;
  }

  /**
   * Helper para criar verificador de permissão de bucket
   * @param {string} action - Ação do S3
   */
  static s3BucketPermission(action) {
    return AuthorizationMiddleware.requirePermission(
      action,
      (req) => `bucket:${req.params.bucketName}`
    );
  }

  /**
   * Helper para criar verificador de permissão de objeto
   * @param {string} action - Ação do S3
   */
  static s3ObjectPermission(action) {
    return AuthorizationMiddleware.requirePermission(
      action,
      (req) => `bucket:${req.params.bucketName}/object:${req.params.objectKey || '*'}`
    );
  }
}

module.exports = {
  AuthorizationMiddleware,
  authorize: AuthorizationMiddleware.requirePermission,
  s3BucketPermission: AuthorizationMiddleware.s3BucketPermission,
  s3ObjectPermission: AuthorizationMiddleware.s3ObjectPermission
};
