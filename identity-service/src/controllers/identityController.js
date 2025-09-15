const User = require("../models/User");
const generateTokens = require("../utils/generateToken");
const logger = require("../utils/logger");
const { validateRegistration, validateLogin } = require("../utils/validation");
const RefreshToken = require("../models/RefreshToken");

const registerUser = async (req, res) => {
  logger.info("Registration endpoint hit...");
  try {
    // validate the schema
    const { error } = validateRegistration(req.body);
    if (error) {
      // use .warn() for client-side errors (expected application behavior)
      logger.warn("Validation error", {
        validationMessage: error.details[0].message,
      });
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    // extract credentials from body and look for matching email/username in DB
    const { email, password, username } = req.body;
    let user = await User.findOne({
      $or: [{ email }, { username }],
    });
    // if user already exists
    if (user) {
      logger.warn("User already exists");
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }
    // else, create User
    user = new User({ username, email, password });
    await user.save();
    logger.info("User saved successfully", user._id);

    const { accessToken, refreshToken } = await generateTokens(user);
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Registration error occured", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const loginUser = async (req, res) => {
  logger.info("Login endpoint hit...");
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn("Validation error", {
        validationMessage: error.details[0].message,
      });
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("Invalid user");
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // check if user password is valid
    const passwordIsValid = await user.comparePasswords(password);
    if (!passwordIsValid) {
      logger.warn("Invalid password");
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const { accessToken, refreshToken } = await generateTokens(user);
    res.json({
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error("Login error occured", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// refresh token refresh
const refreshTokenController = async (req, res) => {
  logger.info("Refresh token endpoint hit...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token missing",
      });
    }
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    // only give new access token if refresh token still valid
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh token");
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }
    const user = await User.findById(storedToken.user);
    if (!user) {
      logger.warn("User not found");
      return res.status(401).json({
        success: false,
        message: "Refresh token user not found",
      });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateTokens(user);

    // delete old refresh token
    await RefreshToken.deleteOne({ _id: storedToken._id });
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error("Refresh token error occured", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const logoutUser = async (req, res) => {
  logger.info("Logout endpoint hit...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token missing",
      });
    }
    await RefreshToken.deleteOne({ token: refreshToken });
    logger.info("Refresh token deleted for logout");

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error("Error while logging out", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = { registerUser, loginUser, refreshTokenController, logoutUser };
