const { ObjectService } = require('../../services');
const logger = require('../../utils/logger');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

const uploadObject = async (req, res, next) => {
  try {
    const { bucketName, key } = req.params;
    const { user } = req;
    
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file provided'
      });
    }

    const metadata = {
      contentType: req.file.mimetype,
      userMetadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
    };

    const s3Object = await ObjectService.uploadObject(
      bucketName, 
      key, 
      req.file.buffer, 
      metadata, 
      user.id
    );

    res.status(201).json({
      status: 'success',
      data: s3Object
    });
  } catch (error) {
    logger.error('Upload object error:', error);
    next(error);
  }
};

const downloadObject = async (req, res, next) => {
  try {
    const { bucketName, key } = req.params;
    const { versionId } = req.query;
    const { user } = req;

    const result = await ObjectService.downloadObject(bucketName, key, user.id, versionId);

    const headers = {
      'Content-Type': result.metadata.contentType,
      'Content-Length': result.metadata.size,
      'ETag': `"${result.metadata.etag}"`
    };
    
    // Safely handle lastModified
    if (result.metadata.lastModified && result.metadata.lastModified instanceof Date) {
      headers['Last-Modified'] = result.metadata.lastModified.toUTCString();
    } else if (result.metadata.lastModified) {
      try {
        headers['Last-Modified'] = new Date(result.metadata.lastModified).toUTCString();
      } catch (e) {
        logger.warn(`Invalid lastModified value for ${bucketName}/${key}`);
      }
    }
    
    // Add version ID if available
    if (result.metadata.version) {
      headers['x-amz-version-id'] = result.metadata.version;
    }
    
    res.set(headers);

    // Set user metadata headers
    Object.entries(result.metadata.userMetadata || {}).forEach(([key, value]) => {
      res.set(`x-amz-meta-${key}`, value);
    });

    // Pipe the stream directly to the response
    result.stream.pipe(res);
  } catch (error) {
    logger.error('Download object error:', error);
    next(error);
  }
};

const listObjects = async (req, res, next) => {
  try {
    const { bucketName } = req.params;
    const { user } = req;
    const options = req.query;

    const result = await ObjectService.listObjects(bucketName, user.id, options);

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    logger.error('List objects error:', error);
    next(error);
  }
};

const deleteObject = async (req, res, next) => {
  try {
    const { bucketName, key } = req.params;
    const { versionId } = req.query;
    const { user } = req;

    await ObjectService.deleteObject(bucketName, key, user.id, versionId);

    res.status(204).send();
  } catch (error) {
    logger.error('Delete object error:', error);
    next(error);
  }
};

const copyObject = async (req, res, next) => {
  try {
    const { bucketName, key } = req.params;
    const { copySource } = req.body;
    const { user } = req;

    // Log para diagnóstico
    logger.info(`Copy request to ${bucketName}/${key} from source ${copySource}`);

    if (!copySource) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameter: copySource'
      });
    }

    // Parse copy source (format: /sourceBucket/sourceKey)
    const match = copySource.match(/^\/([^\/]+)\/(.+)$/);
    if (!match) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid copy source format. Should be /sourceBucket/sourceKey'
      });
    }

    const [, sourceBucket, sourceKey] = match;
    
    // Validação adicional
    if (sourceBucket === bucketName && sourceKey === key) {
      return res.status(400).json({
        status: 'error',
        message: 'Source and destination cannot be the same'
      });
    }

    const copiedObject = await ObjectService.copyObject(
      sourceBucket, 
      sourceKey, 
      bucketName, 
      key, 
      user.id
    );

    res.status(201).json({
      status: 'success',
      data: copiedObject
    });
  } catch (error) {
    logger.error('Copy object error:', error);
    next(error);
  }
};

