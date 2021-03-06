function dismiss(batchId, postId, el) {
  // Build URL for dismissing a single post or all posts
  let URL;
  if (batchId === 'all' && postId === null) {
    URL = '/dismiss/all';
    $('.batch-heading, .pagination').fadeOut();
  } else {
    URL = '/dismiss/' + batchId + '/' + postId;
  }

  // Send ids to begin dismissal
  $.post(URL, function(data) {
    // Add fade out animation for removed post(s)
    let post = $(el).closest('div.row');
    $.when(post.fadeOut()).then(function() {
      post.remove().delay(1000);
      // If dismissing all posts, refresh the page to repaginate
      if (batchId === 'all' || $('.card').length === 0) {
        window.location.reload();
      }
    });
  });
}

function refresh() {
  $('#refresh')
    .attr('onclick', 'return false;')
    .css('color', '#ffff00');
  $('.refresh-bar').remove();
  $('<div class="refresh-bar progress"> <div class="indeterminate"></div>' +
    '</div>').insertAfter('nav');
  $.post('/refresh', function(data) {
    $('.refresh-bar').fadeOut();
    Materialize.toast(data.message, 4000, '', function() {
      if (data.refresh) {
        window.location.reload();
      }
      $('#refresh')
        .attr('onclick', 'refresh(); return false;')
        .css('color', '#fff');
    });
  }).fail(function(data) {
    $('.refresh-bar').fadeOut();
    Materialize.toast(data.responseJSON.message, 4000, '', function() {
      if (data.responseJSON.redirectToServices) {
        window.location.href = '/services';
      } else if (data.responseJSON.refresh) {
        window.location.reload();
      }
      $('#refresh')
        .attr('onclick', 'refresh(); return false;')
        .css('color', '#fff');
    });
  });
}

$(document).ready(function() {
  let update = function() {
    let times = $('.card p.timestamp').toArray();
    times.forEach(function(time) {
      let htmlContent = moment(
        new Date($(time).attr('data-timestamp')).toISOString()
      ).fromNow();
      $(time).hide().html(htmlContent).fadeIn(1000);
    });
  };
  setInterval(update, 600000);
});
