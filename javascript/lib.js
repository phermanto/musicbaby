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
    var defaultParameters = [
        {name: "format", value: "json"},
        {name: "results", value: numResults},
        {name: "start", value: 0}
    ];
    parameters = parameters.concat(defaultParameters);
    var stringifiedParams = _getFormattedUrlParameters(parameters);
    echonestUrl += stringifiedParams;
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
    var html = getTemplateHtml(templateName, params);
    elem.append(html);
}

function getTemplateHtml(templateName, params) {
    return new EJS({url: 'templates/' + templateName + ".ejs"}).render(params);
}
