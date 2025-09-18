const amqp = require("amqplib");
const logger = require("./logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "events";

async function connectRabbitMQ() {
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

module.exports = { connectRabbitMQ };
