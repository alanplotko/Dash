function dismiss(id, connection, el) {
    $.post('/dismiss/' + connection + '/' + id, function(data) {
        var post = $(el).closest('div.row');
        $.when(post.fadeOut()).then(function() {
            post.remove();
        });
    });
}