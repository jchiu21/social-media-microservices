require("dotenv").config({ quiet: true });
const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const logger = require("./utils/logger");
const proxy = require("express-http-proxy");
const errorHandler = require("./middleware/errorHandler");
const { validateToken } = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

// logger middleware
app.use((req, res, next) => {
  logger.info(`Recieved ${req.method} request to ${req.url}`);
  logger.info("Request body", req.body);
  next();
});

// rate limiting
const ratelimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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
app.use(ratelimit);

const proxyOptions = {
  proxyReqPathResolver: (req) => {
    // /v1/users/login -> /api/users/login
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error ${err.message}`);
    res.status(500).json({
      message: `Internal server error`,
      err: err.message,
    });
  },
};

// forward any request starting with /v1/auth to the identity service
app.use(
  "/v1/auth",
  proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    // modify outgoing request to identity service
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["content-type"] = "application/json"; // ensures content-type is application/json
      return proxyReqOpts;
    },
    // runs after proxy recieves response for identity service, before it sends response back to original client
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response recieved from Identity service ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

app.use(
  "/v1/posts",
  validateToken,
  proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    // decorate post requests with user ID
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["content-type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response recieved from Post service ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API Gateway is running on port ${PORT}`);
  logger.info(
    `Identity service is running on ${process.env.IDENTITY_SERVICE_URL}`
  );
    logger.info(
    `Post service is running on ${process.env.POST_SERVICE_URL}`
  );
  logger.info(`Redis URL ${process.env.REDIS_URL}`);
});
