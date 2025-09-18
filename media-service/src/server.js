require("dotenv").config({ quiet: true });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const mediaRoutes = require("./routes/mediaRoutes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const { subscribeToEvent, connectToRabbitMQ } = require("./utils/rabbitmq");
const { handlePostDeleted } = require("./eventHandlers/mediaEventHandlers");

const app = express();
const PORT = process.env.PORT || 3003;

//connect to mongodb
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info("Connected to mongodb"))
  .catch((e) => logger.error("Mongo connection error", e));

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

app.use("/api/media", mediaRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();
    await subscribeToEvent("post.deleted", handlePostDeleted);

    app.listen(PORT, () => {
      logger.info(`Media service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect to server", error);
    process.exit(1);
  }
}
startServer();

// unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  try {
    const reasonObj =
      reason instanceof Error
        ? { message: reason.message, stack: reason.stack }
        : reason;
    logger.error("Unhandled Rejection at promise", { reason: reasonObj });
  } catch (e) {
    logger.error("Unhandled Rejection (logging failed)", e);
  }
});
