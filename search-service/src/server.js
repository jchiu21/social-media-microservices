require("dotenv").config({ quiet: true });
const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const errorHandler = require("../src/middleware/errorHandler");
const logger = require("./utils/logger");
const { connectToRabbitMQ, subscribeToEvent } = require("./utils/rabbitmq");
const searchRoutes = require("./routes/searchRoutes");
const {
  handlePostCreated,
  handlePostDeleted,
} = require("./eventHandlers/searchEventHandlers");

const app = express();
const PORT = process.env.PORT || 3004;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info("Connected to mongoDB"))
  .catch((e) => logger.error("Mongo connection error", e));

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet()); // set HTTP security headers
app.use(cors());
app.use(express.json());

// logger middleware
app.use((req, res, next) => {
  logger.info(`Recieved ${req.method} request to ${req.url}`);
  logger.info("Request body", req.body);
  next();
});

app.use("/api/search", searchRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();

    await subscribeToEvent("post.created", handlePostCreated);
    await subscribeToEvent("post.deleted", handlePostDeleted);

    app.listen(PORT, () => {
      logger.info(`Search service is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start search service", error);
    process.exit(1);
  }
}
startServer();
