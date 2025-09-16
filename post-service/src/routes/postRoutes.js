const express = require("express");
const {
  createPost,
  getAllPosts,
  getPostById,
  deletePost,
} = require("../controllers/postController");
const { authenticateRequest } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateRequest);

router.get("/all-posts", getAllPosts);
router.get("/:id", getPostById);
router.post("/create-post", createPost);
router.delete("/:id", deletePost);

module.exports = router;
