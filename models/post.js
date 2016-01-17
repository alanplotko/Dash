// --------- Dependencies ---------
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Define post fields
var PostSchema = new Schema({
    connection: { type: String },           // Connection name
    title: { type: String },                // Post title
    content: { type: String },              // Post content
    timestamp: { type: Date },              // Last updated
    permalink: { type: String },            // Link to source post
    actionDescription: { type: String },    // Optional: Description of action (e.g. shared a link)
    picture: { type: String },              // Optional: Attached picture or video thumbnail
    url: { type: String },                  // Optional: Attached link
    postType: { type: String },             // Optional: Type of post (e.g. group, page, video, etc.)
});

module.exports = mongoose.model('Post', PostSchema);