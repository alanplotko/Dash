module.exports.config = {
    'dev': {
        'MONGO_URI': 'mongodb://dashbot:dash@127.0.0.1:27017/dash'
    },
    'prod': {
        'MONGO_URI': process.env.DASH_MONGODB_URL
    }
}