const getObjectMetadata = async (req, res, next) => {
  try {
    const { bucketName, key } = req.params;
    const { versionId } = req.query;
    const { user } = req;

    // Log para diagnóstico
    logger.info(`HEAD request for ${bucketName}/${key} (versionId: ${versionId || 'latest'}, userId: ${user.id})`);

    // Imprimir informações do request para debug
    console.log('=== DEBUG HEAD REQUEST ===');
    console.log(`Bucket: ${bucketName}`);
    console.log(`Key: ${key}`);
    console.log(`UserId: ${user.id}`);
    console.log(`VersionId: ${versionId || 'null'}`);

    // Obter metadados do objeto
    const metadata = await ObjectService.getObjectMetadata(bucketName, key, user.id, versionId);
    
    // Imprimir os metadados obtidos
    console.log('=== DEBUG METADATA ===');
    console.log(JSON.stringify(metadata, null, 2));
    
    // Debug específico para lastModified
    console.log('=== DEBUG LAST MODIFIED ===');
    console.log('Type:', typeof metadata.lastModified);
    console.log('Value:', metadata.lastModified);
    console.log('Is Date?', metadata.lastModified instanceof Date);
    
    if (metadata.lastModified) {
      try {
        console.log('toUTCString():', metadata.lastModified.toUTCString());
      } catch (e) {
        console.error('Erro ao chamar toUTCString():', e.message);
      }
    }

    // Configurar cabeçalhos HTTP
    const headers = {
      'Content-Type': metadata.contentType || 'application/octet-stream',
      'Content-Length': metadata.size.toString(),
      'ETag': `"${metadata.etag}"`
    };
    
    // Verificar se lastModified é um objeto Date válido antes de chamar toUTCString
    try {
      // Adiciona data de modificação de forma segura
      if (metadata.lastModified && metadata.lastModified instanceof Date) {
        headers['Last-Modified'] = metadata.lastModified.toUTCString();
      } else if (metadata.lastModified) {
        const date = new Date(metadata.lastModified);
        headers['Last-Modified'] = date.toUTCString();
      } else {
        // Se não houver lastModified, usa a data atual
        headers['Last-Modified'] = new Date().toUTCString();
      }
    } catch (e) {
      logger.warn(`Invalid lastModified value for ${bucketName}/${key}: ${metadata.lastModified}`);
      headers['Last-Modified'] = new Date().toUTCString();
    }

    // Adicionar cabeçalhos de versionamento
    if (metadata.versionId) {
      headers['x-amz-version-id'] = metadata.versionId;
    }
    
    if (metadata.isLatest !== undefined) {
      headers['x-amz-version-status'] = metadata.isLatest ? 'latest' : 'previous';
    }

    // Configurar cabeçalhos para a resposta
    Object.entries(headers).forEach(([key, value]) => {
      res.set(key, value);
    });

    // Adicionar metadados do usuário como cabeçalhos
    if (metadata.userMetadata && typeof metadata.userMetadata === 'object') {
      Object.entries(metadata.userMetadata).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          res.set(`x-amz-meta-${key}`, value.toString());
        }
      });
    }

    // Resposta sem corpo para HEAD request
    logger.info(`Metadata headers set successfully for ${bucketName}/${key}`);
    res.status(200).send();
  } catch (error) {
    logger.error(`Get object metadata error for ${req.params.bucketName}/${req.params.key}:`, error);
    next(error);
  }
};

const initiateMultipartUpload = async (req, res, next) => {
  try {
    const { bucketName } = req.params;
    const { key } = req.query;
    const { user } = req;

    const uploadData = await ObjectService.initiateMultipartUpload(bucketName, key, user.id);

    res.json({
      status: 'success',
      data: uploadData
    });
  } catch (error) {
    logger.error('Initiate multipart upload error:', error);
    next(error);
  }
};

const getObjectAcl = async (req, res, next) => {
  try {
    const { bucketName, key } = req.params;
    const { user } = req;

    const acl = await ObjectService.getObjectAcl(bucketName, key, user.id);

    res.json({
      status: 'success',
      data: acl
    });
  } catch (error) {
    logger.error('Get object ACL error:', error);
    next(error);
  }
};

const updateObjectAcl = async (req, res, next) => {
  try {
    const { bucketName, key } = req.params;
    const { grants } = req.body;
    const { user } = req;

    const acl = await ObjectService.updateObjectAcl(bucketName, key, grants, user.id);

    res.json({
      status: 'success',
      data: acl
    });
  } catch (error) {
    logger.error('Update object ACL error:', error);
    next(error);
  }
};

const getObjectTags = async (req, res, next) => {
  try {
    const { bucketName, key } = req.params;
    const { user } = req;

    const tags = await ObjectService.getObjectTags(bucketName, key, user.id);

    res.json({
      status: 'success',
      data: tags
    });
  } catch (error) {
    logger.error('Get object tags error:', error);
    next(error);
  }
};

const updateObjectTags = async (req, res, next) => {
  try {
    const { bucketName, key } = req.params;
    const { tagSet } = req.body;
    const { user } = req;

    const tags = await ObjectService.updateObjectTags(bucketName, key, tagSet, user.id);

    res.json({
      status: 'success',
      data: tags
    });
  } catch (error) {
    logger.error('Update object tags error:', error);
    next(error);
  }
};

module.exports = {
  uploadObject,
  downloadObject,
  listObjects,
  deleteObject,
  copyObject,
  getObjectMetadata,
  initiateMultipartUpload,
  getObjectAcl,
  updateObjectAcl,
  getObjectTags,
  updateObjectTags,
  upload
};
