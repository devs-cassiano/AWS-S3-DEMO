/**
 * IAM Client - Simulação de integração com o serviço IAM externo
 * 
 * Este cliente simula chamadas HTTP para o serviço IAM externo
 * conforme especificado no Swagger do IAM (context/iam-swagger.js)
 */

const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

class IAMClient {
  constructor() {
    this.baseURL = config.iam.serviceUrl;
    this.timeout = config.iam.timeout;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Configura token de autenticação para as requisições ao IAM
   * @param {string} token - JWT token
   */
  setAuthToken(token) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return this;
  }

  /**
   * Obtém informações do usuário pelo ID
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} Informações do usuário
   */
  async getUserById(userId) {
    try {
      logger.info(`IAM Client: Getting user info for ${userId}`);
      
      // Simula uma chamada HTTP para o IAM
      // Em produção: const response = await this.client.get(`/users/${userId}`);
      
      // Dados simulados
      const users = {
        'admin-user': {
          id: 'admin-user',
          accountId: '2ef9442d-0429-4a43-87f8-6257ae7283ff',
          username: 'admin',
          email: 'admin@company.com',
          status: 'active',
          isRoot: true,
          firstName: 'Admin',
          lastName: 'User',
          arn: 'arn:aws:iam::2ef9442d-0429-4a43-87f8-6257ae7283ff:user/admin',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        },
        'admin-123': {
          id: 'admin-123',
          accountId: '2ef9442d-0429-4a43-87f8-6257ae7283ff',
          username: 'admin',
          email: 'admin@company.com',
          status: 'active',
          isRoot: true,
          firstName: 'Admin',
          lastName: 'User',
          arn: 'arn:aws:iam::2ef9442d-0429-4a43-87f8-6257ae7283ff:user/admin',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        },
        '2bff526c-82d0-4742-899c-9f5ff03ff447': {
          id: '2bff526c-82d0-4742-899c-9f5ff03ff447',
          accountId: '2ef9442d-0429-4a43-87f8-6257ae7283ff',
          username: 'admin',
          email: 'admin@company.com',
          status: 'active',
          isRoot: true,
          firstName: 'Admin',
          lastName: 'User',
          arn: 'arn:aws:iam::2ef9442d-0429-4a43-87f8-6257ae7283ff:user/admin',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        }
      };

      const user = users[userId] || {
        id: userId,
        accountId: '2ef9442d-0429-4a43-87f8-6257ae7283ff',
        username: `user-${userId.substring(0, 6)}`,
        email: `user-${userId.substring(0, 6)}@example.com`,
        status: 'active',
        isRoot: false,
        firstName: 'Standard',
        lastName: 'User',
        arn: `arn:aws:iam::2ef9442d-0429-4a43-87f8-6257ae7283ff:user/${userId}`,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      return {
        success: true,
        data: user
      };
    } catch (error) {
      logger.error(`IAM Client: Error getting user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Obtém as roles associadas ao usuário
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} Roles do usuário
   */
  async getUserRoles(userId) {
    try {
      logger.info(`IAM Client: Getting roles for user ${userId}`);
      
      // Simula uma chamada HTTP para o IAM
      // Em produção: const response = await this.client.get(`/users/${userId}/roles`);

      // Dados simulados
      const roleAssignments = {
        'admin-user': [
          {
            id: 'role-001',
            name: 'AdminRole',
            description: 'Full administrative access',
            assignedAt: '2025-01-01T00:00:00Z',
            assignedBy: 'system'
          }
        ],
        'admin-123': [
          {
            id: 'role-001',
            name: 'AdminRole',
            description: 'Full administrative access',
            assignedAt: '2025-01-01T00:00:00Z',
            assignedBy: 'system'
          }
        ],
        '2bff526c-82d0-4742-899c-9f5ff03ff447': [
          {
            id: 'role-001',
            name: 'AdminRole',
            description: 'Full administrative access',
            assignedAt: '2025-01-01T00:00:00Z',
            assignedBy: 'system'
          }
        ],
        'test-user-123': [
          {
            id: 'role-002',
            name: 'UserRole',
            description: 'Standard user access',
            assignedAt: '2025-01-01T00:00:00Z',
            assignedBy: 'admin-user'
          }
        ],
        'readonly-user': [
          {
            id: 'role-003',
            name: 'ReadOnlyRole',
            description: 'Read-only access',
            assignedAt: '2025-01-01T00:00:00Z',
            assignedBy: 'admin-user'
          }
        ]
      };

      const roles = roleAssignments[userId] || [
        {
          id: 'role-002',
          name: 'UserRole',
          description: 'Standard user access',
          assignedAt: '2025-01-01T00:00:00Z',
          assignedBy: 'system'
        }
      ];

      return {
        success: true,
        data: {
          userId,
          roles
        },
        message: 'User roles retrieved successfully'
      };
    } catch (error) {
      logger.error(`IAM Client: Error getting roles for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Obtém as policies associadas ao usuário
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} Policies do usuário
   */
  async getUserPolicies(userId) {
    try {
      logger.info(`IAM Client: Getting policies for user ${userId}`);
      
      // Simula uma chamada HTTP para o IAM
      // Em produção: const response = await this.client.get(`/users/${userId}/policies`);
      
      // Busca as roles primeiro
      const { data: { roles } } = await this.getUserRoles(userId);
      
      // Dados simulados
      const rolePolicies = {
        'AdminRole': [
          {
            id: 'policy-001',
            name: 'S3FullAccess',
            description: 'Full access to all S3 operations',
            policyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: ['s3:*'],
                  Resource: ['*']
                }
              ]
            },
            policyType: 'AWS',
            isAttachable: true
          }
        ],
        'UserRole': [
          {
            id: 'policy-002',
            name: 'S3UserAccess',
            description: 'User access to S3',
            policyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: ['s3:ListBuckets', 's3:CreateBucket'],
                  Resource: ['*']
                },
                {
                  Effect: 'Allow',
                  Action: ['s3:*'],
                  Resource: [`arn:aws:s3:::${userId}/*`]
                }
              ]
            },
            policyType: 'AWS',
            isAttachable: true
          }
        ],
        'ReadOnlyRole': [
          {
            id: 'policy-003',
            name: 'S3ReadOnly',
            description: 'Read-only access to S3',
            policyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: ['s3:GetObject', 's3:ListBuckets', 's3:ListObjects'],
                  Resource: ['*']
                }
              ]
            },
            policyType: 'AWS',
            isAttachable: true
          }
        ]
      };

      // Combinar todas as policies das roles
      const policies = [];
      roles.forEach(role => {
        const rolePolicyList = rolePolicies[role.name] || [];
        policies.push(...rolePolicyList);
      });

      // Se o usuário é admin, adicionar policy administrativa direta
      if (userId === 'admin-user' || userId === 'admin-123' || userId === '2bff526c-82d0-4742-899c-9f5ff03ff447') {
        policies.push({
          id: 'policy-direct-001',
          name: 'DirectAdminPolicy',
          description: 'Direct administrative policy',
          policyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: ['*'],
                Resource: ['*']
              }
            ]
          },
          policyType: 'Inline',
          isAttachable: false
        });
      }

      return {
        success: true,
        data: {
          userId,
          policies
        },
        message: 'User policies retrieved successfully'
      };
    } catch (error) {
      logger.error(`IAM Client: Error getting policies for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Verifica se o usuário tem permissão para realizar uma ação em um recurso
   * @param {string} userId - ID do usuário
   * @param {string} action - Ação a ser verificada
   * @param {string} resource - Recurso alvo
   * @param {Object} context - Contexto adicional
   * @returns {Promise<Object>} Decisão de permissão
   */
  async checkPermission(userId, action, resource, context = {}) {
    try {
      logger.info(`IAM Client: Checking permission for user ${userId}`, {
        action,
        resource
      });
      
      // Simula uma chamada HTTP para o IAM
      // Em produção: const response = await this.client.post('/permissions/check', {
      //   userId, action, resource, context
      // });

      // Obter políticas do usuário
      const { data: { policies } } = await this.getUserPolicies(userId);
      
      // Avaliar as políticas
      const s3Action = action.startsWith('s3:') ? action : `s3:${action}`;
      
      // Flag para controlar se a permissão foi encontrada
      let allowed = false;
      let matchedPolicy = null;
      let reason = 'No matching policy found';

      // Para usuários admin, sempre permitir
      if (userId === 'admin-user' || userId === 'admin-123' || userId === '2bff526c-82d0-4742-899c-9f5ff03ff447') {
        allowed = true;
        matchedPolicy = 'AdminPolicy';
        reason = 'Administrative access granted';
      } else {
        // Para outros usuários, verificar as policies
        for (const policy of policies) {
          for (const statement of policy.policyDocument.Statement) {
            const actionMatch = this._checkActionMatch(statement.Action, s3Action);
            const resourceMatch = this._checkResourceMatch(statement.Resource, resource, { userId });
            
            if (actionMatch && resourceMatch) {
              allowed = statement.Effect === 'Allow';
              matchedPolicy = policy.name;
              reason = allowed ? 'Permission granted by policy' : 'Permission denied by policy';
              break;
            }
          }
          
          if (matchedPolicy) break;
        }
      }

      const result = {
        allowed,
        action: s3Action,
        resource,
        policy: matchedPolicy,
        reason,
        timestamp: new Date().toISOString(),
        context
      };

      logger.info(`IAM Client: Permission check result`, result);
      
      return result;
    } catch (error) {
      logger.error(`IAM Client: Error checking permission:`, error);
      return {
        allowed: false,
        action,
        resource,
        policy: null,
        reason: 'IAM service error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Verifica se a ação da requisição corresponde à ação da política
   * @private
   */
  _checkActionMatch(policyActions, requestAction) {
    const actions = Array.isArray(policyActions) ? policyActions : [policyActions];
    
    for (const action of actions) {
      if (action === '*' || action === requestAction) {
        return true;
      }
      
      // Suporte a wildcards simples
      if (action.endsWith('*')) {
        const prefix = action.slice(0, -1);
        if (requestAction.startsWith(prefix)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Verifica se o recurso da requisição corresponde ao recurso da política
   * @private
   */
  _checkResourceMatch(policyResources, requestResource, context) {
    const resources = Array.isArray(policyResources) ? policyResources : [policyResources];
    
    for (let resource of resources) {
      // Substituir variáveis
      resource = this._substituteVariables(resource, context);
      
      if (resource === '*' || resource === requestResource) {
        return true;
      }
      
      // Suporte a wildcards simples
      if (resource.endsWith('*')) {
        const prefix = resource.slice(0, -1);
        if (requestResource.startsWith(prefix)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Substitui variáveis na policy
   * @private
   */
  _substituteVariables(str, context) {
    return str.replace(/\$\{([^}]+)\}/g, (match, variable) => {
      const parts = variable.split('.');
      let value = context;
      
      for (const part of parts) {
        if (value && typeof value === 'object') {
          value = value[part];
        } else {
          return match; // Não conseguiu resolver, mantém original
        }
      }
      
      return value || match;
    });
  }
}

// Cria e exporta uma instância singleton
const iamClient = new IAMClient();

module.exports = {
  IAMClient,
  iamClient
};
