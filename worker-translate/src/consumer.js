import amqp from 'amqplib';
import dotenv from 'dotenv';
import colors from 'colors';
import connection from './services/connection.js';
import { translateTextRobust } from './services/translateService.js';

dotenv.config();

const queue = 'translateQueue';
const exchange = 'translateExchange';
const routingKey = 'translateQueue';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4040/api';
const API_TOKEN = process.env.API_TOKEN;

async function updateTranslateStatusAPI(requestId, status, data = {}) {
    const updateData = {
        status,
        ...data
    };

    const headers = {
        'x-api-key': requestId,
        'Content-Type': 'application/json'
    };


    const url = `${API_BASE_URL}/translate/${requestId}/status`;
    console.log(colors.cyan(`🔗 Calling API: ${url}`));
    console.log(colors.cyan(`📤 Payload:`, JSON.stringify(updateData)));

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify(updateData)
        });

        console.log(colors.cyan(`Response status: ${response.status}`));

        if (!response.ok) {
            const responseText = await response.text();
            console.log(colors.red(`Response body: ${responseText}`));
            
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch {
                errorData = { message: responseText };
            }
            
            throw new Error(`API Error: ${response.status} - ${errorData.message || responseText}`);
        }

        const result = await response.json();
        console.log(colors.green(`✅ API Response:`, JSON.stringify(result)));
        return result;
        
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error(`Network error: Cannot connect to ${url}. Is the API server running?`);
        }
        throw error;
    }
}

async function processTranslate(translateMessage) {
    const { correlationId, data } = translateMessage;
    const { text, sourceLang, targetLang } = data;
    
    // O requestId agora vem no correlationId
    const requestId = correlationId;

    console.log(colors.blue(`🔄 Processing translate: ${requestId}`));
    console.log(colors.cyan(`📝 Text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`));
    console.log(colors.cyan(`🌍 ${sourceLang} → ${targetLang}`));
    
    try {
        // Atualizar status para PROCESSING via API
        await updateTranslateStatusAPI(requestId, 'PROCESSING');
        console.log(colors.yellow(`⏳ Status updated to PROCESSING for: ${requestId}`));
        
        // Realizar a tradução usando Google Translate com fallback
        const translatedText = await translateTextRobust(text, sourceLang, targetLang);
        
        console.log(colors.green(`📝 Translated: "${translatedText.substring(0, 100)}${translatedText.length > 100 ? '...' : ''}"`));
        
        // Atualizar status para COMPLETED via API
        await updateTranslateStatusAPI(requestId, 'COMPLETED', {
            translatedText
        });
        console.log(colors.green(`✅ Translate completed for: ${requestId}`));
        
    } catch (error) {
        console.error(colors.red(`❌ Translate failed for: ${requestId} - ${error.message}`));
        
        try {
            await updateTranslateStatusAPI(requestId, 'FAILED', {
                errorMessage: error.message,
                errorCode: 'TRANSLATE_ERROR'
            });
        } catch (apiError) {
            console.error(colors.red(`❌ Failed to update status via API: ${apiError.message}`));
        }
        
        throw error;
    }
}
console.log(colors.cyan('🚀 Starting Translate Worker...'));

connection(queue, exchange, routingKey, processTranslate)
    .then(() => {
        console.log(colors.green('✅ Translate consumer is running'));
    })
    .catch((error) => {
        console.error(colors.red('❌ Failed to start translate consumer:', error));
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log(colors.yellow('📴 Shutting down translate consumer...'));
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log(colors.yellow('📴 Shutting down translate consumer...'));
    process.exit(0);
});