var API_KEYS = {
    ECHONEST: "OHP0QTFABSN4VMYBO"
};

function apiGet (url, callback) {
    $.get(url, function (response) {
        callback(response.response);
    });
}