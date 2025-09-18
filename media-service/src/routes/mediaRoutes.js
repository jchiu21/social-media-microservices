const express = require("express");
const multer = require("multer");
const { uploadMedia, getAllMedia } = require("../controllers/mediaController");
const { authenticateRequest } = require("../middleware/authMiddleware");
const logger = require("../utils/logger");

const router = express.Router();

// configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fieldSize: 5 * 1024 * 1024,
  },
}).single("file");

router.post(
  "/upload",
  authenticateRequest,
  (req, res, next) => {
    upload(req, res, function (err) {
      // error handling pre-controller upload
      if (err instanceof multer.MulterError) {
        logger.error("Multer error while uploading");
        return res.status(400).json({
          message: "Multer error while uploading",
          error: err.message,
          stack: err.stack,
        });
      } else if (err) {
        logger.error("Unknown error occured while uploading", err);
        return res.status(500).json({
          message: "Unknown error while uploading",
          error: err.message,
          stack: err.stack,
        });
      }
      if (!req.file) {
        return res.status(400).json({
          message: "No file found",
        });
      }
      next();
    });
  },
  uploadMedia
);

router.get("/get", authenticateRequest, getAllMedia);

module.exports = router;
