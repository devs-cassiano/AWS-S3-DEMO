/**
 * Script para garantir que os diretórios de armazenamento existam
 * Este script é executado durante a inicialização do aplicativo
 */
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Garante que um diretório exista, criando-o se necessário
 * @param {string} dirPath - Caminho do diretório
 */
function ensureDirectoryExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`Diretório criado: ${dirPath}`);
    } else {
      logger.debug(`Diretório já existe: ${dirPath}`);
    }
  } catch (error) {
    logger.error(`Erro ao criar diretório ${dirPath}: ${error.message}`);
    throw error;
  }
}

/**
 * Inicializa os diretórios de armazenamento necessários para a aplicação
 */
function initializeStorageDirs() {
  const rootDir = path.resolve(__dirname, '../../');
  
  // Diretório de armazenamento principal
  const storageDir = path.join(rootDir, 'storage');
  ensureDirectoryExists(storageDir);
  
  // Diretório de buckets
  const bucketsDir = path.join(storageDir, 'buckets');
  ensureDirectoryExists(bucketsDir);
  
  // Outros diretórios necessários podem ser adicionados aqui
  const tempDir = path.join(storageDir, 'temp');
  ensureDirectoryExists(tempDir);
  
  logger.info('Diretórios de armazenamento inicializados com sucesso');
  return {
    storageDir,
    bucketsDir,
    tempDir
  };
}

module.exports = initializeStorageDirs;
