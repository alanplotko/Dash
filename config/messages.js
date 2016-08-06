// Define messages used across Dash
var messages = {

  /**
   * Define error messages for mainly services and authentication
   */
  ERROR: {

    /**
     * Define general error message
     */
    GENERAL: 'An error occurred. Please try again in a few minutes.',

    /**
     * Define error messages for the error page in various environments
     */
    ERROR_PAGE: {

      INTERNAL_SERVER_ERROR:
        'An error occurred! Click the button below ' +
        'to return to the front page.<br /><br />If you were in the ' +
        'middle of trying to do something, then try again after ' +
        'a few minutes.<br /><br />If you\'re still experiencing ' +
        'problems, then let the team know!',

      PAGE_NOT_FOUND:
        'That\'s strange... we couldn\'t find what you were ' +
        'looking for.<br /><br />If you\'re sure that you\'re in the right ' +
        'place, let the team know.<br /><br />Otherwise, if you\'re lost, ' +
        'you can find your way back to the front page using the button below.'
    },

    /**
     * Define error messages for user credentials (e.g. login, register)
     */
    CREDENTIALS: {

      MISSING:
        'ERROR: Please check if you\'ve typed in your credentials.',

      INCORRECT:
        'ERROR: The email address or password is incorrect.',

      LOCKED:
        'ERROR: The account is temporarily locked.',

      PASSWORD:
        'ERROR: Password confirmation failed. Please check ' +
        'if you\'ve typed in your password correctly.',

      REGISTER_SUCCESS:
        'You have successfully registered! You should ' +
        'receive an email momentarily for verifying your ' +
        'email address. Click on the link in that email ' +
        'to proceed.',

      REGISTER_FAILURE:
        'ERROR: Registration failed. Please try again in a few minutes.',

      ACCOUNT_EXISTS:
        'ERROR: you already have an account. ' +
        '<a href="/login">Proceed to login?</a>'
    },

    /**
     * Define error messages for Facebook service issues and functions
     */
    FACEBOOK: {

      REFRESH:
        'Could not connect to Facebook service. ' +
        'Access privileges may have expired. ' +
        '<a href="/services/refresh_token/' +
        'facebook">Renew access privileges?</a>',

      REAUTH: {
        GROUPS: 'You do not have any configurable Facebook ' +
        'groups at this time. It is possible you ' +
        'may be missing required permissions. ' +
        '<a href="/services/reauth/youtube">Reauthenticate ' +
        'just in case?</a>',

        PAGES:
          'You do not have any configurable Facebook ' +
          'pages at this time. It is possible you ' +
          'may be missing required permissions. ' +
          '<a href="/services/reauth/youtube">Reauthenticate ' +
          'just in case?</a>'
      }
    },

    /**
     * Define error messages for YouTube service issues and functions
     */
    YOUTUBE: {

      REFRESH:
        'Could not connect to YouTube service. ' +
        'Access privileges may have expired. ' +
        '<a href="/services/refresh_token/' +
        'youtube">Renew access privileges?</a>',

      REAUTH: {
        SUBSCRIPTIONS:
          'You do not have any configurable YouTube ' +
          'subscriptions at this time. It is possible ' +
          'you may be missing required permissions. ' +
          '<a href="/services/reauth/youtube">' +
          'Reauthenticate just in case?</a>'
      }
    }
  },

  /**
   * Define status messages
   */
  STATUS: {

    /**
     * Define general status messages
     */
    GENERAL: {

      NEW_POSTS:
        'New posts! Reloading...',

      NO_POSTS:
        'No new posts.',

      RESET_SERVICE:
        'Successfully reset service. Reloading...'
    },

    /**
    * Define status messages for Facebook service
    */
    FACEBOOK: {

      REMOVED:
        'Your Facebook service has been removed.',

      RENEWED:
        'Access privileges for Facebook have been renewed.',

      PAGES_UPDATED:
        'Your Facebook pages have been updated.',

      GROUPS_UPDATED:
        'Your Facebook groups have been updated.',

      CONNECTED:
        'You are now connected with Facebook. Facebook ' +
        'settings are now available for configuration.',

      ALREADY_CONNECTED:
        'You\'re already connected with Facebook.',

      NOT_CONNECTED:
        'You\'re not connected with Facebook.',

      NOT_CONFIGURED:
        'Facebook is not currently configured.',

      MISSING_PERMISSIONS:
        'Missing permissions for Facebook have been ' +
        'regranted.',

      UPDATES_ENABLED:
        'Facebook updates have been enabled. ' +
        'Reloading...',

      UPDATES_DISABLED:
        'Facebook updates have been disabled. ' +
        'Reloading...',

      ACCESS_PRIVILEGES:
        'Facebook access privileges must be renewed. ' +
        'Reloading...'
    },

    /**
     * Define status messages for YouTube service
     */
    YOUTUBE: {

      REMOVED:
        'Your YouTube service has been removed.',

      RENEWED:
        'Access privileges for YouTube have been renewed.',

      SUBSCRIPTIONS_UPDATED:
        'Your YouTube subscriptions have been updated.',

      CONNECTED:
        'You are now connected with YouTube. YouTube ' +
        'settings are now available for configuration.',

      ALREADY_CONNECTED:
        'You\'re already connected with YouTube.',

      NOT_CONNECTED:
        'You\'re not connected with YouTube.',

      NOT_CONFIGURED:
        'YouTube is not currently configured.',

      MISSING_PERMISSIONS:
        'Missing permissions for YouTube have been regranted.',

      UPDATES_ENABLED:
        'YouTube updates have been enabled. Reloading...',

      UPDATES_DISABLED:
        'YouTube updates have been disabled. Reloading...',

      REFRESHED_TOKEN:
        'Refreshed Access Token',

      ACCESS_PRIVILEGES:
        'YouTube access privileges must be renewed. ' +
        'Reloading...'
    }
  },

  /**
   * Define settings messages
   */
  SETTINGS: {

    /**
     * Define settings messages for the user's display name
     */
    DISPLAY_NAME: {

      INVALID:
        'Please enter a valid display name.',

      CHANGE_SUCCEEDED:
        'New display name set. Reloading...',

      CHANGE_FAILED:
        'Display name update failed. Please try again ' +
        'in a few minutes.'
    },

    /**
     * Define settings messages for the user's avatar
     */
    AVATAR: {

      INVALID:
        'Avatar URL invalid. Please select a valid avatar URL.',

      CHANGE_SUCCEEDED:
        'Avatar updated. Reloading...',

      CHANGE_FAILED:
        'Avatar update failed. Please try again in a ' +
        'few minutes.',

      RESET_SUCCEEDED:
        'Your avatar has been reverted to using ' +
        'Gravatar. Reloading...',

      RESET_FAILED:
        'Avatar reset failed. Please try again in a few minutes.'
    },
    /**
     * Define settings messages for the user's email address
     */
    EMAIL: {

      EXISTS:
        'Email address already in use. Please enter a different email ' +
        'address.',

      INVALID:
        'Email address invalid. Please enter a valid email address.',

      INCORRECT:
        'Incorrect email address. You need to create an ' +
        'account first, before you can proceed with the ' +
        'verification process.',

      VERIFIED:
        'Email address verification complete! You may now login.',

      CHANGE_SUCCEEDED:
        'Email address updated. Reloading...',

      CHANGE_FAILED:
        'Email address update failed. Please try again in a few minutes.',

      VERIFICATION_EXPIRED:
        'Incorrect verification token. You need to ' +
        'create an account first, before you can ' +
        'proceed with the verification process.',

      VERIFICATION_RESENT:
        'Email address verification resent! Please ' +
        'wait a few minutes for the email to arrive.',

      CONFIRMATION_EMAIL_FAILED:
        'A confirmation email failed to send. However, your account has ' +
        'been verified.'
    },

    /**
     * Define settings messages for the user's password
     */
    PASSWORD: {

      INVALID:
        'Please enter a valid password.',

      NO_MATCH:
        'Please ensure the passwords match.',

      NOT_NEW:
        'New password invalid. Your new password cannot be ' +
        'the same as your current password.',

      CHANGE_SUCCEEDED:
        'Password updated. Reloading...',

      CHANGE_FAILED:
        'Password update failed. Please try again in a few minutes.',

      UNAUTHORIZED:
        'Please enter your current password correctly ' +
        'to authorize the password change.'
    },

    /**
     * Define settings messages for the user's account
     */
    ACCOUNT: {

      DELETE_SUCCEEDED:
        'Account deletion processed. Reloading...',

      DELETE_FAILED:
        'Account deletion failed. Please try again in a ' +
        'few minutes.',

      SERVICES_ACTIVE:
        'Account deletion failed. Please remove all ' +
        'services beforehand.'
    }
  }
};

module.exports = messages;
