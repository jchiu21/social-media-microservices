const logger = require("../utils/logger");
const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const Media = require("../models/Media");

const uploadMedia = async (req, res) => {
  logger.info("Starting media upload");
  try {
    // check if file exists
    if (!req.file) {
      logger.error("No file found. Please add a file and try again!");
      return res.status(400).json({
        success: false,
        message: "No file found. Please add a file and try again!",
      });
    }
    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;
    logger.info(`File details: name=${originalname}, type=${mimetype}`);
    logger.info("Upload to cloudinary starting...");

    // upload to cloudinary
    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
    logger.info(
      `Cloudinary upload successful. Public Id: ${cloudinaryUploadResult.public_id}`
    );
    // store in mongoDB
    const newMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadResult.secure_url,
      userId,
    });
    await newMedia.save();
    res.status(201).json({
      success: true,
      mediaId: newMedia._id,
      url: newMedia.url,
      message: "Media upload is successful",
    });
  } catch (error) {
    logger.error("Error uploading media", error);
    res.status(500).json({
      success: false,
      message: "Error uploading media",
    });
  }
};

module.exports = { uploadMedia };
