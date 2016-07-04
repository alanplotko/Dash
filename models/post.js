// --------- Dependencies ---------
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Define post fields
var PostSchema = new Schema({

  // Connection Name
  connection: {
    type: String
  },

  // Post title
  title: {
    type: String
  },

  // Post content
  content: {
    type: String
  },

  // Post timestamp
  timestamp: {
    type: Date
  },

  // Link to source post
  permalink: {
    type: String
  },

  // Optional: Description of action (e.g. shared a link)
  actionDescription: {
    type: String
  },

  // Optional: Attached picture or video thumbnail
  picture: {
    type: String
  },

  // Optional: Attached link
  url: {
    type: String
  },

  // Optional: Type of post (e.g. group, page, video, etc.)
  postType: {
    type: String
  }
});

module.exports = mongoose.model('Post', PostSchema);
