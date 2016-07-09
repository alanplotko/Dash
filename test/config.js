var chai = require('chai');
var should = chai.should();
var config;
var mongoose;

// Define existing environments Dash can run in
var envs = {development: 'DEV', production: 'PROD'};

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

  it('should have all required connection settings defined', function(done) {
    for (var key in config.CONNECTIONS) {
      if (config.CONNECTIONS.hasOwnProperty(key)) {
        config.CONNECTIONS[key].should.contain.all.keys(connectionProps);
      }
    }
    done();
  });

  describe('should have all required environment settings defined', function() {
    for (var envName in envs) {
      if (envs.hasOwnProperty(envName)) {
        /* eslint-disable no-loop-func */
        it('for ' + envName, function(done) {
          should.exist(config[envs[envName]]);
          config[envs[envName]].should.have.all.keys(envProps);
          done();
        });
        /* eslint-enable no-loop-func */
      }
    }
  });

  describe('should have all required email settings defined', function() {
    for (var envName in envs) {
      if (envs.hasOwnProperty(envName)) {
        /* eslint-disable no-loop-func */
        it('for ' + envName, function(done) {
          should.exist(config[envs[envName]].EMAIL_SETTINGS);
          config[envs[envName]].EMAIL_SETTINGS.should.have.all.keys(emailProps);

          should.exist(config[envs[envName]].EMAIL_SETTINGS.AUTH);
          config[envs[envName]].EMAIL_SETTINGS.AUTH.should.have.all.keys([
            'USER',
            'PASS'
          ]);

          should.exist(config[envs[envName]].VERIFY_EMAIL_FORMAT);
          config[envs[envName]].VERIFY_EMAIL_FORMAT.should.have.all.keys(
            formatProps
          );

          should.exist(config[envs[envName]].CONFIRM_EMAIL_FORMAT);
          config[envs[envName]].CONFIRM_EMAIL_FORMAT.should.have.all.keys(
            formatProps
          );

          done();
        });
        /* eslint-enable no-loop-func */
      }
    }
  });
});

/**
 * Test for valid database configuration and connection.
 */
describe('Dash database', function() {
  describe('should have a valid URL', function() {
    for (var envName in envs) {
      if (envs.hasOwnProperty(envName)) {
        if (process.env.TRAVIS && envName === 'development') {
          continue;
        }
        /* eslint-disable no-loop-func */
        it('for ' + envName, function(done) {
          should.exist(config[envs[envName]].MONGO_URI);
          config[envs[envName]].MONGO_URI.should.match(/^(mongodb:(?:\/{2})?)((\S+?):(\S+?)@|:?@?)(\S+?):(\d+)\/(\w+?)$/);
          done();
        });
        /* eslint-enable no-loop-func */
      }
    }
  });

  describe('should connect successfully', function() {
    before(function(done) {
      mongoose = require('mongoose');
      mongoose.Promise = require('bluebird');
      done();
    });

    for (var envName in envs) {
      if (envs.hasOwnProperty(envName)) {
        /* eslint-disable no-loop-func */
        // Disable dev environment tests in TRAVIS
        if (process.env.TRAVIS && envName === 'development') {
          continue;
        }
        it('for ' + envName, function(done) {
          mongoose.connect(config[envs[envName]].MONGO_URI, function(err) {
            should.not.exist(err);
            mongoose.connection.close(done);
          });
        });
        /* eslint-enable no-loop-func */
      }
    }
  });
});
