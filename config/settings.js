// Define variables for development and production environments
var settings = {
    'connections': {
        'facebook': {
            'clientID': process.env.DASH_FACEBOOK_APP_ID,
            'clientSecret': process.env.DASH_FACEBOOK_APP_SECRET
        },
        'youtube': {
            'clientID': process.env.DASH_YOUTUBE_APP_ID,
            'clientSecret': process.env.DASH_YOUTUBE_APP_SECRET
        }
    },
    'dev': {
        'MONGO_URI': 'mongodb://dashbot:dash@127.0.0.1:27017/dash',
        'url': 'http://localhost:3000'
    },
    'prod': {
        'MONGO_URI': process.env.DASH_MONGODB_URL
    }
};

module.exports = settings;