// Define messages used across Dash
var messages = {
  /**
   * Define error messages for mainly services and authentication
   */
    'error': {
      /**
       * Define general error message
       */
      'general': 'An error occurred. Please try again in a few minutes.',
      /**
       * Define error messages for the error page in various environments
       */
      'error_page': {

        'internal_server_error':
          'An error occurred! Click the button below ' +
          'to return to the front page.<br /><br />If you were in the ' +
          'middle of trying to do something, then try again after ' +
          'a few minutes.<br /><br />If you\'re still experiencing ' +
          'problems, then let the team know!',

        'page_not_found':
          'That\'s strange... we couldn\'t find what you were ' +
          'looking for.<br /><br />If you\'re sure that you\'re in the right ' +
          'place, let the team know.<br /><br />Otherwise, if you\'re lost, ' +
          'you can find your way back to the front page using the button below.'
      },
      /**
       * Define error messages for user credentials (e.g. login, register)
       */
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
       * Define general status messages
       */
      'general': {

        'new_posts':  'New posts! Reloading...',

        'no_posts':   'No new posts.',

        'reset_connection':   'Successfully reset connection. Reloading...'
      },
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
                                'Reloading...',

        'access_privileges':    'Facebook access privileges must be renewed. ' +
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

        'refreshed_token':      'Refreshed Access Token',

        'access_privileges':    'YouTube access privileges must be renewed. ' +
                                'Reloading...'
      }
    },
    /**
     * Define settings messages
     */
    'settings': {
      /**
       * Define settings messages for the user's display name
       */
      'display_name': {

        'invalid':  'Please enter a valid display name.',

        'change_succeeded': 'New display name set. Reloading...',

        'change_failed':    'Display name update failed. Please try again ' +
                            'in a few minutes.'
      },
      /**
       * Define settings messages for the user's avatar
       */
      'avatar': {

        'invalid':  'Avatar URL invalid. Please select a valid avatar URL.',

        'change_succeeded': 'Avatar updated. Reloading...',

        'change_failed':    'Avatar update failed. Please try again in a ' +
                            'few minutes.',

        'reset_succeeded':  'Your avatar has been reverted to using ' +
                            'Gravatar. Reloading...',

        'reset_failed':     'Avatar reset failed. Please try again in a ' +
                            'few minutes.'
      },
      /**
       * Define settings messages for the user's email address
       */
      'email': {

        'invalid':    'Email address invalid. Please enter a valid email ' +
                      'address.',

        'incorrect':  'Incorrect email address. You need to create an ' +
                      'account first, before you can proceed with the ' +
                      'verification process.',

        'verified':   'Email address verification complete! You may now login.',

        'change_succeeded': 'Email address updated. Remember to verify your ' +
                            'email address! Logging out...',

        'change_failed':    'An error occurred. Please check your inbox a ' +
                            'verification email and request a resend if ' +
                            'necessary. Logging out...',

        'verification_expired': 'Incorrect verification token. You need to ' +
                                'create an account first, before you can ' +
                                'proceed with the verification process.',

        'verification_resent':  'Email address verification resent! Please ' +
                                'wait a few minutes for the email to arrive.'
      },
      /**
       * Define settings messages for the user's password
       */
      'password': {

        'invalid':  'Please enter a valid password.',

        'no_match': 'Please ensure the passwords match.',

        'not_new':  'New password invalid. Your new password cannot be ' +
                    'the same as your current password.',

        'change_succeeded': 'Password updated. Reloading...',

        'change_failed':    'Password update failed. Please try again in a ' +
                            'few minutes.',

        'unauthorized':     'Please enter your current password correctly ' +
                            'to authorize the password change.'
      },
      /**
       * Define settings messages for the user's account
       */
      'account': {

        'delete_succeeded': 'Account deletion processed. Reloading...',

        'delete_failed':    'Account deletion failed. Please try again in a ' +
                            'few minutes.',

        'connections_active':   'Account deletion failed. Please remove all ' +
                                'connections beforehand.'
      }
    }
};

module.exports = messages;
