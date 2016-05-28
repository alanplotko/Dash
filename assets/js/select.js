$(document).ready(function() {
    var numItems = $('#setupForm .card').
        find('.card-action :checkbox').size();
    var numChecked = $('#setupForm .card').
        find('.card-action :checkbox:checked').size();
    if (numChecked == numItems) {
        $('#selectAll').prop('checked', true);
    }

    $('#selectAll').change(function() {
        var checkedStatus = this.checked;
        if (checkedStatus) {
            $('#setupForm .card').
                find('.card-action :checkbox').each(function() {
                $(this).prop('checked', checkedStatus);
            });
        } else {
            $('#setupForm .card')
                .find('.card-action :checkbox').each(function() {
                $(this).prop('checked', null);
            });
        }
    });
});
