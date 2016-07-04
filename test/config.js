var chai = require('chai');
var should = chai.should();
var config;
var envs = {development: 'DEV', production: 'PROD'};
var envProps = [
  'MONGO_URI',
  'URL',
  'EMAIL_SETTINGS',
  'VERIFY_EMAIL_FORMAT',
  'CONFIRM_EMAIL_FORMAT'
];
var connectionProps = ['CLIENT_ID', 'CLIENT_SECRET'];
var emailProps = ['HOST', 'PORT', 'AUTH', 'SECURE'];
var formatProps = ['FROM', 'SUBJECT', 'HTML', 'TEXT'];

describe('Dash Settings', function() {
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
