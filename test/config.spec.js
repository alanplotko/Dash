var chai = require('chai');
var should = chai.should();
var config;
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

// Define expected environment based on whether the test is running in Travis
process.env.NODE_ENV = process.env.TRAVIS ? 'PROD' : 'DEV';

// Define required properties for each environment property
var envProps = [
  'MONGO_URI',
  'URL',
  'EMAIL_SETTINGS',
  'VERIFY_EMAIL_FORMAT',
  'CONFIRM_EMAIL_FORMAT'
];

// Define required properties for other properties
var connectionProps = ['CLIENT_ID', 'CLIENT_SECRET'];   // Connections
var emailProps = ['HOST', 'PORT', 'AUTH', 'SECURE'];    // Email Setup
var formatProps = ['FROM', 'SUBJECT', 'HTML', 'TEXT'];  // Email Formatting

/**
 * Test for whether required settings are defined
 */
describe('Dash settings', function() {
  it('should exist', function(done) {
    should.exist(require('../config/settings'));
    config = require('../config/settings');
    done();
  });

  it('should have at least one connection configured', function(done) {
    should.exist(config.CONNECTIONS);
    Object.keys(config.CONNECTIONS).should.have.length.above(0);
    done();
  });

  it('should have all required connection details defined', function(done) {
    for (var key in config.CONNECTIONS) {
      if (config.CONNECTIONS.hasOwnProperty(key)) {
        config.CONNECTIONS[key].should.contain.all.keys(connectionProps);
      }
    }
    done();
  });

  it('should have all required environment details defined', function(done) {
    should.exist(config[process.env.NODE_ENV]);
    config[process.env.NODE_ENV].should.have.all.keys(envProps);
    done();
  });

  it('should have all required email details defined', function(done) {
    should.exist(config[process.env.NODE_ENV].EMAIL_SETTINGS);
    config[process.env.NODE_ENV].EMAIL_SETTINGS.should.have.all.keys(
      emailProps
    );

    should.exist(config[process.env.NODE_ENV].EMAIL_SETTINGS.AUTH);
    config[process.env.NODE_ENV].EMAIL_SETTINGS.AUTH.should.have.all.keys([
      'USER',
      'PASS'
    ]);

    should.exist(config[process.env.NODE_ENV].VERIFY_EMAIL_FORMAT);
    config[process.env.NODE_ENV].VERIFY_EMAIL_FORMAT.should.have.all.keys(
      formatProps
    );

    should.exist(config[process.env.NODE_ENV].CONFIRM_EMAIL_FORMAT);
    config[process.env.NODE_ENV].CONFIRM_EMAIL_FORMAT.should.have.all.keys(
      formatProps
    );

    done();
  });
});

/**
 * Test for valid database configuration and connection.
 */
describe('Dash database', function() {
  it('should have a valid URL', function(done) {
    should.exist(config[process.env.NODE_ENV].MONGO_URI);
    config[process.env.NODE_ENV].MONGO_URI.should.match(/^(mongodb:(?:\/{2})?)((\S+?):(\S+?)@|:?@?)(\S+?):(\d+)\/(\w+?)$/);
    done();
  });

  it('should connect successfully', function(done) {
    mongoose.connect(config[process.env.NODE_ENV].MONGO_URI, function(err) {
      should.not.exist(err);
      mongoose.connection.close(done);
    });
  });
});
