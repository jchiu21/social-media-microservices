require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const logger = require("./utils/logger");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis"); // redis store for express-rate-limit
const routes = require("./routes/identityService");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3001;

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
  logger.info("Request body", req.body);
  next();
});

// rate limiter applied globally for all requests
// ddos / brute force protection for all endpoints
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

// sensitive endpoint rate limiter (protects against abuse of signup/login routes)
const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  },
  // by default stores request counts in memory, we can use Redis
  store: new RedisStore({
    // function used to forward commands to redis
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use("/api/auth/register", sensitiveEndpointsLimiter);

// routes
app.use("/api/auth", routes);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Identity service running on port ${PORT}`);
});

// triggers if promise fails reject() or throw inside async but is never caught
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection at %o. Reason: %s", promise, reason);
});
