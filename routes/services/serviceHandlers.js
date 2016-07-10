// --------- Dependencies ---------
var messages = require.main.require('./config/messages');

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
  if (err && err.toString() === errorMessage) {
    req.flash('serviceMessage',
      messages.STATUS[serviceName.toUpperCase()].REFRESH);
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

module.exports.retrieveActivity = function(err, settings, allContent,
    existingContent, type, req, res) {
  // An error occurred
  if (err) {
    handlePostSetupError(settings.name, err, settings.error, req, res);
  // Found content
  } else if (Object.keys(allContent).length > 0) {
    // Fill in checkboxes for existing content
    if (existingContent.length > 0) {
      var ids = [];

      existingContent.forEach(function(item) {
        ids.push(item[type.id]);
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
      contentName: type.name
    });
  // No content found; return to services page
  } else {
    req.flash('serviceMessage', messages.ERROR[settings.name.toUpperCase()]
      .REAUTH[type.name.toUpperCase()]);
    res.redirect('/services');
  }
};
