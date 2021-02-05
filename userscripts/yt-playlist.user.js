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
    var ytPlaylist, threadIds = [], needsUpdate = false, isPlaying = false;
    document.addEventListener("4chanXInitFinished", function() {
        const thread = document.querySelector(".board .thread");
        let posts = thread.querySelectorAll(".postContainer");
        posts.forEach(post => compareIds(post));
        document.addEventListener("ThreadUpdate", function(e) {
            //console.debug(ytPlaylist);
            // If thread update contains new posts
            if (e.detail.newPosts.length > 0) {
                let newPosts = e.detail.newPosts;
                newPosts.forEach(postId => {
                    let fullId = "[data-full-i-d='" + postId + "']";
                    let post = thread.querySelector(".postContainer" + fullId);
                    compareIds(post);
                });
            };
            // If thread update contains deleted posts
            if (e.detail.deletedPosts.length > 0) {
                let deletedPosts = e.detail.deletedPosts;
                deletedPosts.forEach(postId => {
                    let fullId = "[data-full-i-d='" + postId + "']";
                    let post = thread.querySelector(".postContainer" + fullId);
                    compareIds(post, (e.detail.deletedPosts.length > 0));
                });
            };
            // Check for changes to playlist
            checkPlaylist();
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
            if (!ytPlaylist) {needsUpdate = false};
            ytPlaylist = new YT.Player('ytplaylist', {
                width: '512',
                height: '288',
                playerVars: {
                    'fs': 0,
                    'disablekb': 1,
                    'modestbranding': 1,
                    'playlist': threadIds.toString()
                },
                events: {
                    "onError": function(e) {
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
                    },
                    "onStateChange": function(e) {
                        // -1 unstarted; 0 ended; 1 playing; 2 paused; 3 buffering; 5 video cued
                        // console.debug("#" + (e.target.getPlaylistIndex() + 1) + " [" + e.data + "]");
                        if (e.data == 1) {
                            isPlaying = true
                        } else {
                            if (needsUpdate && isPlaying) {checkPlaylist(e.data)};
                            if (e.data != 3) {isPlaying = false};
                        };
                    }
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

    // Functions
    function compareIds(post, isDead) {
        if (post.querySelector("a.linkify.youtube")) {
            let postIds = [];
            let postLinks = post.querySelectorAll("a.linkify.youtube + a.embedder");
            postLinks.forEach(link => postIds.push(link.getAttribute("data-uid")));
            postIds.forEach(id => {
                if (!threadIds.includes(id)) {
                    if (!needsUpdate) {needsUpdate = true};
                    threadIds.push(id);
                } else {
                    if (isDead) {
                        if (!needsUpdate) {needsUpdate = true};
                        threadIds.pop(id);
                    }
                }
            });
        }
    };

    function checkPlaylist(state) {
        if (ytPlaylist) {
            let currentVideo = ytPlaylist.getPlaylistIndex();
            let currentTiming = ytPlaylist.getCurrentTime();
            if (isPlaying && state == 0) {
                ytPlaylist.loadPlaylist(threadIds, currentVideo, currentTiming);
            } else {
                ytPlaylist.cuePlaylist(threadIds, currentVideo, currentTiming);
            };
            needsUpdate = false;
        }
    };

    function sendNotif(type, msg, lifetime) {
        let event = new CustomEvent("CreateNotification", {
            "detail": {
                'type': type, // 'info', 'success', 'warning', or 'error'
                'content': msg, // string
                'lifetime': lifetime // optional - time in seconds till it disappears
            }
        });
        document.dispatchEvent(event);
    };
})();