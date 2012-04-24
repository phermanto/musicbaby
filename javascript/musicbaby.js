var INFLUENCE_SCALE = ["1", "2", "3", "4", "5"];
var DEFAULT_INFLUENCE = INFLUENCE_SCALE[2];
var MAX_PARENTS = 5;
var NUM_RESULTS_SIMILAR_ARTISTS = 6;
var NUM_RESULTS_ARTIST_REVIEWS = 6;
var sp = getSpotifyApi(1);
var models = sp.require("sp://import/scripts/api/models");
var views = sp.require("sp://import/scripts/api/views");
var _toggleArtistSearchBarProxy;

function getArtistBiography(artistName) {
    var biographyUrl = "http://developer.echonest.com/api/v4/artist/biographies";
    var parameters = [
        {name: "name", value: artistName},
        {name: "license", value: "cc-by-sa"}
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

function _addArtistToParentsHandler(artistName) {
    // reset artist search bar contents
    $('#add_artist_search').val("");

    if (artistName.length > 0) {
        var artistInfluenceHtml = getTemplateHtml("artist_parent_influence_template", {artistName: artistName, defaultInfluence: DEFAULT_INFLUENCE});
        _showArtistPlayer(artistName, artistInfluenceHtml, $("#parents_players"));
        var artistPlayerElem = _getArtistPlayerElem(artistName);
        var artistElem = artistPlayerElem.find(".artist");
        artistPlayerElem.hover(
            function () {
                renderTemplate("artist_parent_delete_template", $(this), {});
                $(this).find('.remove_selected_artist').click(function (elem) {
                    $(elem.currentTarget.parentElement.parentElement).remove();
                    _toggleArtistSearchBarProxy();
                });
            },
            function () {
                $(this).find(".selected_artist_action").has(".remove_selected_artist").remove();
                $(this).find('.remove_selected_artist').unbind('click');
            }
        );

        _addParentArtistClickListeners(artistElem);
    }
}

function _addParentArtistClickListeners(artistElem) {
    var parentElem = artistElem.parent();
    parentElem.find(".increase_artist_influence").click(_increaseParentArtistInfluenceHandler);
    parentElem.find(".decrease_artist_influence").click(_decreaseParentArtistInfluenceHandler);
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
        var artistName = $(elem.target).text().trim();
        // clear any currently showing artist data
        $('#artist_blurb').empty();
        $('#artist_image').empty();

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
        // show artist reviews
        $.when(getArtistReviews(artistName))
            .pipe(function(reviews) {
                $('#artist_reviews_container').empty();
                _.each(reviews, function (review) {
                    var formattedReviewDate = "";
                    if (review.date_reviewed) {
                        formattedReviewDate = review.date_reviewed.match(/(^\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}$/)[1];
                    }
                    var formattedReviewName = review.name;
                    var params = {
                        reviewDate: formattedReviewDate,
                        reviewUrl: review.url,
                        reviewText: review.summary,
                        reviewName: formattedReviewName
                    };
                    renderTemplate('artist_review_template', $('#artist_reviews_container'), params);
                });
            });
    });
}

function getArtistReviews(artistName) {
    var reviewsUrl = "http://developer.echonest.com/api/v4/artist/reviews";
    var parameters = [
        {name: "name", value: artistName}
    ];
    return $.when(echonestGet(reviewsUrl, NUM_RESULTS_ARTIST_REVIEWS, parameters))
        .pipe(function (data) {
            return data.reviews;
        });
}

function _fetchSimilarArtistsHandler() {
    var artistParents = $('.selected_artist');
    var artists = _.map(artistParents, function (artist) {
        var artistElem = $(artist);
        return {
            name: artistElem.parent().attr("id"),
            levelIndex: _getArtistInfluenceIndex(artistElem)
        };
    });
    // get and display similar artists
    $.when(getSimilarArtists(artists))
        .then(function (similarArtists) {
            displaySimilarArtistsResult(similarArtists);
        });
}

