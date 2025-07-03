# Node.js S3-like Storage Service

![Node.js](https://img.shields.io/badge/Node.js-16.x-green)
![Express](https://img.shields.io/badge/Express-4.x-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

Um serviço de armazenamento de objetos completo inspirado no Amazon S3, implementado em Node.js. Este sistema oferece uma API compatível com S3 para armazenamento, recuperação, manipulação e gerenciamento de objetos e buckets.

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades](#-funcionalidades)
- [Arquitetura](#-arquitetura)
- [Requisitos](#-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Uso](#-uso)
  - [Exemplos de API](#exemplos-de-api)
- [Testes](#-testes)
- [Documentação da API](#-documentação-da-api)
- [Contribuindo](#-contribuindo)
- [Licença](#-licença)

## 🔍 Visão Geral

Este projeto implementa um serviço de armazenamento de objetos semelhante ao Amazon S3, permitindo armazenar, recuperar, listar e excluir objetos em buckets. A implementação segue padrões MSC (Model-Service-Controller), princípios SOLID e oferece uma arquitetura escalável para ambientes de produção.

O sistema inclui funcionalidades avançadas como versionamento de objetos, controle de acesso (ACL), tagging, e integração com um serviço IAM externo para gerenciamento de permissões.

### O que é o Amazon S3?

O Amazon S3 (Simple Storage Service) é um serviço de armazenamento de objetos oferecido pela AWS que fornece escalabilidade, disponibilidade de dados, segurança e performance. É usado para armazenar e recuperar qualquer volume de dados, a qualquer momento, de qualquer lugar na web.

**Conceitos principais do S3:**

- **Buckets**: Contêineres para armazenar objetos. Cada bucket tem um nome globalmente único.
- **Objetos**: Entidades fundamentais armazenadas no S3. Consistem em dados e metadados.
- **Chaves**: Identificadores únicos para objetos dentro de um bucket.
- **Versionamento**: Mantém múltiplas versões de um objeto no mesmo bucket.
- **ACLs e Políticas**: Controlam o acesso aos recursos do S3.

## ✨ Funcionalidades

### Gestão de Buckets
- Criação, listagem e exclusão de buckets
- Configuração de políticas de acesso
- Configuração de versionamento
- Configuração CORS

### Gestão de Objetos
- Upload e download de objetos
- Upload multipart para arquivos grandes
- Listagem de objetos com filtragem e paginação
- Exclusão de objetos (com suporte a versionamento)
- Recuperação de metadados (HEAD)
- Cópia de objetos entre buckets
- Gerenciamento de ACL (Access Control Lists)
- Tagging de objetos

### Segurança
- Autenticação via JWT
- Autorização baseada em políticas IAM
- Controle de acesso granular

## 🏗 Arquitetura

O projeto segue o padrão arquitetural MSC (Model-Service-Controller) e os princípios SOLID:

```
src/
│
├── api/
│   ├── controllers/   # Controladores da API
│   ├── middlewares/   # Middlewares (autenticação, autorização, validação)
│   └── routes/        # Definições de rotas
│
├── config/            # Configurações do sistema
│
├── database/          # Configuração do banco de dados
│
├── iam/               # Serviço IAM para controle de acesso
│
├── models/            # Modelos de dados
│
├── services/          # Camada de serviço com lógica de negócios
│
├── storage/           # Provedores de armazenamento físico
│
└── utils/             # Utilitários
```

## 📋 Requisitos

- Node.js 16.x ou superior
- NPM 7.x ou superior
- PostgreSQL 12.x ou superior (ou outro banco de dados suportado pelo Sequelize)

## 🚀 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/nodejs-aws-s3-demo.git
cd nodejs-aws-s3-demo
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o banco de dados:
```bash
# Crie o banco de dados (exemplo para PostgreSQL)
createdb s3_demo

# Execute as migrações
npm run migrate
```

## ⚙️ Configuração

1. Crie um arquivo `.env` baseado no `.env.example`:
```bash
cp .env.example .env
```

2. Edite o arquivo `.env` com suas configurações:
```
# Configurações do Servidor
PORT=3000
NODE_ENV=development

# Configurações do Banco de Dados
DB_DIALECT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=s3_demo
DB_USER=postgres
DB_PASSWORD=sua-senha

# Configurações de Autenticação
JWT_SECRET=seu-segredo-jwt
JWT_EXPIRATION=24h

# Configurações de Armazenamento
STORAGE_PROVIDER=filesystem
STORAGE_PATH=/path/to/storage
```

## 🖥 Uso

### Iniciar o servidor

```bash
# Modo de desenvolvimento
npm run dev

# Modo de produção
npm start
```

### Exemplos de API

#### Autenticação
```bash
# Obter token JWT
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"username": "user", "password": "pass"}'
```

#### Buckets
```bash
# Criar bucket
curl -X POST http://localhost:3000/buckets -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d '{"name": "meu-bucket"}'

# Listar buckets
curl -X GET http://localhost:3000/buckets -H "Authorization: Bearer TOKEN"

# Excluir bucket
curl -X DELETE http://localhost:3000/buckets/meu-bucket -H "Authorization: Bearer TOKEN"
```

#### Objetos
```bash
# Upload de objeto
curl -X PUT http://localhost:3000/objects/meu-bucket/meu-arquivo.txt -H "Authorization: Bearer TOKEN" -F "file=@/caminho/para/arquivo.txt"

# Download de objeto
curl -X GET http://localhost:3000/objects/meu-bucket/meu-arquivo.txt -H "Authorization: Bearer TOKEN" -o arquivo-local.txt

# Listar objetos
curl -X GET http://localhost:3000/objects/meu-bucket -H "Authorization: Bearer TOKEN"

# Obter metadados
curl -I http://localhost:3000/objects/meu-bucket/meu-arquivo.txt -H "Authorization: Bearer TOKEN"

# Excluir objeto
curl -X DELETE http://localhost:3000/objects/meu-bucket/meu-arquivo.txt -H "Authorization: Bearer TOKEN"

# Copiar objeto
curl -X POST http://localhost:3000/objects/bucket-destino/objeto-destino -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d '{"copySource": "/bucket-origem/objeto-origem"}'
```

#### ACL (Access Control Lists)
```bash
# Obter ACL
curl -X GET http://localhost:3000/objects/meu-bucket/meu-arquivo.txt/acl -H "Authorization: Bearer TOKEN"

# Atualizar ACL
curl -X PUT http://localhost:3000/objects/meu-bucket/meu-arquivo.txt/acl -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d '{"grants": [{"grantee": {"id": "user-123", "type": "CanonicalUser"}, "permission": "READ"}]}'
```

#### Tags
```bash
# Obter tags
curl -X GET http://localhost:3000/objects/meu-bucket/meu-arquivo.txt/tagging -H "Authorization: Bearer TOKEN"

# Atualizar tags
curl -X PUT http://localhost:3000/objects/meu-bucket/meu-arquivo.txt/tagging -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d '{"tagSet": [{"key": "projeto", "value": "demo"}, {"key": "ambiente", "value": "dev"}]}'
```

## 🧪 Testes

O projeto inclui testes unitários, de integração e end-to-end:

```bash
# Executar todos os testes
npm test

# Executar testes unitários
npm run test:unit

# Executar testes de integração
npm run test:integration

# Executar testes com cobertura
npm run test:coverage
```

### Testes específicos

```bash
# Testar endpoints de objetos
node test-all-operations.js

# Testar endpoint HEAD
node test-head-endpoint.js

# Testar operação de cópia
node test-copy-object.js

# Testar ACL
node test-acl-endpoints.js

# Testar Tagging
node test-tagging-endpoints.js
```

## 📚 Documentação da API

A documentação completa da API está disponível via Swagger UI:

```
http://localhost:3000/api-docs
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

### Boas práticas
- Siga os padrões de código do projeto
- Adicione testes para novas funcionalidades
- Atualize a documentação quando necessário

## 📄 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Estrutura do Projeto

```
/src
  /api
    /controllers     # Controladores da API
    /routes         # Definição de rotas
    /middlewares    # Middlewares customizados
  /services         # Lógica de negócio
  /models          # Modelos de dados (Sequelize)
  /repositories    # Camada de acesso a dados
  /storage         # Provedores de armazenamento
  /config          # Configurações da aplicação
  /utils           # Utilitários gerais
  /jobs            # Jobs assíncronos
  /events          # Sistema de eventos
  /iam             # Integração com IAM externo
  /database        # Migrações e seeders
/tests             # Testes automatizados
/docs              # Documentação adicional
/docker            # Arquivos Docker
```

## Principais Endpoints

### Buckets
- `POST /buckets` - Criar bucket
- `GET /buckets` - Listar buckets
- `DELETE /buckets/:bucketName` - Deletar bucket
- `PUT /buckets/:bucketName/policy` - Configurar política

### Objetos
- `POST /buckets/:bucketName/objects` - Upload de objeto
- `GET /buckets/:bucketName/objects/:objectKey` - Download de objeto
- `DELETE /buckets/:bucketName/objects/:objectKey` - Deletar objeto
- `GET /buckets/:bucketName/objects` - Listar objetos

### Autenticação
- `POST /auth/login` - Login
- `POST /auth/register` - Registro
- `POST /auth/refresh` - Renovar token

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/amazing-feature`)
3. Commit suas mudanças (`git commit -m 'Add amazing feature'`)
4. Push para a branch (`git push origin feature/amazing-feature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.
