const amqp = require("amqplib");
const logger = require("./logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "events";

async function connectToRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL); // open tcp connection to rabbitmq server
    channel = await connection.createChannel(); // create a channel (a lightweight virtual connection inside tcp connection)

    // exchange decides which queue(s) get that message
    // use "topic" exchange type: pattern match with routing keys (e.g. "user.*")
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });

    logger.info("Connected to rabbitmq");
  } catch (error) {
    logger.error("Error connecting to rabbitmq", error);
  }
}

async function subscribeToEvent(routingKey, callback) {
  if (!channel) {
    await connectToRabbitMQ();
  }
  // create a temporary, auto-deleted queue
  const q = await channel.assertQueue("", { exclusive: true });
  // "" = let rabbitMQ generate a random queue name
  // "" exclusive: true = queue is only for this connection, deleted when connection closes

  // bind queue to exchange with specific routing pattern
  // listen for messages where routing key matches this pattern
  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);

  // start consuming messages from the queue
  channel.consume(q.queue, async (msg) => {
    if (msg !== null) {
      try {
        // convert binary buffer back to JS object
        const content = JSON.parse(msg.content.toString());

        // call provided callback with the message
        await Promise.resolve(callback(content));

        // acknowledge the message was processed successfully
        channel.ack(msg);
      } catch (err) {
        logger.error("Error handling message for routing key", {
          routingKey,
          error: err,
        });
        // optionally, we could nack and requeue or dead-letter
        channel.nack(msg, false, false);
      }
    }
  });
  logger.info(`Subscribed to event: ${routingKey}`);
}

module.exports = { connectToRabbitMQ, subscribeToEvent };
