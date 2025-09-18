const mongoose = require("mongoose");

const searchPostSchema = new mongoose.Schema(
  {
    postId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      require: true,
    },
  },
  { timestamps: true }
);

// Create text index on content field 
searchPostSchema.index({ content: "text" });
searchPostSchema.index({ createdAt: -1 });

const Search = mongoose.model("Search", searchPostSchema);
module.exports = Search;
