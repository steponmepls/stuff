// ==UserScript==
// @name 4chanX YouTube Playlists for /jp/
// @version 1.2.4
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

    const thread = {};
    let container, mediaEmbed, player, playlist, 
        needsUpdate = false, isPlaying = false, currentVideo,
        toggle, qr, jumpTo, closeEmbed, pager;

    document.addEventListener("4chanXInitFinished", function (e) {
        document.querySelectorAll(".thread .postContainer").forEach(post => {
            let fullid = post.getAttribute("data-full-i-d");
            fetchIds(fullid, post);
        });
        
        // Init YouTube Iframe API if thread already contains ids
        if (Object.entries(thread).length > 0) {
            let script = document.createElement("script");
            script.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(script);
        };

        // Append player container in #embedding popup
        container = document.createElement("div");
        container.id = "ytplaylist";
        mediaEmbed = document.querySelector("#media-embed");
        mediaEmbed.appendChild(container);

        // Fetch new/removed ids and update playlist
        document.addEventListener("ThreadUpdate", function (e) {
            if (e.detail[404] === false) {
                // If new posts
                if (e.detail.newPosts.length > 0) {
                    let newPosts = e.detail.newPosts;
                    newPosts.forEach(fullid => { fetchIds(fullid) });
                }
                // If deleted posts
                if (e.detail.deletedPosts.length > 0) {
                    let delPosts = e.detail.newPosts;
                    delPosts.forEach(fullid => {
                        if (Object.keys(thread).includes(fullid)) {
                            if (!needsUpdate) { needsUpdate = true };
                            delete thread[fullid];
                        }
                    });
                };
                // Init playlist if new ids are added for the first time
                if (typeof player === "undefined" && Object.entries(thread).length > 0) {
                    let script = document.createElement("script");
                    script.src = "https://www.youtube.com/iframe_api";
                    document.head.appendChild(script);
                };
                // Refresh playlist if not playing and needs update
                if (player && !isPlaying && needsUpdate) { updatePlaylist() };
                // Debug
                // console.debug(thread);
            }
        });

        // Add toggle to topbar
        toggle = document.createElement("span");
        toggle.id = "shortcut-youtube";
        toggle.classList.add("shortcut");
        toggle.innerHTML = '<a class="fa fa-youtube-play disabled" title="Toggle YouTube Playlist" href="javascript:;">YT</a>';
        qr = document.querySelector("#header-bar #shortcuts #shortcut-qr");
        qr.parentNode.insertBefore(toggle, qr);
        toggle.querySelector("a").onclick = (e) => {
            e.preventDefault();
            if (Object.entries(thread).length > 0) {
                if (typeof player !== "undefined") {
                    let container = document.querySelector("#embedding");
                    container.classList.toggle("empty");
                    e.target.classList.toggle("disabled");
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
                sendNotif("warning", "No valid links in this thread. :c", 3);
            };
        };

        // Embedding popup tweaks
        jumpTo = document.querySelector("#embedding a.jump");
        jumpTo.addEventListener("click", (e) => {
            e.preventDefault();
            let id = Object.entries(thread).find(post => post[1].includes(currentVideo))[0];
            document.querySelector(".postContainer[data-full-i-d='" + id + "']").scrollIntoView();
        });
        closeEmbed = document.querySelector("#embedding a.close");
        closeEmbed.addEventListener("click", (e) => {
            e.preventDefault();
            toggle.querySelector("a").classList.add("disabled");
        });
        pager = document.createElement("span");
        pager.id = "ytplaylist-pager";
        jumpTo.parentNode.insertBefore(pager, jumpTo);
    });

    // Generate playlist iframe
    window.onYouTubeIframeAPIReady = function () {
        playlist = splitPlaylist([...new Set(Object.values(thread).flat())], 200);
        player = new YT.Player('ytplaylist', {
            width: '512',
            height: '288',
            playerVars: {
                'fs': 0,
                'disablekb': 1,
                'modestbranding': 1,
                'playlist': playlist[0].toString()
            },
            events: {
                "onError": function (e) {
                    let errLvl, errMsg, index, output;
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
                    index = e.target.getPlaylistIndex() + 1;
                    output = "Error - Video #" + index + "\n" + errMsg;
                    console.warn(output);
                    sendNotif(errLvl, output, 10);
                    // Automatically skip to next video on error
                    e.target.nextVideo();
                },
                "onReady": function (e) {
                    // Defuse double update on first load
                    needsUpdate = false;
                    // Init first track record
                    currentVideo = e.target.getVideoUrl().split("=").pop();
                    // Init pages
                    updatePager();
                },
                "onStateChange": function (e) {
                    // -1 unstarted; 0 ended; 1 playing; 2 paused; 3 buffering; 5 video cued
                    // console.debug("#" + (e.target.getPlaylistIndex() + 1) + " [" + e.data + "]");
                    if (e.data == 0 && needsUpdate) { updatePlaylist(e.data) };
                    if (e.data == 1 || e.data == 3) { isPlaying = true } else { isPlaying = false };
                    if (e.data == -1) { 
                        let newVideo = e.target.getVideoUrl().split("=").pop();
                        if (currentVideo !== newVideo) { currentVideo = newVideo };
                     };
                }
            }
        });
    };

    function fetchIds(id, p) {
        let post = p;
        if (typeof post === "undefined") {
            // data-full-i-d assignment seems to be too slow on low spec machines
            // so I moved to a simpler id check for newly added posts
            post = document.querySelector(".postContainer[id$='" + id.split(".").pop() + "']");
        }
        if (post.querySelector("a.linkify.youtube")) {
            let postIds = [];
            post.querySelectorAll("a.linkify.youtube + a.embedder").forEach(link => {
                let uid = link.getAttribute("data-uid")
                postIds.push(uid);
                if (!Object.values(thread).flat().includes(uid) && !needsUpdate) {
                    needsUpdate = true;
                };
            });
            if (postIds.length > 0) { thread[id] = postIds };
        };
    };

    function splitPlaylist(array, chunk) {
        let i = 0, output = [];
        while (i < array.length) {
            output.push(array.splice(0, chunk));
            i++;
        };
        return output;
    };

    function updatePlaylist(state) {
        let playlist = splitPlaylist([...new Set(Object.values(thread).flat())], 200);
        let pages = document.querySelectorAll("#ytplaylist-pager a[data-page]");
        
        // Reset pager if number of pages and chunked playlist length doesn't match
        if (pages.length !== playlist.length) { updatePager(pages) };

        // Check through possible playlist pages aka +200 items
        playlist.forEach((page, index) => {
            // Only replace current playlist page
            if (page.includes(currentVideo)) {
                let cTrack = player.getPlaylistIndex();
                // The empty call + 500ms delayed call is a workaround for a bug
                // in the API. https://stackoverflow.com/questions/66188481
                if (isPlaying && state == 0) {
                    // console.debug("isPlaying: " + isPlaying + " state: " + state);
                    player.loadPlaylist();
                    setTimeout(function () { player.loadPlaylist(page, cTrack); }, 500);
                } else {
                    // console.debug("isPlaying: " + isPlaying + " state: " + state);
                    let cTime = player.getCurrentTime();
                    player.cuePlaylist();
                    setTimeout(function () { player.cuePlaylist(page, cTrack, cTime); }, 500);
                };
            };
        });

        // Reset mutation check
        needsUpdate = false;
    };

    function updatePager(pages) {
        if (typeof pages !== "undefined") {
            pages.forEach(page => { page.parentNode.removeChild(page) });
        }
        playlist.forEach((chunk, index) => {
            let newPage = document.createElement("a");
            newPage.href = "javascript:;";
            newPage.setAttribute("data-page", (index + 1));
            newPage.innerHTML = index + 1;
            newPage.style = "padding: 0 2px;"
            pager.appendChild(newPage);
            newPage.addEventListener("click", (e) => {
                e.preventDefault();
                let chunkedPlaylist = splitPlaylist([...new Set(Object.values(thread).flat())], 200);
                player.cuePlaylist();
                setTimeout(function () { player.cuePlaylist( chunkedPlaylist[e.target.getAttribute("data-page") - 1] ) }, 500);
            });
        });
    };

    function sendNotif(type, msg, lifetime) {
        let event = new CustomEvent("CreateNotification", {
            "detail": {
                'type': type,
                'content': msg,
                'lifetime': lifetime // optional
            }
        });
        document.dispatchEvent(event);
    };

})();