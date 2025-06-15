import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import  publishTranslate  from '../services/publish.js';

const prisma = new PrismaClient();


export const createTranslate = async (req, res) => {
    /*
      #swagger.tags = ['Translate']
      #swagger.summary = 'Criar nova tradução'
      #swagger.description = 'Criar uma nova requisição de tradução'
      #swagger.parameters['body'] = {
            text: {
              type: 'string',
              description: 'Texto a ser traduzido',
              example: 'Hello world!'
            },
            sourceLang: {
              type: 'string',
              description: 'Idioma de origem (ISO code)',
              example: 'en'
            },
            targetLang: {
              type: 'string',
              description: 'Idioma de destino (ISO code)',
              example: 'pt'
        }
      }
      #swagger.responses[202] = {
        description: 'Requisição aceita e enfileirada',
        schema: {
          type: 'object',
          properties: {
            requestId: {
              type: 'string',
              description: 'ID único da requisição',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
          }
        }
      }
      #swagger.responses[400] = {
        description: 'Dados inválidos'
      }
      #swagger.responses[500] = {
        description: 'Erro interno do servidor'
      }
    */
    
    try {
      const { text, sourceLang, targetLang } = req.body;

      const translate = await prisma.translate.create({
        data: {
          requestId: uuidv4(),
          text,
          sourceLang: sourceLang.toLowerCase(),
          targetLang: targetLang.toLowerCase(),
          status: 'QUEUED',
          queuedAt: new Date(),
        },
      });
      
      try{
        await publishTranslate({
            requestId: translate.requestId,
            text: translate.text,
            sourceLang: translate.sourceLang,
            targetLang: translate.targetLang,
            wordCount: translate.text.split(' ').length
        });

      } catch (error) {
        console.error('Error publishing translate to queue:', error);
        await prisma.translate.update({
          where: { requestId: translate.requestId },
          data: {
            status: 'FAILED',
            errorMessage: 'Failed to publish translate to queue',
            errorCode: 'QUEUE_ERROR',
            updatedAt: new Date(),
          },
        });
        return res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to create translate request due to queue error',
          timestamp: new Date().toISOString(),
        });
      }

      // Responder ao cliente
      return res.status(202).json({
        requestId: translate.requestId,
        status: translate.status,
        message: 'Translate request has been queued for processing',
        createdAt: translate.createdAt,
      });

    } catch (error) {
      console.error('Error creating translate:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create translate request',
        timestamp: new Date().toISOString(),
      });
    }
  }

export const getTranslateStatus = async (req, res) => {
    /*
      #swagger.tags = ['Translate']
      #swagger.summary = 'Buscar status da tradução'
      #swagger.description = 'Verificar o status de uma tradução específica'
      #swagger.parameters['requestId'] = {
        in: 'path',
        description: 'ID único da requisição de tradução',
        required: true,
        type: 'string',
        example: '123e4567-e89b-12d3-a456-426614174000'
      }
      #swagger.responses[200] = {
        description: 'Status da tradução encontrado',
        schema: {
          type: 'object',
          properties: {
            requestId: { type: 'string' },
            status: { 
              type: 'string', 
              enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'] 
            },
            originalText: { type: 'string' },
            translatedText: { type: 'string' },
            sourceLang: { type: 'string' },
            targetLang: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            queuedAt: { type: 'string', format: 'date-time' },
            errorMessage: { type: 'string' },
            errorCode: { type: 'string' },
            retryCount: { type: 'number' }
          }
        }
      }
      #swagger.responses[404] = {
        description: 'Tradução não encontrada',
        schema: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
      #swagger.responses[500] = {
        description: 'Erro interno do servidor'
      }
    */

    try {
      const { requestId } = req.params;

      const translate = await prisma.translate.findUnique({
        where: { requestId },
      });

      if (!translate) {
        return res.status(404).json({
          error: 'Translate not found',
          message: `No translate found with requestId: ${requestId}`,
          timestamp: new Date().toISOString(),
        });
      }

      const response = {
        requestId: translate.requestId,
        status: translate.status,
        originalText: translate.text,
        sourceLang: translate.sourceLang,
        targetLang: translate.targetLang,
        createdAt: translate.createdAt,
        updatedAt: translate.updatedAt,
        queuedAt: translate.queuedAt,
        retryCount: translate.retryCount,
      };

      if (translate.translatedText) {
        response.translatedText = translate.translatedText;
      }

      if (translate.errorMessage) {
        response.errorMessage = translate.errorMessage;
      }

      if (translate.errorCode) {
        response.errorCode = translate.errorCode;
      }

      return res.status(200).json(response);

    } catch (error) {
      console.error('Error getting translate status:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve translate status',
        timestamp: new Date().toISOString(),
      });
    }
  }

