var LEVELS = ['level1', 'level2', 'level3', 'level4', 'level5'];

function getSimilarArtists(artistNames) {
    var NUM_RESULTS = 4;
    var similarUrl = 'http://developer.echonest.com/api/v4/artist/similar';
    var nameParameters = _.map(artistNames, function (name) {
        var artistElem = $('.artist:contains(' + name + ')').parent();
        var level = _getArtistLevel(artistElem);
        return '&name=' + name + "^" + LEVELS.indexOf(level);
    }); 
    var url = getEchonestURL(similarUrl, NUM_RESULTS, nameParameters.join(""));

    $.when(apiGet(url))
        .then(function (data) {
            displaySimilarArtistsResult(data);
        });
}

function displaySimilarArtistsResult(data) {
    $('#offspring_artists').empty();
    _.each(data.artists, function (artist) {
        _renderTemplate("offspring_artist_template", $('#offspring_artists'), {artistName: artist.name})
    });
    _addArtistClickListener();
}

function getArtistBiography(artistName) {
    var biographyUrl = "http://developer.echonest.com/api/v4/artist/biographies"
    var parameters = "&name=" + artistName +"&license=cc-by-sa";
    var url = getEchonestURL(biographyUrl, 1, parameters);
    return $.when(apiGet(url))
        .pipe(function (data) {
            return data.biographies[0];
        });
}

function _getArtistLevel(artistElement) {
    var classPrefix = "level";

    var classes = artistElement.attr('class');
    return classes.substring(classes.indexOf(classPrefix), classes.indexOf(classPrefix) + classPrefix.length + 1);
}

function _updateArtistInfluenceBar(barElem, level) {
    var levelIndex = LEVELS.indexOf(level);
    var percentage = levelIndex/LEVELS.length*100;
    if (percentage === 0) {
        percentage += 10;
    }
    barElem.css({"width": percentage + "%"})
}

function _addArtistToParents() {
    var artistName = $('#add_artist_search').val().trim();
    if (artistName.length > 0) {
        $('#add_artist_search').val("");
        _renderTemplate("selected_artist_template", $("#selected_artists"), {artistName: artistName});
    
        
        $('.increase_artist_influence').click(function (elem) {
            var parentElement = $(this.parentElement.parentElement);
            var level = _getArtistLevel(parentElement);

            var currLevelIndex = LEVELS.indexOf(level);
            if (currLevelIndex !== LEVELS.length - 1) {
                parentElement.removeClass(level);
                var nextLevel = LEVELS[currLevelIndex + 1];
                parentElement.addClass(nextLevel);
                _updateArtistInfluenceBar(parentElement.find('.bar'), nextLevel);
            }
        });
        $('.decrease_artist_influence').click(function (elem) {
            var parentElement = $(this.parentElement.parentElement);
            var level = _getArtistLevel(parentElement);

            var currLevelIndex = LEVELS.indexOf(level);
            if (currLevelIndex !== 0) {
                parentElement.removeClass(level);
                var prevLevel = LEVELS[currLevelIndex - 1];
                parentElement.addClass(prevLevel);
                _updateArtistInfluenceBar(parentElement.find('.bar'), prevLevel);
            }
        });
        $('.remove_selected_artist').click(function (elem) {
            $(this.parentElement.parentElement).remove();
        });
        _addArtistClickListener();
    }
}

function _addArtistClickListener() {
    $('.artist').click(function (elem) {
        var artistName = $(elem.target).text();
        $.when(getArtistBiography(artistName))
            .then(function (data) {
                _renderTemplate('artist_info_blurb', $('#artist_blurb'), {artist_blurb: data.text}, true);
            });
        var info = $.when(getArtistInfo(artistName))
            .then(function(data) {
                if (data.image.length !== 0) {
                    _showArtistImage(data);
                } else {
                    showArtistAlbumImage(data.uri, _showArtistImage);
                }
            });
    });
}

function _fetchSimilarArtists() {
    var artistParents = $('.selected_artist');
    var artistNames = _.map(artistParents, function (artist) {
        return $(artist).text().trim();
    });
    getSimilarArtists(artistNames);
}

function _showArtistImage(data) {
    _renderTemplate('artist_info_image', $('#artist_image'), {artist_image: data.image}, true);
}

function showArtistAlbumImage(artistURI, callback) {
    // this method almost always returns an image but figuring out this spotify api callback is ... difficult
    sp.core.browseUri(artistURI, {
        onSuccess: callback
    });
}

function getArtistInfo(artist) {
    // this method doesn't always return an image
    return $.when(_getArtistURI(artist))
        .pipe(function(artistURI){
            var artistData = m.Artist.fromURI(artistURI);
            return {
                image: artistData.data.portrait,
                uri: artistURI
            };
        });
}

function _getArtistURI(artist) {
    var url = "http://ws.spotify.com/search/1/artist.json?q=" + encodeURI(artist);
    return $.get(url).pipe(function (data) {
        return data.artists[0].href;
    });
}

$(document).ready(function () {
    // ability to add artist to parents
    $('#add_artist_button').click(_addArtistToParents);
    $('#add_artist_search').keyup(function (e) {
        if (e.keyCode === 13) {
            _addArtistToParents();
        }
    });
    $('#add_artist_search').typeahead({
        source: function (typeahead, query) {
            var url = encodeURI("http://ws.spotify.com/search/1/artist.json?q=" + query);
            $.ajax({
                url: url,
                success: function (data) {
                    var artists = _.map(data.artists, function (artist) {
                        return artist.name;
                    });
                    typeahead.process(artists);
                }
            });
        }
    });
    $('#clear_artists_button').click(function () {
        $('.selected_artist').remove();
        $('.offspring_artist').remove();
    });
    // ability to make children
    $('#make_babies_button').click(_fetchSimilarArtists)
});
