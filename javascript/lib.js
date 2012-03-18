var API_KEYS = {
    ECHONEST: "OHP0QTFABSN4VMYBO"
};
function apiGet (url, callback) {
    $.get(url, function (response) {
        callback(response.response);
    });
}

function _renderTemplate(templateName, elem, params) {
    var html = new EJS({url: 'templates/' + templateName + ".ejs"}).render(params);
    elem.append(html);
}
