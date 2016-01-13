function dismiss(id, connection, el) {
    $.post('/dismiss/' + connection + '/' + id, function(data) {
        var post = $(el).closest('div.row');
        $.when(post.fadeOut()).then(function() {
            post.remove();
        });
    });
    if (id === 'all')
    {
        window.location.reload();
    }
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