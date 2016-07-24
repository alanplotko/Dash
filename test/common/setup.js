/* eslint-disable no-unused-vars */

// Set up dummy account and query
var crypto = require('crypto');
var email = 'Dashbot@Dash';
var gravatar = crypto.createHash('md5').update(email).digest('hex');
module.exports.dummyDetails = {
  email: email,
  displayName: 'Dashbot',
  avatar: 'https://gravatar.com/avatar/' + gravatar,
  password: 'DashRocks'
};

var User = require('../../models/user');
module.exports.accountQuery = User.findOne({email: email});

// Set up environment defaults
process.env.NODE_ENV = 'DEV';

// Define dummy environment variable values when running in Travis
if (process.env.TRAVIS) {
  // process.env.NODE_ENV = 'PROD';
  process.env.DASH_FACEBOOK_APP_ID = 'DashFacebookAppId';
  process.env.DASH_FACEBOOK_APP_SECRET = 'DashFacebookAppSecret';
  process.env.DASH_YOUTUBE_APP_ID = 'DashYouTubeAppId';
  process.env.DASH_YOUTUBE_APP_SECRET = 'DashYouTubeAppSecret';
}
