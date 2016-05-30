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
        'url': 'http://localhost:3000',
        'email_settings': {
            'host': process.env.DASH_EMAIL_HOST,
            'port': process.env.DASH_EMAIL_PORT,
            'auth': {
                'user': process.env.DASH_EMAIL_USER,
                'pass': process.env.DASH_EMAIL_PASS
            },
            'secure': true
        },
        'verify_email_format': {
            from: process.env.DASH_EMAIL_NAME + ' <' +
                process.env.DASH_EMAIL_USER + '>',
            subject: 'Pending: Dash Account Verification',
            html: '<div style="text-align: center;"><h1>Dash</h1><h2>' +
                '<i>Account Verification</i></h2></div><p>Click the ' +
                'following link to confirm your account:</p>' +
                '<p>${URL}</p><p>- DashBot</p>',
            text: 'Dash Account Verification: Please confirm your ' +
                'account by clicking the following link: ${URL} - DashBot'
        },
        'confirm_email_format': {
            from: process.env.DASH_EMAIL_NAME + ' <' +
                process.env.DASH_EMAIL_USER + '>',
            subject: 'Dash Account Verified!',
            html: '<div style="text-align: center;"><h1>Dash</h1><h2>' +
                '<i>Account Verification</i></h2></div><p>Your Dash ' +
                'account has been successfully verified. Welcome to Dash!</p>' +
                '<p>- DashBot</p>',
            text: 'Dash Account Verification: Your account has been ' +
                'successfully verified. Welcome to Dash! - DashBot'
        }
    },
    'prod': {
        'MONGO_URI': process.env.DASH_MONGODB_URL,
        'email_settings': {
            'host': process.env.DASH_EMAIL_HOST,
            'port': process.env.DASH_EMAIL_PORT,
            'auth': {
                'user': process.env.DASH_EMAIL_USER,
                'pass': process.env.DASH_EMAIL_PASS
            },
            'secure': true
        },
        'verify_email_format': {
            from: process.env.DASH_EMAIL_NAME + ' <' +
                process.env.DASH_EMAIL_USER + '>',
            subject: 'Pending: Dash Account Verification',
            html: '<div style="text-align: center;"><h1>Dash</h1><h2>' +
                '<i>Account Verification</i></h2></div><p>Click the ' +
                'following link to confirm your account:</p>' +
                '<p>${URL}</p><p>- DashBot</p>',
            text: 'Dash Account Verification: Please confirm your ' +
                'account by clicking the following link: ${URL} - DashBot'
        },
        'confirm_email_format': {
            from: process.env.DASH_EMAIL_NAME + ' <' +
                process.env.DASH_EMAIL_USER + '>',
            subject: 'Dash Account Verified!',
            html: '<div style="text-align: center;"><h1>Dash</h1><h2>' +
                '<i>Account Verification</i></h2></div><p>Your Dash ' +
                'account has been successfully verified. Welcome to Dash!</p>' +
                '<p>- DashBot</p>',
            text: 'Dash Account Verification: Your account has been ' +
                'successfully verified. Welcome to Dash! - DashBot'
        }
    }
};

module.exports = settings;
