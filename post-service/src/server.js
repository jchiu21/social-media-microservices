require("dotenv").config({ quiet: true });
const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const postRoutes = require("./routes/postRoutes");
const errorHandler = require("../src/middleware/errorHandler");
const logger = require("./utils/logger");

const app = express();
const PORT = process.env.PORT || 3002;

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

// routes -> pass redis client (dependency injection) so requests share a single instance
app.use(
  "/api/posts",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes
);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Post service running on port ${PORT}`);
});

// triggers if promise fails reject() or throw inside async but is never caught
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection at %o. Reason: %s", promise, reason);
});
