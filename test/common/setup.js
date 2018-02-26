/* eslint-disable no-unused-vars */

// Set up dummy account and query
let crypto = require('crypto');
let email = 'Dashbot@Dash';
let gravatar = crypto.createHash('md5').update(email).digest('hex');
module.exports.dummyDetails = {
  email: email,
  displayName: 'Dashbot',
  avatar: 'https://gravatar.com/avatar/' + gravatar,
  password: 'DashRocks'
};

let User = require('../../models/user');
module.exports.accountQuery = User.findOne({email: email});

// Set up environment defaults
process.env.NODE_ENV = 'DEV';
