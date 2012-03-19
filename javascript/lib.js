var API_KEYS = {
    ECHONEST: "OHP0QTFABSN4VMYBO"
};
function apiGet (url) {
    return $.get(url).pipe(function (response) {
        return response.response;
    });
}

function getEchonestURL (baseurl, numResults, extraParams) {
    var echonestUrl = baseurl + '?api_key=' + API_KEYS.ECHONEST;
    echonestUrl += '&format=json&results=' + numResults + '&start=0';
    echonestUrl += extraParams;
    return encodeURI(echonestUrl);
}

function _renderTemplate(templateName, elem, params, is_clear_elem) {
    if (is_clear_elem) {
        elem.empty();
    }
    var html = new EJS({url: 'templates/' + templateName + ".ejs"}).render(params);
    elem.append(html);
}
