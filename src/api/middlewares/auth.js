const JWTUtils = require('../../utils/jwt');
const logger = require('../../utils/logger');

/**
 * Authentication Middleware
 * Extrai e valida JWT tokens, identifica usuários
 */
class AuthMiddleware {
  /**
   * Middleware para autenticação obrigatória
   */
  static requireAuth(req, res, next) {
    try {
      const token = AuthMiddleware.extractToken(req);
      
      if (!token) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication token required',
          code: 'MISSING_TOKEN'
        });
      }

      // Verificar e extrair informações do usuário
      const userInfo = JWTUtils.extractUserInfo(token);
      
      if (!userInfo.id) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token: missing user ID',
          code: 'INVALID_TOKEN'
        });
      }

      // Adicionar informações do usuário à requisição
      req.user = userInfo;
      req.token = token;

      logger.info('User authenticated', {
        userId: userInfo.id,
        username: userInfo.username,
        path: req.path,
        method: req.method
      });

      next();
    } catch (error) {
      logger.warn('Authentication failed', {
        error: error.message,
        path: req.path,
        method: req.method,
        ip: req.ip
      });

      if (error.message === 'Token expired') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      } else if (error.message === 'Invalid token') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      } else {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication failed',
          code: 'AUTH_FAILED'
        });
      }
    }
  }

  /**
   * Middleware para autenticação opcional
   * Se houver token válido, adiciona user info, caso contrário continua como anônimo
   */
  static optionalAuth(req, res, next) {
    try {
      const token = AuthMiddleware.extractToken(req);
      
      if (token) {
        try {
          const userInfo = JWTUtils.extractUserInfo(token);
          req.user = userInfo;
          req.token = token;
          
          logger.info('User authenticated (optional)', {
            userId: userInfo.id,
            username: userInfo.username,
            path: req.path,
            method: req.method
          });
        } catch (tokenError) {
          // Token inválido, mas continua como anônimo
          logger.warn('Invalid token in optional auth', {
            error: tokenError.message,
            path: req.path,
            method: req.method
          });
        }
      }

      // Se não há usuário autenticado, define como anônimo
      if (!req.user) {
        req.user = {
          id: 'anonymous',
          username: 'anonymous',
          email: null,
          roles: ['anonymous'],
          scope: ''
        };
      }

      next();
    } catch (error) {
      logger.error('Optional auth middleware error', error);
      next(error);
    }
  }

  /**
   * Middleware para verificar roles específicos
   * @param {string|Array} requiredRoles - Roles necessários
   */
  static requireRoles(requiredRoles) {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userRoles = req.user.roles || [];
      const hasRequiredRole = roles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        logger.warn('Insufficient roles', {
          userId: req.user.id,
          requiredRoles: roles,
          userRoles: userRoles,
          path: req.path,
          method: req.method
        });

        return res.status(403).json({
          error: 'Forbidden',
          message: `Required roles: ${roles.join(', ')}`,
          code: 'INSUFFICIENT_ROLES'
        });
      }

      next();
    };
  }

  /**
   * Middleware para verificar scopes específicos
   * @param {string|Array} requiredScopes - Scopes necessários
   */
  static requireScopes(requiredScopes) {
    const scopes = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];
    
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userScopes = (req.user.scope || '').split(' ').filter(s => s);
      const hasRequiredScope = scopes.some(scope => userScopes.includes(scope));

      if (!hasRequiredScope) {
        logger.warn('Insufficient scopes', {
          userId: req.user.id,
          requiredScopes: scopes,
          userScopes: userScopes,
          path: req.path,
          method: req.method
        });

        return res.status(403).json({
          error: 'Forbidden',
          message: `Required scopes: ${scopes.join(', ')}`,
          code: 'INSUFFICIENT_SCOPES'
        });
      }

      next();
    };
  }

  /**
   * Extrai token do header Authorization
   * @param {Object} req - Request object
   * @returns {string|null} JWT token or null
   */
  static extractToken(req) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return null;
    }

    // Formato: "Bearer TOKEN"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Middleware para logging de requests autenticados
   */
  static logAuthenticatedRequest(req, res, next) {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      logger.info('Authenticated request completed', {
        userId: req.user?.id || 'anonymous',
        username: req.user?.username || 'anonymous',
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    });

    next();
  }

  /**
   * Middleware para adicionar headers de CORS personalizados baseados no usuário
   */
  static corsForUser(req, res, next) {
    // Adicionar headers customizados baseados no usuário se necessário
    if (req.user && req.user.id !== 'anonymous') {
      res.set('X-User-ID', req.user.id);
      res.set('X-User-Roles', (req.user.roles || []).join(','));
    }

    next();
  }
}

module.exports = {
  AuthMiddleware,
  authenticate: AuthMiddleware.requireAuth,
  optionalAuth: AuthMiddleware.optionalAuth,
  extractToken: AuthMiddleware.extractToken,
  corsForUser: AuthMiddleware.corsForUser
};
