// --------- Dependencies ---------
var messages = require.main.require('./config/messages');

// Define common route configurations used across Dash
var routes = {
  SETUP: [
    {
      NAME: 'Facebook',
      ROUTE: 'groups',
      MESSAGE: messages.STATUS.FACEBOOK.GROUPS_UPDATED,
      METHOD: 'saveFacebookGroups'
    },
    {
      NAME: 'Facebook',
      ROUTE: 'pages',
      MESSAGE: messages.STATUS.FACEBOOK.PAGES_UPDATED,
      METHOD: 'saveFacebookPages'
    },
    {
      NAME: 'YouTube',
      ROUTE: 'subscriptions',
      MESSAGE: messages.STATUS.YOUTUBE.SUBSCRIPTIONS_UPDATED,
      METHOD: 'saveYouTubeSubs'
    }
  ],
  REMOVE: [
    {
      NAME: 'Facebook',
      METHOD: 'removeFacebook'
    },
    {
      NAME: 'YouTube',
      METHOD: 'removeYouTube'
    }
  ],
  AUTHENTICATION: [
    {
      NAME: 'Facebook',
      SCOPE: ['user_managed_groups', 'user_likes']
    },
    {
      NAME: 'YouTube',
      SCOPE: [
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/youtube.readonly'
      ]
    }
  ],
  AUTH_CALLBACK: ['Facebook', 'YouTube'],
  REFRESH_TOKEN: ['Facebook', 'YouTube']
};

module.exports = routes;
