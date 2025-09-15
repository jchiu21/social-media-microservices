const express = require("express");
const {
  registerUser,
  loginUser,
  refreshTokenController,
  logoutUser,
} = require("../controllers/identityController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser)
router.post("/refresh-token", refreshTokenController);

module.exports = router;
