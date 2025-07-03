/**
 * IAM Service Index
 * Exporta o cliente IAM e o serviço IAM para toda a aplicação
 */

const IAMClient = require('./iamClient');
const IAMService = require('./iamService');

// Cria e exporta a instância do cliente IAM
const iamClient = new IAMClient();

// Cria e exporta a instância do serviço IAM
const iamService = new IAMService(iamClient);

// Exporta os serviços e clientes
module.exports = {
  iamClient,
  iamService
};
