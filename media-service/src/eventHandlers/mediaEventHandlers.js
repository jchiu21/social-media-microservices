const Media = require("../models/Media");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");

const handlePostDeleted = async (event) => {
  console.log(event, "event");
  const { postId, mediaIds } = event; // extract data from event
  try {
    const mediaToDelete = await Media.find({ _id: { $in: mediaIds } }); // match all documents where _id is in mediaIds

    for (const media of mediaToDelete) {
      await deleteMediaFromCloudinary(media.publicId);
      await Media.findByIdAndDelete(media._id);
      logger.info(`Deleted media ${media._id} of deleted post ${postId}`);
    }

    logger.info(`Processed deletion of media for post id ${postId}`);
  } catch (error) {
    logger.error("Error occurred during media deletion", error);
  }
};

module.exports = { handlePostDeleted };
