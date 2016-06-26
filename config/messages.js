// Define messages used across Dash
var messages = {
  /**
   * Define error messages
   */
    'error': {
      /**
       * Define error messages for user credentials (e.g. login, register)
       */
      'general': 'An error occurred. Please try again in a few minutes.',

      'credentials': {

        'missing':    'An error occurred. Please check if you\'ve typed in ' +
                      'your credentials.',

        'incorrect':  'Error: The email address or password is incorrect.',

        'locked':     'Error: The account is temporarily locked.',

        'password':   'Error: Password confirmation failed. Please check ' +
                      'if you\'ve typed in your password correctly.',

        'register_success': 'You have successfully registered! You should ' +
                            'receive an email momentarily for verifying your ' +
                            'email address. Click on the link in that email ' +
                            'to proceed.',

        'account_exists':   'Error: you already have an account. ' +
                            '<a href="/login">Proceed to login?</a>'
      },
      /**
       * Define error messages for Facebook service issues and functions
       */
      'Facebook': {

          'refresh':  'Could not connect to Facebook service. ' +
                      'Access privileges may have expired. ' +
                      '<a href="/connect/refresh_token/' +
                      'facebook">Renew access privileges?</a>',

          'reauth':  {

              'groups': 'You do not have any configurable Facebook ' +
                        'groups at this time. It is possible you ' +
                        'may be missing required permissions. ' +
                        '<a href="/connect/reauth/youtube">Reauthenticate ' +
                        'just in case?</a>',

              'pages':  'You do not have any configurable Facebook ' +
                        'pages at this time. It is possible you ' +
                        'may be missing required permissions. ' +
                        '<a href="/connect/reauth/youtube">Reauthenticate ' +
                        'just in case?</a>'
          }
      },
      /**
       * Define error messages for YouTube service issues and functions
       */
      'YouTube': {

          'refresh':  'Could not connect to YouTube service. ' +
                      'Access privileges may have expired. ' +
                      '<a href="/connect/refresh_token/' +
                      'youtube">Renew access privileges?</a>',

          'reauth':  {

              'subscriptions':  'You do not have any configurable YouTube ' +
                                'subscriptions at this time. It is possible ' +
                                'you may be missing required permissions. ' +
                                '<a href="/connect/reauth/youtube">' +
                                'Reauthenticate just in case?</a>'
          }
      }
    },
    /**
     * Define status messages
     */
    'status': {
      /**
       * Define status messages for Facebook service
       */
      'Facebook': {

        'renewed':    'Access privileges for Facebook have been renewed.',

        'connected':  'You are now connected with Facebook. Facebook ' +
                      'settings are now available for configuration.',

        'already_connected':    'You\'re already connected with Facebook.',

        'not_connected':        'You\'re not connected with Facebook.',

        'not_configured':       'Facebook is not currently configured.',

        'missing_permissions':  'Missing permissions for Facebook have been ' +
                                'regranted.',

        'updates_enabled':      'Facebook updates have been enabled. ' +
                                'Reloading...',

        'updates_disabled':     'Facebook updates have been disabled. ' +
                                'Reloading...'
      },
      /**
       * Define status messages for YouTube service
       */
      'YouTube': {

        'renewed':    'Access privileges for YouTube have been renewed.',

        'connected':  'You are now connected with YouTube. YouTube ' +
                      'settings are now available for configuration.',

        'already_connected':    'You\'re already connected with YouTube.',

        'not_connected':        'You\'re not connected with YouTube.',

        'not_configured':       'YouTube is not currently configured.',

        'missing_permissions':  'Missing permissions for YouTube have been ' +
                                'regranted.',

        'updates_enabled':      'YouTube updates have been enabled. ' +
                                'Reloading...',

        'updates_disabled':     'YouTube updates have been disabled. ' +
                                'Reloading...',

        'refreshed_token':      'Refreshed Access Token'
      }
    }
};

module.exports = messages;
