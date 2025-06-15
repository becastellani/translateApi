import amqp from 'amqplib';

const exchange = 'translateExchange';
const routingKey = 'translateQueue';

export default async (translateData) => {
    let connection;
    try {
        connection = await amqp.connect(process.env.RABBIT_MQ);
        const channel = await connection.createChannel();

        await channel.assertExchange(exchange, 'direct', { durable: true });

        const message = {
            eventType: 'translate_request',
            version: "1.0",
            producer: "translate-api",
            timestamp: new Date(),
            correlationId: translateData.requestId,
            retryCount: 0,
            maxRetries: translateData.maxRetries || 3,
            data: {
                text: translateData.text,
                sourceLang: translateData.sourceLang,
                targetLang: translateData.targetLang,
            }
        };

        const messageOptions = {
            persistent: true,
            priority: 5,
            messageId: translateData.requestId,
            timestamp: Date.now(),
            headers: {
                'source-lang': translateData.sourceLang,
                'target-lang': translateData.targetLang,
                'request-id': translateData.requestId
            }
        };

        const success = channel.publish(
            exchange, 
            routingKey, 
            Buffer.from(JSON.stringify(message)),
            messageOptions
        );

        if (!success) {
            throw new Error('Failed to publish translate to queue');
        }

        console.log(`Translate request published: ${translateData.requestId} (${translateData.sourceLang} -> ${translateData.targetLang})`);

        await channel.close();
        
        return {
            success: true,
            requestId: translateData.requestId
        };

    } catch (error) {
        console.error(`Error publishing translate request: ${error.message}`);
        throw new Error(`Error publishing translate request: ${error.message}`);
    } finally {
        if (connection) {
            await connection.close();
        }
    }
};