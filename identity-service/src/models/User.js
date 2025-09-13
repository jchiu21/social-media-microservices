const mongoose = require("mongoose");
const argon2 = require("argon2");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// pre-save hook to hash user plain text password before it gets stored
userSchema.pre("save", async function (next) {
  // check if user has updated the password. (e.g. dont want to re-hash if user only updates email)
  if (this.isModified("password")) {
    try {
      this.password = await argon2.hash(this.password);
    } catch (error) {
      return next(error);
    }
  }
});

// add custom comparePassword method to instances of user model
userSchema.methods.comparePasswords = async function (candidatePassword) {
  try {
    return await argon2.verify(this.password, candidatePassword);
  } catch (error) {
    throw error;
  }
};

// create an index for username field to speed up querying
// (removed for now since text index may not be needed)
// userSchema.index({ username: "text" });

const User = mongoose.model("User", userSchema);
module.exports = User;
