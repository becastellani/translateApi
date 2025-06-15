import amqp from 'amqplib';
import colors from 'colors';

export default async (queue, exchange, routingKey, callback) => {
    const RABBIT_MQ = process.env.RABBIT_MQ;
    const MAX_RETRIES = parseInt(process.env.MAX_RETRIES) || 3;
    
    try {
        const connection = await amqp.connect(RABBIT_MQ);
        const channel = await connection.createChannel();

        process.once("SIGINT", async () => {
            console.log("Closing translate consumer connection...");
            await channel.close();
            await connection.close();
        });

        await channel.assertQueue(queue, { durable: true });
        await channel.assertQueue(`${queue}_dlq`, { durable: true });

        await channel.bindQueue(
            queue,
            exchange,
            routingKey
        );

        await channel.bindQueue(
            `${queue}_dlq`,
            exchange,
            "dlq"
        );

        console.log(colors.cyan(`Translate consumer started. Waiting for messages in queue: ${queue}`));

        await channel.consume(
            queue, 
            async (message) => {
                const content = message.content.toString();
                const retries = message.properties.headers['x-retries'] || 0;
                
                try {
                    console.log(colors.green('==> Translate request received'), content);
                    console.log(colors.green('==> Retry count'), retries);

                    const translateData = JSON.parse(content);
                    await callback(translateData);

                    console.log(colors.green(`==> Translate processed successfully for requestId: ${translateData?.correlationId}`));

                } catch (error) {
                    console.error(colors.red(`==> Error processing translate: ${error.message}`));

                    if (retries < MAX_RETRIES) {
                        console.log(colors.yellow('==> Retrying translate request'));
                        channel.sendToQueue(
                            queue,
                            Buffer.from(content),
                            {
                                headers: {
                                    'x-retries': retries + 1,
                                },
                                persistent: true,
                            }
                        );
                    } else {
                        console.log(colors.red("==> Sending translate request to DLQ (Dead Letter Queue)"));
                        channel.publish(
                            exchange,
                            "dlq",
                            Buffer.from(content),
                            {
                                headers: {
                                    'x-retries': retries,
                                    'error-message': error.message,
                                    'failed-at': new Date().toISOString()
                                },
                                persistent: true,
                            }
                        );
                    }
                } finally {
                    channel.ack(message);
                }
            }, 
            { noAck: false }
        );
        
    } catch (error) {
        console.error(colors.red('Error in translate consumer connection:', error));
        throw error;
    }
}