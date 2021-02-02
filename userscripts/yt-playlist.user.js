// ==UserScript==
// @name 4chanX YouTube Playlists for /jp/
// @description Wraps all YouTube links within a thread into an embedded playlist
// @include https://boards.4channel.org/jp/thread/*
// @grant none
// ==/UserScript==

// -----------------[Add the following exceptions]------------------|
// 4chanX's Settings > Advanced > Javascript Whitelist              |
// https://www.youtube.com/iframe_api                               |
// https://www.youtube.com/s/player/                                |
// -----------------------------------------------------------------|
// uBlock Origin's Dashboard > My filters                           |
// @@||www.youtube.com/iframe_api$script,domain=4channel.org        |
// @@||www.youtube.com/s/player/*$script,domain=4channel.org        |
// -----------------------------------------------------------------|

(function () {
    var ytPlayer, threadIds = [], needsUpdate = false, isPlaying = false;
    document.addEventListener("4chanXInitFinished", function() {
        const thread = document.querySelector(".board .thread");
        let posts = thread.querySelectorAll(".postContainer");
        // Init playlist
        posts.forEach(post => {checkPlaylist(post)});
        // Check playlist when thread updates
        document.addEventListener("ThreadUpdate", function(e) {
            // If thread update contains new posts
            if (e.detail.newPosts.length > 0) {
                let newPosts = e.detail.newPosts;
                newPosts.forEach(postId => {
                    let fullId = "[data-full-i-d='" + postId + "']";
                    let post = thread.querySelector(".postContainer" + fullId);
                    checkPlaylist(post);
                });
            };
            // If thread update contains deleted posts
            if (e.detail.deletedPosts.length > 0) {
                let deletedPosts = e.detail.deletedPosts;
                deletedPosts.forEach(postId => {
                    let fullId = "[data-full-i-d='" + postId + "']";
                    let post = thread.querySelector(".postContainer" + fullId);
                    checkPlaylist(post, (e.detail.deletedPosts.length > 0));
                });
            };
            // Apply changes to playlist
            if (needsUpdate) {
                stateMutation(ytPlayer.getPlayerState());
            };
        });
        // Init YouTube Iframe API
        let script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
        let playlist = document.createElement("div");
        playlist.id = "ytplaylist";
        document.body.appendChild(playlist);
        // Move iframe in the top right corner
        playlist.style.top = (document.querySelector("#header-bar").offsetHeight + 5) + "px";
        playlist.style.right = "5px";
        // Wait for API
        window.onYouTubeIframeAPIReady = function() {
            // Skip first round of load/cue in stateMutation() so
            // playlist doesn't load twice on first time
            if (!ytPlayer) {needsUpdate = false};
            // Actually init the playlist player
            ytPlayer = new YT.Player('ytplaylist', {
                width: '512',
                height: '288',
                playerVars: {
                    'fs': 0,
                    'disablekb': 1,
                    'modestbranding': 1,
                    'playlist': threadIds.toString()
                },
                events: {
                    "onError": function(e) {showError (e)},
                    "onStateChange": function(e) {stateMutation(e)}
                }
            });
        };
        // Toggle in top bar
        let toggle = document.createElement("span");
        toggle.id = "shortcut-youtube";
        toggle.classList.add("shortcut");
        toggle.innerHTML = `
            <a class="fa fa-youtube-play disabled" 
                title="Toggle YouTube Playlist" 
                href="javascript:;">
                YT
            </a>
        `;
        let qr = document.querySelector("#header-bar #shortcuts #shortcut-qr");
        qr.parentNode.insertBefore(toggle, qr);
        toggle.querySelector("a").onclick = function () {
            if (threadIds.length > 0) {
                let container = document.querySelector("#ytplaylist");
                container.classList.toggle("show");
                this.classList.toggle("disabled");
            } else {
                sendNotif("warning", "No valid links in this thread. :c", 3);
            };
        };
        // Styling
        let css = document.createElement("style");
        document.head.appendChild(css);
        css.textContent = `
            #ytplaylist {
                z-index: 9;
                position: fixed;
                display: none;
            }
            #ytplaylist.show {display: initial;}
        `;
    });

    function checkPlaylist(post, isDead) {
        if (post.querySelector("a.linkify.youtube")) {
            let postIds = [];
            let postLinks = post.querySelectorAll("a.linkify.youtube + a.embedder");
            postLinks.forEach(link => postIds.push(link.getAttribute("data-uid")));
            postIds.forEach(id => {
                if (!threadIds.includes(id)) {
                    threadIds.push(id);
                    needsUpdate = true;
                } else {
                    if (isDead) {
                        threadIds.pop(id);
                        needsUpdate = true;
                    }
                };
            });
        };
    };

    function showError(e) {
        var errMsg, errLvl;
        if (e.data == 101 || e.data == 150) {
            errLvl = "warning";
            errMsg = "The owner of the requested video does not allow it to be played in embedded players.";
        } else if (e.data == 2) {
            errLvl = "error";
            errMsg = "The request contains an invalid parameter value.";
        } else if (e.data == 2) {
            errLvl = "error";
            errMsg = "The requested content cannot be played in an HTML5 player.";
        } else if (e.data == 2) {
            errLvl = "warning";
            errMsg = "The video has been removed or marked as private.";
        };
        let index = e.target.getPlaylistIndex() + 1;
        let output = "Error - Video #" + index + "\n" + errMsg;
        console.warn(output);
        sendNotif(errLvl, output, 10);
        e.target.nextVideo();
    };

    function stateMutation(e) {
        // debug
        // debugState(e.target.getPlaylistIndex(), e.data);
        // Distinguish between..
        var event, player;
        if (typeof e !== "number") { // ..event call..
            event = e.data;
            player = e.target;
        } else { // ..and manual call
            event = e;
            player = ytPlayer;
        }
        if (event == 1) {
            isPlaying = true;
        } else {
            if (needsUpdate) {
                let currentVideo = player.getPlaylistIndex();
                let currentTiming = player.getCurrentTime();
                if (isPlaying) {
                    player.loadPlaylist(threadIds, currentVideo, currentTiming);
                } else {
                    player.cuePlaylist(threadIds, currentVideo, currentTiming);
                };
                needsUpdate = false;
            };
            isPlaying = false;
        };
    };

    function sendNotif(type, msg, lifetime) {
        let event = new CustomEvent("CreateNotification", {
            "detail": {
                'type': type, // required !! can be 'info', 'success', 'warning', or 'error'
                'content': msg, // required !! must be a string
                'lifetime': lifetime // optional .. time in seconds till it disappears
            }
        });
        document.dispatchEvent(event);
    };
    
    function debugState(tracknumber, state) {
        let track = tracknumber + 1;
        if (state == -1) {
            console.debug("Track #" + track + ": [-1] unstarted");
        } else if (state == 0) {
            console.debug("Track #" + track + ": [0] ended");
        } else if (state == 1) {
            console.debug("Track #" + track + ": [1] playing");
        } else if (state == 2) {
            console.debug("Track #" + track + ": [2] paused");
        } else if (state == 3) {
            console.debug("Track #" + track + ": [3] buffering");
        } else if (state == 5) {
            console.debug("Track #" + track + ": [5] video cued");
        };
    };
})();