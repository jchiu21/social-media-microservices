const logger = require("../utils/logger");
const Post = require("../models/Post");
const { validatePost } = require("../utils/validation");

const invalidatePostCache = async (req, input) => {
  const cachedKey = `post:${input}`; // key for specific post
  await req.redisClient.del(cachedKey);

  const keys = await req.redisClient.keys("posts:*"); // paginated posts
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
};

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
    // save new post and invalidate post cache
    await newPost.save();
    await invalidatePostCache(req, newPost._id.toString());

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
    res.json(result);
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
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);

    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }

    // query DB if post not in cache
    const postDetails = await Post.findById(postId);
    if (!postDetails) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }
    // cache post for an hour
    await req.redisClient.setex(cacheKey, 3600, JSON.stringify(postDetails));
    res.json(postDetails);
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
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    await invalidatePostCache(req, req.params.id);
    res.json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting post", error);
    res.status(500).json({
      success: false,
      message: "Error deleting post",
    });
  }
};

module.exports = { createPost, getAllPosts, getPostById, deletePost };
