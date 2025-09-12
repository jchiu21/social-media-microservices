const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  logger.error(err.stack);
  // fallback to HTTP 500 if no status provided
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
};

module.exports = errorHandler; 