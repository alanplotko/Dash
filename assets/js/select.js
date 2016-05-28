$(document).ready(function() {
    var numSubs = $('#setupForm .youtube-sub-card').
        find('.card-action :checkbox').size();
    var numChecked = $('#setupForm .youtube-sub-card').
        find('.card-action :checkbox:checked').size();
    if (numChecked == numSubs) {
        $('#selectAll').prop('checked', true);
    }

    $('#selectAll').change(function() {
        var checkedStatus = this.checked;
        if (checkedStatus) {
            $('#setupForm .youtube-sub-card').
                find('.card-action :checkbox').each(function() {
                $(this).prop('checked', checkedStatus);
            });
        } else {
            $('#setupForm .youtube-sub-card')
                .find('.card-action :checkbox').each(function() {
                $(this).prop('checked', null);
            });
        }
    });
});
