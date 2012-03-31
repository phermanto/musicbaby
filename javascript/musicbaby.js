var INFLUENCE_SCALE = ["1", "2", "3", "4", "5"];
var DEFAULT_INFLUENCE = INFLUENCE_SCALE[2];

function getArtistBiography(artistName) {
    var biographyUrl = "http://developer.echonest.com/api/v4/artist/biographies";
    var parameters = [
        {name: "name",
         value: artistName},
        {name: "license",
         value: "cc-by-sa"}
    ];
    return $.when(echonestGet(biographyUrl, 1, parameters))
        .pipe(function (data) {
            return data.biographies[0];
        });
}

function _getArtistInfluenceIndex(artistElem) {
    return INFLUENCE_SCALE.indexOf(artistElem.attr("influence"));
}

function _updateArtistInfluenceBar(barElem, levelIndex) {
    var percentage = levelIndex/INFLUENCE_SCALE.length*100;
    if (percentage === 0) {
        percentage += 10;
    }
    barElem.css({"width": percentage + "%"})
}

function _addArtistToParentsHandler() {
    var artistName = $('#add_artist_search').val().trim();

    if (artistName.length > 0) {
        // reset artist search bar contents
        $('#add_artist_search').val("");
        renderTemplate("selected_artist_template", $("#selected_artists"), {artistName: artistName, defaultInfluence: DEFAULT_INFLUENCE});
        _addParentArtistClickListeners(_getArtistElem(artistName));
    }
}

function _addParentArtistClickListeners(artistElem) {
    var parentElem = artistElem.parent();
    parentElem.find(".increase_artist_influence").click(_increaseParentArtistInfluenceHandler);
    parentElem.find(".decrease_artist_influence").click(_decreaseParentArtistInfluenceHandler);
    parentElem.find('.remove_selected_artist').click(function (elem) {
        $(elem.currentTarget.parentElement.parentElement).remove();
    });
    _addArtistClickListener(artistElem);
}

function _increaseParentArtistInfluenceHandler (elem) {
    var parentElement = $(elem.currentTarget.parentElement.parentElement);

    var currLevelIndex = _getArtistInfluenceIndex(parentElement);
    if (currLevelIndex !== INFLUENCE_SCALE.length - 1) {
        var nextLevelIndex = currLevelIndex + 1;
        parentElement.attr("influence", INFLUENCE_SCALE[nextLevelIndex]);
        _updateArtistInfluenceBar(parentElement.find('.bar'), nextLevelIndex);
    }
}

function _decreaseParentArtistInfluenceHandler (elem) {
    var parentElement = $(elem.currentTarget.parentElement.parentElement);

    var currLevelIndex = _getArtistInfluenceIndex(parentElement);
    if (currLevelIndex !== 0) {
        var prevLevelIndex = currLevelIndex - 1;
        parentElement.attr("influence", INFLUENCE_SCALE[prevLevelIndex]);
        _updateArtistInfluenceBar(parentElement.find('.bar'), prevLevelIndex);
    }
}

function _addArtistClickListener(artistAddedElem) {
    artistAddedElem.click(function (elem) {
        var artistName = $(elem.target).text();

        // get top songs for an artist
        _getTopSongs(artistName, _displayArtistSongs);

        // show artist bio data
        $.when(getArtistBiography(artistName))
            .then(function (data) {
                renderTemplate('artist_info_blurb', $('#artist_blurb'), {artist_blurb: data.text}, true);
            });
        // show artist image
        $.when(getArtistInfo(artistName))
            .pipe(function(data) {
                if (data.image && data.image.length !== 0) {
                    _showArtistImage(data.uri, data.image);
                } else {
                    _showArtistAlbumImage(data.uri, _showArtistImage);
                }
            });
    });
}

function _fetchSimilarArtistsHandler() {
    var artistParents = $('.selected_artist');
    var artists = _.map(artistParents, function (artist) {
        var artistElem = $(artist);
        return {
            name: artistElem.text().trim(),
            levelIndex: _getArtistInfluenceIndex(artistElem)
        };
    });
    // get and display similar artists
    $("#divider").show();
    $.when(getSimilarArtists(artists))
        .then(function (similarArtists) {
            displaySimilarArtistsResult(similarArtists);
        });
}

function getSimilarArtists(artists) {
    var NUM_RESULTS = 4;
    var similarUrl = 'http://developer.echonest.com/api/v4/artist/similar';
    var parameters = _.map(artists, function (artist) {
        return {
            name: "name",
            value: artist.name + "^" + artist.levelIndex
        };
    });

    return $.when(echonestGet(similarUrl, NUM_RESULTS, parameters))
        .pipe(function (data) {
            return data.artists;
        });
}

function _getArtistElem (artistName) {
    return $('.artist:contains("' + artistName + '")');
}

function displaySimilarArtistsResult(artists) {
    $('#offspring_artists').empty();
    _.each(artists, function (artist) {
        renderTemplate("offspring_artist_template", $('#offspring_artists'), {artistName: artist.name})
        var offspringElem = _getArtistElem(artist.name);
        _addArtistClickListener(offspringElem);
    });
}

function _showArtistImage(uri, image) {
    renderTemplate('artist_info_image', $('#artist_image'), {artistImage: image, artistLink: uri}, true);
}

function _showArtistAlbumImage(artistURI, callback) {
    // this method almost always returns an image but figuring out this spotify api callback is ... difficult
    sp.core.browseUri(artistURI, {
        onSuccess: function (data) {
            callback(artistURI, data.image);
        }
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

function _getTopSongs(artist, topSongsHandler) {
    var sp = getSpotifyApi(1);
    var models = sp.require("sp://import/scripts/api/models");
    var views = sp.require("sp://import/scripts/api/views");

    var playlist = [];

    var search = new models.Search('artist:"' + artist + '"');
    search.localResults = models.LOCALSEARCHRESULTS.IGNORE;
    search.searchPlaylists = false;
    search.searchAlbums = false;
    search.pageSize = 5;

    search.observe(models.EVENT.CHANGE, function(result) {
        result.tracks.forEach(function(track) {
            playlist.push(track);
        });

        _displayArtistSongs(playlist);
    });

    search.appendNext();
}

function _displayArtistSongs(tracks) {
    $("#artist_songs").empty();
    _.each(tracks, function (track) {
        renderTemplate("artist_song_template", $('#artist_songs'), {songName: track.name, songUri: track.uri})
    });
    
}

$(document).ready(function () {
    // ability to add artist to parents list
    $('#add_artist_button').click(_addArtistToParentsHandler);
    $('#add_artist_search').keyup(function (e) {
        if (e.keyCode === 13) {
            _addArtistToParentsHandler();
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
        $("#divider").hide();
    });
    $("#divider").hide();
    // ability to make children
    $('#make_babies_button').click(_fetchSimilarArtistsHandler)
});
