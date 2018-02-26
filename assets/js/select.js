$(document).ready(function() {
  let numItems = $('#setupForm .card').find('.card-action :checkbox').length;
  let numChecked = $('#setupForm .card')
    .find('.card-action :checkbox:checked')
    .length;

  if (numChecked === numItems) {
    $('#selectAll').prop('checked', true);
  }

  $('#selectAll').change(function() {
    let checkedStatus = this.checked;
    if (checkedStatus) {
      $('#setupForm .card')
        .find('.card-action :checkbox')
        .each(function() {
          $(this).prop('checked', checkedStatus);
        });
    } else {
      $('#setupForm .card')
        .find('.card-action :checkbox')
        .each(function() {
          $(this).prop('checked', null);
        });
    }
  });
});
