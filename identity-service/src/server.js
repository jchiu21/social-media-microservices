require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const logger = require("./utils/logger");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require("ioredis");

const app = express();

// connect to mongo
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info("Connected to mongoDB"))
  .catch((e) => logger.error("Mongo connection error", e));

// create redis client instance
const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet()); // set HTTP security headers
app.use(cors());
app.use(express.json());

// logger middleware
app.use((req, res, next) => {
  logger.info(`Recieved ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient, // connection to redis server
  keyPrefix: "middleware", // namespace for the keys in redis
  points: 10, // max number of points (requests)
  duration: 1, // time window in seconds
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip) // try to consume a point for this IP
    .then(() => next()) // if sucessful, proceed
    .catch(() => {
      // if failed, block the request
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: "Too many requests",
      });
    });
});
