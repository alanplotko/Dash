// --------- Dependencies ---------
var messages = require.main.require('./config/messages');

/**
 * Handles the last step of indicating the result of the process to the user.
 * @param  {Object} settings Contains details to pass through for both the error
 *                           and success scenarios
 * @param  {Object} err      An error, if one has occurred
 * @param  {Object} req      The current request
 * @param  {Object} res      The response
 */
module.exports.handlePostSave = function(settings, err, req, res) {
  // An error occurred
  if (err) {
    req.flash(settings.error.target, err.toString());
    res.redirect(settings.error.redirect);
  } else {
    // Saved subscriptions; return to services page
    req.flash(settings.success.target, settings.success.message);
    res.redirect(settings.success.redirect);
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
module.exports.handlePostSetupError = function(serviceName, err, errorMessage,
    req, res) {
  // Get new access token if current token was deemed invalid
  if (err.toString() === errorMessage) {
    req.flash('serviceMessage',
      messages.STATUS[serviceName.toUpperCase()].REFRESH);
  } else {
    req.flash('serviceMessage', err.toString());
  }
  res.redirect('/services');
};
