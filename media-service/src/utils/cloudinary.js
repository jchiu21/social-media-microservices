const cloudinary = require("cloudinary").v2;
const logger = require("../utils/logger");

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});

const uploadMediaToCloudinary = (file) => {
  // wrap async cloudinary upload in promise so await can be used when calling this func
  return new Promise((resolve, reject) => {
    // create a writable stream that cloudinary can consume
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto", // let cloudinary detect file type automatically
      },
      (error, result) => {
        // callback function
        if (error) {
          logger.error("Error whie uploading media to cloudinary", error);
          reject(error); // promise fails if error
        } else {
          resolve(result); // promise succeeds with result
        }
      }
    );
    // take file buffer (raw binary data) and write to cloudinary stream
    uploadStream.end(file.buffer);
  });
};

const deleteMediaFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info("Media deleted successfully from cloud storage");
  } catch (error) {
    logger.error("Error deleting media from cloudinary", error);
    throw error;
  }
};
module.exports = { uploadMediaToCloudinary, deleteMediaFromCloudinary };
