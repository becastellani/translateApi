# Sistema de Tradução Assíncrona

Sistema distribuído de tradução de textos com comunicação assíncrona através de filas de mensagens, composto por uma API REST e um serviço worker para processamento em background.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Execução](#instalação-e-execução)
- [Endpoints da API](#endpoints-da-api)
- [Status de Tradução](#status-de-tradução)
- [Exemplos de Uso](#exemplos-de-uso)
- [Monitoramento](#monitoramento)
- [Estrutura do Projeto](#estrutura-do-projeto)

## 🎯 Visão Geral

O sistema permite traduzir textos de forma assíncrona, onde:

1. **API REST** recebe requisições de tradução e as envia para uma fila
2. **Worker Service** processa as traduções em background
3. **Banco de dados** armazena o estado das requisições
4. **Sistema de filas** gerencia a comunicação assíncrona

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Cliente       │───▶│ Translation  │───▶│  Fila de        │
│                 │    │ API          │    │  Mensagens      │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │                       │
                              ▼                       ▼
                       ┌──────────────┐    ┌─────────────────┐
                       │  Banco de    │◀───│  Translation    │
                       │  Dados       │    │  Worker         │
                       └──────────────┘    └─────────────────┘
```

### Componentes:

- **Translation API**: API REST que recebe requisições e gerencia status
- **Translation Worker**: Serviço que processa traduções em background
- **Message Queue**: Sistema de filas para comunicação assíncrona
- **Database**: Armazenamento persistente dos dados

## 🛠️ Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Prisma** - ORM para banco de dados
- **RabbitMQ** - Sistema de filas de mensagens
- **PostgreSQL** - Banco de dados relacional
- **Docker & Docker Compose** - Containerização
- **Swagger** - Documentação da API

## 📋 Pré-requisitos

- Docker
- Docker Compose

## 🚀 Instalação e Execução

### Execução com Docker (Recomendado)

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd translation-system
```

2. Execute o sistema completo:
```bash
docker compose up -d --build
```

Isso irá inicializar:
- API REST na porta 3000
- Worker service em background
- PostgreSQL na porta 5432
- RabbitMQ na porta 5672
- Interface do RabbitMQ na porta 15672

3. Acesse a documentação da API:
```
http://localhost:3000/api-docs
```

## 📚 Endpoints da API

### POST /api/translate
Cria uma nova requisição de tradução.

**Request Body:**
```json
{
  "text": "Hello world!",
  "sourceLang": "en",
  "targetLang": "pt"
}
```

**Response (202 Accepted):**
```json
{
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "QUEUED",
  "message": "Translate request has been queued for processing",
  "createdAt": "2025-06-15T10:30:00.000Z"
}
```

### GET /api/translate/:requestId
Consulta o status de uma tradução específica.

**Response (200 OK):**
```json
{
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "COMPLETED",
  "originalText": "Hello world!",
  "translatedText": "Olá mundo!",
  "sourceLang": "en",
  "targetLang": "pt",
  "createdAt": "2025-06-15T10:30:00.000Z",
  "updatedAt": "2025-06-15T10:30:05.000Z",
  "queuedAt": "2025-06-15T10:30:00.000Z",
  "retryCount": 0
}
```

### GET /api/translate
Lista todas as traduções com filtros opcionais.

**Query Parameters:**
- `status` - Filtrar por status (QUEUED, PROCESSING, COMPLETED, FAILED, CANCELLED)
- `sourceLang` - Filtrar por idioma de origem
- `targetLang` - Filtrar por idioma de destino
- `page` - Número da página (padrão: 1)
- `limit` - Itens por página (padrão: 10)

### PUT /api/translate/:requestId/status
Atualiza o status de uma tradução (usado internamente pelo worker).

## 📊 Status de Tradução

| Status | Descrição |
|--------|-----------|
| `QUEUED` | Requisição enfileirada, aguardando processamento |
| `PROCESSING` | Tradução sendo processada pelo worker |
| `COMPLETED` | Tradução concluída com sucesso |
| `FAILED` | Falha no processamento da tradução |
| `CANCELLED` | Requisição cancelada |

## 💡 Exemplos de Uso

### Criar uma tradução
```bash
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, how are you?",
    "sourceLang": "en",
    "targetLang": "pt"
  }'
```

### Verificar status da tradução
```bash
curl http://localhost:3000/api/translate/123e4567-e89b-12d3-a456-426614174000
```

### Listar traduções por status
```bash
curl "http://localhost:3000/api/translate?status=COMPLETED&page=1&limit=5"
```

## 📁 Estrutura do Projeto

```
translation-system/
├── translation-api/          # API REST
│   ├── src/
│   │   ├── controllers/       # Controladores da API
│   │   ├── services/          # Serviços (publicação na fila)
│   │   └── routes/           # Rotas da API
│   ├── prisma/               # Schema e migrações do banco
│   └── package.json
├── translation-worker/        # Serviço worker
│   ├── src/
│   │   ├── services/         # Serviços de tradução
│   │   └── consumer/         # Consumidor da fila
│   └── package.json
├── docker-compose.yml        # Configuração dos serviços
└── README.md
```

## 🔧 Monitoramento

### RabbitMQ Management
Acesse o painel de controle do RabbitMQ:
- URL: http://localhost:15672
- Usuário: guest
- Senha: guest

## 🛡️ Tratamento de Erros

O sistema implementa tratamento robusto de erros:

- **Validação de entrada**: Campos obrigatórios e formatos válidos
- **Retry automático**: Tentativas automáticas em caso de falha
- **Dead letter queue**: Mensagens com falha persistente são isoladas
- **Logging detalhado**: Rastreamento completo de erros

## 🔄 Fluxo de Processamento

1. Cliente envia requisição POST para `/api/translate`
2. API gera UUID único e salva no banco com status `QUEUED`
3. Mensagem é publicada na fila RabbitMQ
4. Worker consome mensagem e atualiza status para `PROCESSING`
5. Worker realiza tradução usando serviço externo
6. Status é atualizado para `COMPLETED` ou `FAILED`
7. Cliente pode consultar resultado via GET `/api/translate/:requestId`

## 📈 Considerações de Performance

- **Processamento assíncrono**: Não bloqueia a API
- **Escalabilidade horizontal**: Múltiplos workers podem ser executados
- **Persistência**: Estados salvos no banco garantem durabilidade
- **Rate limiting**: Controle de taxa de requisições (se configurado)

---

<!-- B.M.Castellani - 2025 -->
**Desenvolvido como projeto acadêmico de sistemas distribuídos e comunicação assíncrona.**
