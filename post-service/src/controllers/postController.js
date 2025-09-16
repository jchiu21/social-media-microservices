const logger = require("../utils/logger");
const Post = require("../models/Post");
const { validatePost } = require("../utils/validation");

const createPost = async (req, res) => {
  logger.info("Create post endpoint hit");
  // validate the schema
  const { error } = validatePost(req.body);
  if (error) {
    logger.warn("Validation error", {
      validationMessage: error.details[0].message,
    });
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }
  try {
    const { content, mediaIds } = req.body;
    const newPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });
    await newPost.save();
    logger.info("Post created successfully", newPost);
    res.status(201).json({
      success: true,
      message: "Post created successfully",
    });
  } catch (error) {
    logger.error("Error creating post", error);
    res.status(500).json({
      success: false,
      message: "Error creating post",
    });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // current page number, default 1
    const limit = parseInt(req.query.limit) || 10; // posts per page
    const startIndex = (page - 1) * limit; // calculates where to start in DB

    const cacheKey = `posts:${page}`; // unique key for page's data
    const cachedPosts = await req.redisClient.get(cacheKey); // check redis

    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts)); // immediately return cached data to client
    }

    // else, query DB
    const posts = await Post.find({})
      .sort({ createdAt: -1 }) // newest posts first
      .skip(startIndex) // skip to correct page
      .limit(limit); 

    const totalPosts = await Post.countDocuments();
    const result = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts: totalPosts,
    };
    // save posts in redis cache (setex: set with expiration)
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));
    res.json(result)
  } catch (error) {
    logger.error("Error fetching posts", error);
    res.status(500).json({
      success: false,
      message: "Error fetching posts",
    });
  }
};

const getPostById = async (req, res) => {
  try {
  } catch (error) {
    logger.error("Error fetching post", error);
    res.status(500).json({
      success: false,
      message: "Error fetching post by ID",
    });
  }
};

const deletePost = async (req, res) => {
  try {
  } catch (error) {
    logger.error("Error deleting post", error);
    res.status(500).json({
      success: false,
      message: "Error deleting post",
    });
  }
};

module.exports = { createPost, getAllPosts };
