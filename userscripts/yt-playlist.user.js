// ==UserScript==
// @name 4chanX YouTube Playlists for /jp/
// @version 1.1.1
// @namespace 4chan-X-jp-playlist
// @description Wraps all YouTube links within a thread into an embedded playlist
// @include https://boards.4channel.org/jp/thread/*
// @connect www.youtube.com
// @grant none
// @run-at document-start
// @updateURL https://github.com/steponmepls/stuff/raw/main/userscripts/yt-playlist.user.js
// @downloadURL https://github.com/steponmepls/stuff/raw/main/userscripts/yt-playlist.user.js
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

    document.addEventListener("4chanXInitFinished", function() {
        const threadVids = {};
        let ytPlayer, toggle, needsUpdate = false, isPlaying = false, currentVideo;

        let thread = document.querySelector(".thread");
        thread.querySelectorAll(".postContainer").forEach(post => {
            let fullid = post.getAttribute("data-full-i-d");
            fetchIds(fullid);
        });

        // Init playlist if thread already contains YouTube links
        if (Object.entries(threadVids).length > 0) { initPlaylist() };

        document.addEventListener("ThreadUpdate", function(e) {
            if (e.detail.newPosts.length > 0) {
                let newPosts = e.detail.newPosts;
                newPosts.forEach(fullid => {fetchIds(fullid)});
            }
            if (e.detail.deletedPosts.length > 0) {
                let delPosts = e.detail.newPosts;
                delPosts.forEach(fullid => {
                    if (Object.keys(threadVids).includes(fullid)) {
                        if (!needsUpdate) {needsUpdate = true};
                        delete threadVids[fullid];
                    }
                });
            };
            if (!ytPlayer && Object.entries(threadVids).length > 0) { initPlaylist() };
            if (ytPlayer && !isPlaying && needsUpdate) { updatePlaylist() };
        });

        window.onYouTubeIframeAPIReady = function() {
            // Skip first update check on init
            if (!ytPlayer) {needsUpdate = false};
            // Merge id arrays and skip dupes
            let playlist = [...new Set(Object.values(threadVids).flat())];
            ytPlayer = new YT.Player('ytplaylist', {
                width: '512',
                height: '288',
                playerVars: {
                    'fs': 0,
                    'disablekb': 1,
                    'modestbranding': 1,
                    'playlist': playlist.toString()
                },
                events: {
                    "onError": function(e) {
                        let errMsg, errLvl;
                        if (e.data == 101 || e.data == 150) {
                            errLvl = "warning";
                            errMsg = "The owner of the requested video does not allow it to be played in embedded players.";
                        } else if (e.data == 2) {
                            errLvl = "error";
                            errMsg = "The request contains an invalid parameter value.";
                        } else if (e.data == 5) {
                            errLvl = "error";
                            errMsg = "The requested content cannot be played in an HTML5 player.";
                        } else if (e.data == 100) {
                            errLvl = "warning";
                            errMsg = "The video has been removed or marked as private.";
                        };
                        let index = e.target.getPlaylistIndex() + 1;
                        let output = "Error - Video #" + index + "\n" + errMsg;
                        console.warn(output);
                        sendNotif(errLvl, output, 10);
                        // Automatically skip to next video on error
                        e.target.nextVideo();
                    },
                    "onReady": function(e) {
                        if (Object.entries(threadVids).length > 0) {
                            currentVideo = e.target.getVideoUrl().split("=").pop()
                        }
                    },
                    "onStateChange": function(e) {
                        // -1 unstarted; 0 ended; 1 playing; 2 paused; 3 buffering; 5 video cued
                        // console.debug("#" + (e.target.getPlaylistIndex() + 1) + " [" + e.data + "]");
                        if (e.data == 0 && needsUpdate) {updatePlaylist()};
                        if (e.data == 1 || e.data == 3) {isPlaying = true} else {isPlaying = false};
                        if (e.data == -1) {currentVideo = e.target.getVideoUrl().split("=").pop()};
                    }
                }
            });
        };

        function fetchIds(id) {
            let post = thread.querySelector(".postContainer[data-full-i-d='" + id + "']");
            if (post.querySelector("a.linkify.youtube")) {
                let postIds = [];
                post.querySelectorAll("a.linkify.youtube + a.embedder").forEach(link => {
                    postIds.push(link.getAttribute("data-uid"));
                    if (!Object.values(threadVids).flat().includes(link.getAttribute("data-uid"))) {
                        if (!needsUpdate) {needsUpdate = true}
                    };
                });
                threadVids[id] = postIds;
            }
        }

        function initPlaylist() {
            if (Object.entries(threadVids).length > 0) {
                // Init YouTube Iframe API
                let script = document.createElement("script");
                script.src = "https://www.youtube.com/iframe_api";
                document.head.appendChild(script);

                // For some reason waiting for init isn't enough for #embedding to generate
                let observer = new MutationObserver(function (mutations, me) {
                    let embedding = document.querySelector("#media-embed");
                    if (embedding) {
                        embedding.appendChild(playlist);
                        let jumpTo = document.querySelector("#embedding a.jump");
                        jumpTo.addEventListener("click", function(e) {
                            e.preventDefault();
                            let source = Object.entries(threadVids).find(post => post[1].includes(currentVideo))[0];
                            document.getElementById("p" + source.split(".")[1]).scrollIntoView();
                        });
                        let closeEmbed = document.querySelector("#embedding a.close");
                        closeEmbed.addEventListener("click", function() {
                            toggle.querySelector("a").classList.add("disabled");
                        });
                        me.disconnect();
                        return
                    };
                });
                
                let playlist = document.createElement("div");
                playlist.id = "ytplaylist";

                // Start observing after playlist has been created
                observer.observe(document, {childList: true, subtree: true});

                // Toggle in top bar
                toggle = document.createElement("span");
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
                toggle.querySelector("a").onclick = togglePlaylist;
            }
        };

        function updatePlaylist(state) {
            let playlist = [...new Set(Object.values(threadVids).flat())];
            let index = ytPlayer.getPlaylistIndex();
            if (isPlaying && state == 0) {
                ytPlayer.loadPlaylist();
                setTimeout(function(){ ytPlayer.loadPlaylist(playlist, index) }, 500);
            } else {
                let cTime = ytPlayer.getCurrentTime();
                ytPlayer.cuePlaylist();
                setTimeout(function(){ ytPlayer.cuePlaylist(playlist, index, cTime) }, 500);
            };
            needsUpdate = false;
        }

        function togglePlaylist() {
            if (Object.entries(threadVids).length > 0) {
                if (ytPlayer){
                    let container = document.querySelector("#embedding");
                    container.classList.toggle("empty");
                    this.classList.toggle("disabled");
                } else {
                    sendNotif("error", "Unable to load YouTube Iframe API.\nPress F12 and check for errors in the console.");
                    console.error("Unable to load YouTube Iframe API.\n" +
                    "Remember to add the following exceptions:\n" +
                    "4chanX's Settings > Advanced > Javascript Whitelist\n" +
                    "- https://www.youtube.com/iframe_api\n" +
                    "- https://www.youtube.com/s/player/\n" +
                    "Filters in your AdBlock extension\n" +
                    "- @@||www.youtube.com/iframe_api$script,domain=4channel.org\n" +
                    "- @@||www.youtube.com/s/player/*$script,domain=4channel.org\n"
                    );
                }
            } else {
                sendNotif("warning", "No valid links in this thread. :c", 3)
            };
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
    });
})();