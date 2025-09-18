const Search = require("../models/Search");
const logger = require("../utils/logger");

const searchPostController = async (req, res) => {
  logger.info("Search endpoint hit!");
  try {
    const { query } = req.query;
    const results = await Search.find(
      {
        $text: { $search: query }, // find documents where text fields match search query
      },
      {
        score: { $meta: "textScore" }, // include a score field that shows relevance score
      }
    )
      .sort({ score: { $meta: "textScore" } }) // sort results by relevance score 
      .limit(10);

    res.json(results);
  } catch (error) {
    logger.error("Error while searching post", error);
    res.status(500).json({
      success: false,
      message: "Error while searching post",
    });
  }
};

module.exports = { searchPostController };
