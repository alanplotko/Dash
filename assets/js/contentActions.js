function dismiss(id, el) {
    $.post('/dismiss/' + id, function(data) {
        var post = $(el).closest('div.row');
        $.when(post.fadeOut()).then(function() {
            post.remove().delay(1000);
            if (id === 'all') window.location.reload();
        });
    });
}

function refresh() {
    $('#refresh').attr('onclick', 'return false;');
    $('#refresh').css('color', '#ffff00');
    $.post('/refresh', function(data) {
        Materialize.toast(data.message, 4000, '', function() {
            if (data.refresh)
            {
                window.location.reload();
            }
        });
    }).fail(function(data) {
        Materialize.toast(data.responseJSON.message, 4000);
    }).always(function(data) {
        $('#refresh').attr('onclick', 'refresh(); return false;');
        $('#refresh').css('color', '#fff');
    });
}

$(document).ready(function() {
    update = function() {
        var times = $('.card.facebook p.timestamp').toArray();
        times.forEach(function(time) {
            $(time).hide().html(moment(new Date($(time).attr('data-timestamp')).toISOString()).fromNow()).fadeIn(1000);
        });
    };

    setInterval(update, 600000);
});