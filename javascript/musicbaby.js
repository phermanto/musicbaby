var LEVELS = ['level1', 'level2', 'level3', 'level4', 'level5'];

function getSimilarArtists(artistNames) {
    var NUM_RESULTS = 4;
    var similarUrl = 'http://developer.echonest.com/api/v4/artist/similar?api_key=' + API_KEYS.ECHONEST;
    var options = '&format=json&results=' + NUM_RESULTS + '&start=0';
    var nameParameters = _.map(artistNames, function (name) {
        return '&name=' + name.trim().split(' ').join('%20');
    }); 
    var nameParameter = nameParameters.join("");
    var url = similarUrl + options + nameParameter;

    apiGet(url, function (data) {
        displayResult(data);
    });
}

function displayResult(data) {
    $('#offspring_artists').empty();
    _.each(data.artists, function (artist) {
        _renderTemplate("offspring_artist_template", $('#offspring_artists'), {artistName: artist.name})
    });
    _addArtistClickListener();
}

function _addArtistToParents() {
    var artistName = $('#add_artist_search').val();
     $('#add_artist_search').val("");
    // TODO: we should be able to search eventually
    _renderTemplate("selected_artist_template", $("#selected_artists"), {artistName: artistName});

    
    $('.increase_artist_influence').click(function (elem) {
        var parentElement = $(this.parentElement);
        var classes = parentElement.attr('class');
        var level = classes.substring(classes.indexOf("level"), classes.indexOf("level") + 6);
        
        var currLevelIndex = LEVELS.indexOf(level);
        if (currLevelIndex !== LEVELS.length - 1) {
            parentElement.removeClass(level);
            var nextLevel = LEVELS[currLevelIndex + 1];
            parentElement.addClass(nextLevel);
        }
    });
    $('.decrease_artist_influence').click(function (elem) {
        var parentElement = $(this.parentElement);
        var classes = parentElement.attr('class');
        var level = classes.substring(classes.indexOf("level"), classes.indexOf("level") + 6);
        
        var currLevelIndex = LEVELS.indexOf(level);
        if (currLevelIndex !== 0) {
            parentElement.removeClass(level);
            var prevLevel = LEVELS[currLevelIndex - 1];
            parentElement.addClass(prevLevel);
        }
    });
    $('.remove_selected_artist').click(function (elem) {
        $(this.parentElement).remove();
    });
    _addArtistClickListener();
}

function _addArtistClickListener() {
    $('.artist').click(function (elem) {
        var artistName = $(elem.target).text();
        $('#artist_information').empty().append("Stay Tuned! You'll see artist information for " + artistName.toUpperCase() + " here shortly.");
    });
}

function _fetchSimilarArtists() {
    var artistParents = $('.selected_artist');
    var artistNames = _.map(artistParents, function (artist) {
        return $(artist).text();
    });
    getSimilarArtists(artistNames);
}

function _renderTemplate(templateName, elem, params) {
    var html = new EJS({url: 'templates/' + templateName + ".ejs"}).render(params);
    elem.append(html);
}

$(document).ready(function () {
    $('#add_artist_button').click(_addArtistToParents);
    $('#make_babies_button').click(_fetchSimilarArtists)
});
