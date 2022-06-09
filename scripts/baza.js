$(document).ready(function () {
    $('#events').DataTable({
        ordering: false,
        search: false,
        info: true,
        language: {
            "url": "//cdn.datatables.net/plug-ins/9dcbecd42ad/i18n/Russian.json"
        }
    });
});