// ==UserScript==
// @name 4chanX YouTube Playlists for /jp/
// @description Wraps all YouTube links within a thread into an embedded playlist
// @include https://boards.4channel.org/jp/thread/*
// @grant none
// @run-at document-start
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

(function() {
    'use strict';
    var ytPlayer, threadIds = [], needsUpdate = false, isPlaying = false;

    document.addEventListener("4chanXInitFinished", function() {
        let thread = document.querySelector(".board .thread");
        let posts = thread.querySelectorAll(".postContainer");
        posts.forEach(post => fetchIds(post));

        // Check for new ids on thread update
        document.addEventListener("ThreadUpdate", function(e) {
            if (e.detail.newPosts.length > 0) { // New posts
                let newPosts = e.detail.newPosts;
                newPosts.forEach(postId => {
                    let fullId = "[data-full-i-d='" + postId + "']";
                    let post = thread.querySelector(".postContainer" + fullId);
                    fetchIds(post);
                });
            };
            if (e.detail.deletedPosts.length > 0) { // Deleted posts
                let delPosts = e.detail.deletedPosts;
                delPosts.forEach(postId => {
                    let fullId = "[data-full-i-d='" + postId + "']";
                    let post = thread.querySelector(".postContainer" + fullId);
                    fetchIds(post, e.detail.deletedPosts.length > 0);
                });
            };
            if (ytPlayer && !isPlaying && needsUpdate) {updatePlaylist()};
        });

        // Init YouTube Iframe API
        let script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
        // For some reason waitinf for init isn't enough for it to generate
        var observer = new MutationObserver(function (mutations, me) {
            var embedding = document.querySelector("#media-embed");
            if (embedding) {
                console.debug(embedding);
                embedding.appendChild(playlist);
                me.disconnect();
                return;
            }
        });
        let playlist = document.createElement("div");
        playlist.id = "ytplaylist";
        // Start observing after playlist has been created
        observer.observe(document, {childList: true, subtree: true});
        playlist.style.top = (document.querySelector("#header-bar").offsetHeight + 5) + "px";
        playlist.style.right = "5px";

        window.onYouTubeIframeAPIReady = function() {
            if (!ytPlayer) {needsUpdate = false};
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
                        if (e.data == 0 && needsUpdate) {updatePlaylist()};
                        if (e.data == 1 || e.data == 3) {isPlaying = true} else {isPlaying = false};
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
                let container = document.querySelector("#embedding");
                container.classList.toggle("empty");
                this.classList.toggle("disabled");
            } else {
                sendNotif("warning", "No valid links in this thread. :c", 3)
            };
        };

        // Styling
        let css = document.createElement("style");
        document.head.appendChild(css);
        css.textContent = `
            #embedding .move {
                height: 18px;
            }
            #embedding a {
                display: none;
            }
        `;
    });

    // Functions
    function fetchIds(post, isDead) {
        if (post.querySelector("a.linkify.youtube")) {
            let postIds = [];
            let postLinks = post.querySelectorAll("a.linkify.youtube + a.embedder");
            postLinks.forEach(link => postIds.push(link.getAttribute("data-uid")));
            postIds.forEach(id => {
                if (!threadIds.includes(id)) {
                    if (!needsUpdate) {needsUpdate = true};
                    threadIds.push(id);
                } else {
                    if (isDead === true) {
                        if (!needsUpdate) {needsUpdate = true};
                        threadIds.pop(id);
                    }
                }
            });
        }
    };

    function updatePlaylist(state) {
        let index = ytPlayer.getPlaylistIndex();
        let cTime = ytPlayer.getCurrentTime();
        if (isPlaying && state == 0) {
            ytPlayer.loadPlaylist();
            setTimeout(function(){ ytPlayer.loadPlaylist(threadIds, index) }, 500);
        } else {
            ytPlayer.cuePlaylist();
            setTimeout(function(){ ytPlayer.cuePlaylist(threadIds, index, cTime) }, 500);
        };
        needsUpdate = false;
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