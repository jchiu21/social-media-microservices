const logger = require("../utils/logger");

// if header is present, add user object to express req object
// used for internal microservice communication where user has already been authenticated
const authenticateRequest = (req, res, next) => {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    logger.warn(`Access attempted without user ID`);
    return res.status(401).json({
      success: false,
      message: "Authentication required! Please login to continue",
    });
  }
  req.user = { userId };
  next();
};

module.exports = { authenticateRequest };
