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

async function publishEvent(routingKey, message) {
  if (!channel) {
    await connectToRabbitMQ();
  }

  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message)) // Convert JS object -> JSON string -> binary buffer
  );
  logger.info(`Event published: ${routingKey}`);
}

module.exports = { connectToRabbitMQ, publishEvent };