export const getAllTranslations = async (req, res) => {
    /*
      #swagger.tags = ['Translate']
      #swagger.summary = 'Listar todas as traduções'
      #swagger.description = 'Listar todas as traduções com filtros opcionais'
      #swagger.parameters['status'] = {
        in: 'query',
        description: 'Filtrar por status',
        required: false,
        type: 'string',
        enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']
      }
      #swagger.parameters['sourceLang'] = {
        in: 'query',
        description: 'Filtrar por idioma de origem',
        required: false,
        type: 'string'
      }
      #swagger.parameters['targetLang'] = {
        in: 'query',
        description: 'Filtrar por idioma de destino',
        required: false,
        type: 'string'
      }
      #swagger.parameters['page'] = {
        in: 'query',
        description: 'Número da página',
        required: false,
        type: 'number',
        default: 1
      }
      #swagger.parameters['limit'] = {
        in: 'query',
        description: 'Itens por página',
        required: false,
        type: 'number',
        default: 10
      }
      #swagger.responses[200] = {
        description: 'Lista de traduções',
        schema: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  requestId: { type: 'string' },
                  status: { type: 'string' },
                  sourceLang: { type: 'string' },
                  targetLang: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' }
              }
            }
          }
        }
      }
    */

    try {
      const {
        status,
        sourceLang,
        targetLang,
        page = 1,
        limit = 10
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where = {};
      if (status) where.status = status;
      if (sourceLang) where.sourceLang = sourceLang;
      if (targetLang) where.targetLang = targetLang;

      const [translations, total] = await Promise.all([
        prisma.translate.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
          select: {
            requestId: true,
            status: true,
            sourceLang: true,
            targetLang: true,
            createdAt: true,
            updatedAt: true,
            retryCount: true,
          },
        }),
        prisma.translate.count({ where }),
      ]);

      return res.ok(res.hateos_list('translations', translations, Math.ceil(total / parseInt(limit))));

    } catch (error) {
      console.error('Error getting all translations:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve translations',
        timestamp: new Date().toISOString(),
      });
    }
  }

export const updateTranslateStatus = async (req, res) => {
    /*
      #swagger.tags = ['Translate']
      #swagger.summary = 'Atualizar status da tradução'
      #swagger.description = 'Atualizar o status de uma tradução (usado pelo worker)'
      #swagger.parameters['requestId'] = {
        in: 'path',
        description: 'ID único da requisição de tradução',
        required: true,
        type: 'string'
      }
      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Dados de atualização',
        required: true,
        schema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
              description: 'Novo status da tradução'
            },
            translatedText: {
              type: 'string',
              description: 'Texto traduzido (obrigatório quando status = COMPLETED)'
            },
            errorMessage: {
              type: 'string',
              description: 'Mensagem de erro (obrigatório quando status = FAILED)'
            },
            errorCode: {
              type: 'string',
              description: 'Código do erro'
            }
          },
          required: ['status']
        }
      }
    */

    try {
      const { requestId } = req.params;
      const { status, translatedText, errorMessage, errorCode } = req.body;

      const token = req.header("x-api-key");
      const existingTranslate = await prisma.translate.findUnique({
          where: { requestId: token },
      });
      if (!existingTranslate){
          return res.unauthorized();
      }

      const updateData = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'COMPLETED') {
        if (!translatedText) {
          return res.status(400).json({
            error: 'Validation failed',
            message: 'translatedText is required when status is COMPLETED',
          });
        }
        updateData.translatedText = translatedText;
      }

      if (status === 'FAILED') {
        if (!errorMessage) {
          return res.status(400).json({
            error: 'Validation failed',
            message: 'errorMessage is required when status is FAILED',
          });
        }
        updateData.errorMessage = errorMessage;
        updateData.errorCode = errorCode;
        updateData.retryCount = { increment: 1 };
      }

      // Atualizar no banco
      const updatedTranslate = await prisma.translate.update({
        where: { requestId },
        data: updateData,
      });

      console.log(`[STATUS UPDATE] ${requestId}: ${existingTranslate.status} -> ${status}`);

      return res.status(200).json({
        requestId: updatedTranslate.requestId,
        status: updatedTranslate.status,
        message: `Translate status updated to ${status}`,
        updatedAt: updatedTranslate.updatedAt,
      });

    } catch (error) {
      console.error('Error updating translate status:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update translate status',
        timestamp: new Date().toISOString(),
      });
    }
  }