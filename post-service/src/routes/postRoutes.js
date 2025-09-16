const express = require("express");
const { createPost, getAllPosts } = require("../controllers/postController");
const { authenticateRequest } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateRequest);

router.get("/all-posts", getAllPosts);
router.post("/create-post", createPost);

module.exports = router;