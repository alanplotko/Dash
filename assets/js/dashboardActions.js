function dismiss(id, el) {
    $.post('/dismiss/' + id, function(data) {
        var post = $(el).closest('div.row');
        $.when(post.fadeOut()).then(function() {
            post.remove().delay(1000);
            if (id === 'all' || $('.card').length == 0) window.location.reload();
        });
    });
}

function refresh() {
    $('#refresh').attr('onclick', 'return false;');
    $('#refresh').css('color', '#ffff00');
    $('#contentLoader').remove();
    $('<div id="contentLoader" class="progress"><div class="indeterminate"></div></div>').insertAfter('nav');
    $.post('/refresh', function(data) {
        $('#contentLoader').fadeOut();
        Materialize.toast(data.message, 4000, '', function() {
            if (data.refresh)
            {
                window.location.reload();
            }
            $('#refresh').attr('onclick', 'refresh(); return false;').css('color', '#fff');
        });
    }).fail(function(data) {
        Materialize.toast(data.responseJSON.message, 4000, '', function() {
            $('#contentLoader').fadeOut(function() {
                $('#refresh').attr('onclick', 'refresh(); return false;').css('color', '#fff');
            });
        });
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