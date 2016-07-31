// --------- Dependencies ---------
var messages = require.main.require('./config/messages');

/**
 * Enums for use with storing a key-value pair in the user's session.
 */
var ENUMS = module.exports.ENUMS = {
  REFRESH_TOKEN: {key: 'refreshAccessToken', value: true},
  AUTH: {key: 'reauth', value: false},
  REAUTH: {key: 'reauth', value: true}
};

/**
 * Handles authentication and token refreshes by setting the flag in the user's
 * session.
 * @param  {string}   flag The enum to look for setting the key-value pair in
 *                         the user's session
 * @param  {Object}   req  The current request
 * @param  {Object}   res  The response
 * @param  {Function} next Pass control to the next matching route
 */
module.exports.handleSessionFlag = function(flag, req, res, next) {
  req.session[ENUMS[flag].key] = ENUMS[flag].value;
  next();
};

/**
 * Handles the last step of indicating the result of the process to the user.
 * @param  {string} errorRedirect The page to redirect to if an error occurs
 * @param  {string} message       The message to send to the user on success
 * @param  {Object} err           An error, if one has occurred
 * @param  {Object} req           The current request
 * @param  {Object} res           The response
 */
module.exports.handlePostSave = function(errorRedirect, message, err, req,
    res) {
  // An error occurred
  if (err) {
    req.flash('setupMessage', err.toString());
    res.redirect(errorRedirect);
  } else {
    // Saved subscriptions; return to services page
    req.flash('serviceMessage', message);
    res.redirect('/services');
  }
};

/**
 * Completes the remaining step, after receiving an error for removing a
 * service, to generate a status message for the user.
 * @param  {string} serviceName    The name of the removed service
 * @param  {Object} err            An error, if one has occurred
 * @param  {string} errorMessage   Message to look out for in determining
 *                                 whether an issue occurred
 * @param  {Object} req            The current request
 * @param  {Object} res            The response
 */
module.exports.handlePostRemoveError = function(serviceName, err, errorMessage,
    req, res) {
  // Get new access token if current token was deemed invalid
  if (err) {
    if (err.toString() === errorMessage) {
      req.flash('serviceMessage',
        messages.STATUS[serviceName.toUpperCase()].REFRESH);
    } else {
      req.flash('serviceMessage', messages.ERROR.GENERAL);
    }
  } else {
    req.flash('serviceMessage',
      messages.STATUS[serviceName.toUpperCase()].REMOVED);
  }
  res.redirect('/services');
};

/**
 * Completes the remaining step, after receiving an error for setting up a
 * service, to generate a status message for the user.
 * @param  {string} serviceName    The name of the removed service
 * @param  {Object} err            An error, if one has occurred
 * @param  {string} errorMessage   Message to look out for in determining
 *                                 whether an issue occurred
 * @param  {Object} req            The current request
 * @param  {Object} res            The response
 */
var handlePostSetupError = module.exports.handlePostSetupError =
  function(serviceName, err, errorMessage, req, res) {
    // Get new access token if current token was deemed invalid
    if (err.toString() === errorMessage) {
      req.flash('serviceMessage',
        messages.STATUS[serviceName.toUpperCase()].REFRESH);
    } else {
      req.flash('serviceMessage', err.toString());
    }
    res.redirect('/services');
  };

/**
 * Retrieves all new activity on the service.
 * @param  {Object}   settings        An object containing the service name and
 *                                    a singular term describing the content
 * @param  {Object}   err             An error, if one has occurred
 * @param  {Object[]} allContent      A list of items representing all available
 *                                    content including those that the user
 *                                    has selected
 * @param  {Object[]} existingContent A list of items representing only content
 *                                    that the user has selected
 * @param  {Object}   req             The current request
 * @param  {Object}   res             The response
 */
module.exports.retrieveActivity = function(settings, err, allContent,
    existingContent, req, res) {
  settings.plural = settings.singular + 's';  // Set up the plural term
  settings.id = settings.singular + 'Id';     // Set up the id name
  // An error occurred
  if (err) {
    handlePostSetupError(settings.name, err, settings.error ||
      '400-' + settings.name, req, res);
  // Found content
  } else if (Object.keys(allContent).length > 0) {
    // Fill in checkboxes for existing content
    if (existingContent.length > 0) {
      var ids = [];

      existingContent.forEach(function(item) {
        ids.push(item[settings.id]);
      });

      for (var key in allContent) {
        if (ids.indexOf(allContent[key].id) > -1) {
          allContent[key].checked = true;
        } else {
          allContent[key].checked = false;
        }
      }
    }

    res.render(settings.name.toLowerCase() + '-setup', {
      message: req.flash('setupMessage'),
      content: allContent,
      contentName: settings.plural
    });
  // No content found; return to services page
  } else {
    req.flash('serviceMessage', messages.ERROR[settings.name.toUpperCase()]
      .REAUTH[settings.plural.toUpperCase()]);
    res.redirect('/services');
  }
};
