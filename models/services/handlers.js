module.exports.completeRefresh = function(serviceName, newPosts, user, done) {
  if (newPosts.length > 0) {
    var newUpdate = {
      posts: newPosts,
      description: 'Checking in with ' + serviceName + ' for updates!'
    };
    user.batches.push(newUpdate);
    user.save(function(err) {
      // An error occurred
      if (err) {
        return done(err);
      }

      // Saved posts and update times; return new posts
      return done(null, newPosts);
    });
  // No new posts, set new update time
  } else {
    user.save(function(err) {
      // An error occurred
      if (err) {
        return done(err);
      }
      // Saved new update time
      return done(null, null);
    });
  }
};
