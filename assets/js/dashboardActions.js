function dismiss(batchId, postId, el) {
    var URL;
    if (batchId === 'all' && postId === null) {
        URL = '/dismiss/all';
    } else {
        URL = '/dismiss/' + batchId + '/' + postId;
    }
    $.post(URL, function(data) {
        var post = $(el).closest('div.row');
        $.when(post.fadeOut()).then(function() {
            post.remove().delay(1000);
            if (batchId === 'all' || $('.card').length === 0) {
                window.location.reload();
            }
        });
    });
}

function refresh() {
    $('#refresh').attr('onclick', 'return false;');
    $('#refresh').css('color', '#ffff00');
    $('.refresh-bar').remove();
    $('<div class="refresh-bar progress">' +
        '<div class="indeterminate"></div></div>').insertAfter('nav');
    $.post('/refresh', function(data) {
        $('.refresh-bar').fadeOut();
        Materialize.toast(data.message, 4000, '', function() {
            if (data.refresh) {
                window.location.reload();
            }
            $('#refresh').attr('onclick',
                'refresh(); return false;').css('color', '#fff');
        });
    }).fail(function(data) {
        $('.refresh-bar').fadeOut();
        Materialize.toast(data.responseJSON.message, 4000, '', function() {
            if (data.responseJSON.toConnect) {
                window.location.href = '/connect';
            } else if (data.responseJSON.refresh) {
                window.location.reload();
            }
            $('#refresh').attr('onclick',
                'refresh(); return false;').css('color', '#fff');
        });
    });
}

$(document).ready(function() {
    update = function() {
        var times = $('.card p.timestamp').toArray();
        times.forEach(function(time) {
            $(time).hide().html(moment(new Date($(time).attr('data-' +
                'timestamp')).toISOString()).fromNow()).fadeIn(1000);
        });
    };

    setInterval(update, 600000);
});
