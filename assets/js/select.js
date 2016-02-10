$(document).ready(function() {
    var numSubs = $('#setupForm .card.youtubeSub').find('.card-action :checkbox').size();
    var numChecked = $('#setupForm .card.youtubeSub').find('.card-action :checkbox:checked').size();
    if (numChecked == numSubs)
    {
        $('#selectAll').prop('checked', true);
    }

    $('#selectAll').change(function() {
        var checkedStatus = this.checked;
        if (checkedStatus)
        {
            $('#setupForm .card.youtubeSub').find('.card-action :checkbox').each(function() {
                $(this).prop('checked', checkedStatus);
            });
        }
        else
        {
            $('#setupForm .card.youtubeSub').find('.card-action :checkbox').each(function() {
                $(this).prop('checked', null);
            });
        }
    });
});