var API_KEYS = {
    ECHONEST: "OHP0QTFABSN4VMYBO"
};
function apiGet (url) {
    return $.get(url).pipe(function (response) {
        return response.response;
    });
}

function echonestGet (baseURL, numResults, parameters) {
    var url = _getEchonestURL(baseURL, numResults, parameters);
    return apiGet(url);
}

function _getEchonestURL (baseURL, numResults, parameters) {
    var echonestUrl = baseURL + '?api_key=' + API_KEYS.ECHONEST;
    echonestUrl += '&format=json&results=' + numResults + '&start=0';
    var extraParams = _getFormattedUrlParameters(parameters);
    echonestUrl += extraParams;
    return encodeURI(echonestUrl);
}

function _getFormattedUrlParameters (parameters) {
    var paramString = "";
    _.each(parameters, function (parameter) {
        paramString += "&" + parameter.name + "=" + parameter.value;
    });
    return paramString;
}

function renderTemplate(templateName, elem, params, is_clear_elem) {
    if (is_clear_elem) {
        elem.empty();
    }
    var html = new EJS({url: 'templates/' + templateName + ".ejs"}).render(params);
    elem.append(html);
}