function getSimilarArtists(artists) {
    var similarUrl = 'http://developer.echonest.com/api/v4/artist/similar';
    var parameters = _.map(artists, function (artist) {
        return {
            name: "name",
            value: artist.name + "^" + artist.levelIndex
        };
    });

    return $.when(echonestGet(similarUrl, NUM_RESULTS_SIMILAR_ARTISTS, parameters))
        .pipe(function (data) {
            return data.artists;
        });
}

function _getNumParentArtists() {
    return $("#parents").find(".artist").length;
}

function _getArtistPlayerElem (artistName) {
    return $('.artist_player[id*="' + artistName + '"]');
}

function _getArtistElem (artistName) {
    return $('.artist:contains("' + artistName + '")');
}

function displaySimilarArtistsResult(artists) {
    $('#offspring_players').empty();
    _.each(artists, function (artist) {
        _showArtistPlayer(artist.name, "", $("#offspring_players"));
    });
}

function _showArtistPlayer(artistName, extraContent, elem) {
    renderTemplate("artist_player_template", elem, {artistName: artistName, extraContent: extraContent});
    _addArtistClickListener(_getArtistElem(artistName));
    _getTopSongs(artistName, _displayArtistSongs);
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

        var playerElem = _getArtistPlayerElem(artist).find(".song_player");
        topSongsHandler(playlist, playerElem);
    });

    search.appendNext();
}

function _displayArtistSongs(tracks, playerElem) {
    // display track player
    var playlist = new models.Playlist();
    _.each(tracks, function (track) {
        playlist.add(track);
    });
    var playerView = new views.Player();
    playerView.track = null;
    playerView.context = playlist;

    playerElem.append(playerView.node);
}

function getUsersTopArtists (userTopArtistsHandler) {
    var toplist = new models.Toplist();
    /* Set attributes of the Toplist object */
    toplist.toplistType = models.TOPLISTTYPE.USER;
    toplist.userName = models.TOPLISTUSER_CURRENT;
    toplist.matchType = models.TOPLISTMATCHES.ARTISTS;

    toplist.observe(models.EVENT.CHANGE, function() {
        var count = 0;
        toplist.results.forEach(function(artist) {
            if (count < MAX_PARENTS) {
                // FIXME phermanto: find out a better way to break out of this loop
                userTopArtistsHandler(artist.data.name);
                count ++;
            }
        });
    });

    toplist.run();
}

function _toggleArtistSearchBar() {
    if (_getNumParentArtists() == MAX_PARENTS) {
        $('#add_artist_search').attr('disabled','disabled');
        this.tooltip('enable');

    } else {
        $('#add_artist_search').removeAttr('disabled');
        this.tooltip('disable');
    }
}

$(document).ready(function () {
    // ability to add artist to parents list
    $('#max_parents_message').tooltip({
        title: "Maximum of 5 parents allowed. Please remove some parents before trying to add more.",
        placement: "right"
    });
    _toggleArtistSearchBarProxy = $.proxy( _toggleArtistSearchBar, $('#max_parents_message'));
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
        },
        onselect: function (artistName) {
            _addArtistToParentsHandler(artistName);
            _toggleArtistSearchBarProxy();
        }
    });
    $('#clear_artists_button').click(function () {
        $('.selected_artist').remove();
        $('.artist_player').remove();
        $("#offspring_slide_header").addClass("disabled_slide");
        $(".border.right").addClass("disabled_slide");
        _toggleArtistSearchBarProxy();
    });
    // ability to make children
    $('#make_babies_button').click($.proxy(function () {
        _fetchSimilarArtistsHandler();
        $("#offspring_slide_header").removeClass("disabled_slide");
        $(".border.right").removeClass("disabled_slide");
        this.liteAccordion("next");
    }, $("#parents_offspring_accordion"))); // TODO phermanto: figure out why we need to pass in the elem?! so weird...
    
    getUsersTopArtists(function (artistName) {
        _addArtistToParentsHandler(artistName);
        _toggleArtistSearchBarProxy();
    });

    $("#parents_offspring_accordion").liteAccordion({
        containerWidth : document.body.offsetWidth,
        containerHeight : 385,
        slideSpeed : 1100
    });
});
