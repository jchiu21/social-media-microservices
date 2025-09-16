const winston = require("winston");

const logger = winston.createLogger({
  // determine the minimum importance of messages the logger will output
  // -> in prod will log info, warn, error messages (avoid noisy debug logs)
  // -> in dev will log everything from debug level up
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  // merge multiple format steps into one pipeline
  format: winston.format.combine(
    winston.format.timestamp(), // add timestamp to every log
    winston.format.errors({ stack: true }), // include full error stack trace
    winston.format.splat(), // enables string interpolation
    winston.format.json() // outputs every log as JSON object
  ),
  defaultMeta: { service: "media-service" }, // add default metadata to identify service
  // transports are where the logs should be sent
  transports: [
    // 1. console transport - outputs to terminal
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // 2. file transport - saves only ERROR logs to a file
    // 3. saves all logs (info and above) to a file
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

module.exports = logger;
