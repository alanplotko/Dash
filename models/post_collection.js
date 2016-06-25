// --------- Dependencies ---------
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var PostSchema = mongoose.model('Post').schema;

// Define post fields
var PostCollectionSchema = new Schema({

    // Posts in the current collection
    posts: [PostSchema],

    // Description of the update to show the user
    description: {
        type: String
    },

    // Time at which the update occurred
    updateTime: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('PostCollection', PostCollectionSchema);
