function notify(data) {
  Materialize.toast(data.message, 4000, '', function() {
    if (data.refresh) {
      window.location.reload();
    }
  });
}
