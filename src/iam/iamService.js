/**
 * IAM Service - Integração com o serviço IAM externo
 * 
 * Este serviço é responsável por integrar o sistema S3 com o serviço IAM externo,
 * verificando permissões e obtendo informações de usuários conforme Swagger do IAM.
 */

const { iamClient } = require('./iamClient');
const logger = require('../utils/logger');

class IAMService {
  constructor(client) {
    this.client = client;
  }

  /**
   * Obtém informações do usuário pelo ID
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object>} Informações do usuário
   */
  async getUserById(userId) {
    try {
      const result = await this.client.getUserById(userId);
      return result.data;
    } catch (error) {
      logger.error(`IAM Service: Failed to get user ${userId}:`, error);
      throw new Error(`Failed to get user information: ${error.message}`);
    }
  }

  /**
   * Obtém as roles associadas ao usuário
   * @param {string} userId - ID do usuário
   * @returns {Promise<Array>} Lista de roles
   */
  async getUserRoles(userId) {
    try {
      const result = await this.client.getUserRoles(userId);
      return result.data.roles;
    } catch (error) {
      logger.error(`IAM Service: Failed to get roles for user ${userId}:`, error);
      throw new Error(`Failed to get user roles: ${error.message}`);
    }
  }

  /**
   * Obtém as políticas associadas ao usuário
   * @param {string} userId - ID do usuário
   * @returns {Promise<Array>} Lista de políticas
   */
  async getUserPolicies(userId) {
    try {
      const result = await this.client.getUserPolicies(userId);
      return result.data.policies;
    } catch (error) {
      logger.error(`IAM Service: Failed to get policies for user ${userId}:`, error);
      throw new Error(`Failed to get user policies: ${error.message}`);
    }
  }

  /**
   * Verifica se o usuário tem permissão para realizar uma ação em um recurso
   * @param {string} userId - ID do usuário
   * @param {string} action - Ação a ser verificada (ex: 's3:GetObject')
   * @param {string} resource - Recurso alvo (ex: 'bucket:my-bucket/object:file.txt')
   * @param {Object} context - Contexto adicional
   * @returns {Promise<Object>} Decisão de permissão
   */
  async checkPermission(userId, action, resource, context = {}) {
    try {
      return await this.client.checkPermission(userId, action, resource, context);
    } catch (error) {
      logger.error(`IAM Service: Permission check failed:`, error);
      return {
        userId,
        action,
        resource,
        allowed: false,
        policy: null,
        reason: 'IAM service error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
const iamService = new IAMService(iamClient);

module.exports = {
  IAMService,
  iamService
};
