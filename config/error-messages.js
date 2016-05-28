// Define error messages for service functions
var error_messages = {
    'Facebook': {
        'refresh': 'Could not connect to Facebook service. ' +
                   'Access privileges may have expired. ' +
                   '<a href="/connect/refresh_token/' +
                   'facebook">Renew access privileges?</a>',
        'reauth':  {
            'groups': 'You do not have any configurable Facebook ' +
                      'groups at this time. It is possible you ' +
                      'may be missing required permissions. ' +
                      '<a href="/connect/reauth/youtube">Reauthenticate ' +
                      'just in case?</a>',
            'pages': 'You do not have any configurable Facebook ' +
                     'pages at this time. It is possible you ' +
                     'may be missing required permissions. ' +
                     '<a href="/connect/reauth/youtube">Reauthenticate ' +
                     'just in case?</a>'
        }
    },
    'YouTube': {
        'refresh': 'Could not connect to YouTube service. ' +
                   'Access privileges may have expired. ' +
                   '<a href="/connect/refresh_token/' +
                   'youtube">Renew access privileges?</a>',
        'reauth':  {
            'subscriptions': 'You do not have any configurable YouTube ' +
                             'subscriptions at this time. It is possible ' +
                             'you may be missing required permissions. ' +
                             '<a href="/connect/reauth/youtube">' +
                             'Reauthenticate just in case?</a>'
        }
    }
};

module.exports = error_messages;
