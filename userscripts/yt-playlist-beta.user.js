// ==UserScript==
// @name 4chanX YouTube Playlists for /jp/ - beta
// @namespace 4chan-X-jp-playlist-beta
// @description Wraps all YouTube links within a thread into an embedded playlist
// @include https://boards.4channel.org/jp/thread/*
// @connect www.youtube.com
// @grant none
// @run-at document-start
// ==/UserScript==

(function() {
    'use strict';

    document.addEventListener("4chanXInitFinished", () => {
            const threadVids = {};
            let ytPlayer, toggle, needsUpdate = false, isPlaying = false, currentVideo;

            let thread = document.querySelector(".thread");
            thread.querySelectorAll(".postContainer").forEach(post => {
                let fullid = post.getAttribute("data-full-i-d");
                fetchIds(fullid);
            });

            // Init YouTube Iframe API if thread already contains YouTube links
            if (Object.entries(threadVids).length > 0) {
                let script = document.createElement("script");
                script.src = "https://www.youtube.com/iframe_api";
                document.head.appendChild(script);
            };

            document.addEventListener("ThreadUpdate", function (e) {
                if (e.detail[404] === false) {
                    if (e.detail.newPosts.length > 0) {
                        let newPosts = e.detail.newPosts;
                        newPosts.forEach(fullid => { fetchIds(fullid); });
                    }
                    if (e.detail.deletedPosts.length > 0) {
                        let delPosts = e.detail.newPosts;
                        delPosts.forEach(fullid => {
                            if (Object.keys(threadVids).includes(fullid)) {
                                if (!needsUpdate) { needsUpdate = true; };
                                delete threadVids[fullid];
                            }
                        });
                    };
                    if (!ytPlayer && Object.entries(threadVids).length > 0) {
                        let script = document.createElement("script");
                        script.src = "https://www.youtube.com/iframe_api";
                        document.head.appendChild(script);
                    };
                    if (ytPlayer && !isPlaying && needsUpdate) { updatePlaylist() };
                }
            });

            window.onYouTubeIframeAPIReady = function () {
                if (!ytPlayer) { needsUpdate = false; }; // Skip first update check on init

                let playlistContainer = document.createElement("div");
                playlistContainer.id = "ytplaylist";
                let playlist = splitPlaylist([...new Set(Object.values(threadVids).flat())], 200);

                toggle = document.createElement("span");
                toggle.id = "shortcut-youtube";
                toggle.classList.add("shortcut");
                toggle.innerHTML = '<a class="fa fa-youtube-play disabled" title="Toggle YouTube Playlist" href="javascript:;">YT</a>';
                let qr = document.querySelector("#header-bar #shortcuts #shortcut-qr");
                qr.parentNode.insertBefore(toggle, qr);
                toggle.querySelector("a").onclick = (e) => {
                    if (Object.entries(threadVids).length > 0) {
                        if (ytPlayer) {
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

                // For some reason waiting for 4chan X init isn't enough for #embedding to generate
                let embedding = new MutationObserver(function (mutations, me) {
                    let mediaEmbed = document.querySelector("#media-embed");
                    if (mediaEmbed) {
                        mediaEmbed.appendChild(playlistContainer);

                        let jumpTo = document.querySelector("#embedding a.jump");
                        jumpTo.addEventListener("click", (e) => {
                            e.preventDefault();
                            let source = Object.entries(threadVids).find(post => post[1].includes(currentVideo))[0];
                            document.getElementById("p" + source.split(".")[1]).scrollIntoView();
                        });

                        let closeEmbed = document.querySelector("#embedding a.close");
                        closeEmbed.addEventListener("click", (e) => {
                            e.preventDefault();
                            toggle.querySelector("a").classList.add("disabled");
                        });

                        let pager = document.createElement("span");
                        pager.id = "ytplaylist-pager";
                        jumpTo.parentNode.insertBefore(pager, jumpTo);

                        let i = 0;
                        while (i < playlist.length) { addNewpage(i); i++; };

                        ytPlayer = new YT.Player('ytplaylist', {
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
                                "onReady": function (e) {
                                    if (Object.entries(threadVids).length > 0) {
                                        currentVideo = e.target.getVideoUrl().split("=").pop();
                                    }
                                },
                                "onStateChange": function (e) {
                                    // -1 unstarted; 0 ended; 1 playing; 2 paused; 3 buffering; 5 video cued
                                    // console.debug("#" + (e.target.getPlaylistIndex() + 1) + " [" + e.data + "]");
                                    if (e.data == 0 && needsUpdate) { updatePlaylist(e.data) };
                                    if (e.data == 1 || e.data == 3) { isPlaying = true; } else { isPlaying = false; };
                                    if (e.data == -1) { 
                                        let newVideo = e.target.getVideoUrl().split("=").pop();
                                        if (currentVideo !== newVideo) { currentVideo = newVideo };
                                     };
                                }
                            }
                        });

                        me.disconnect();
                        return;
                    };
                });
                embedding.observe(document, { childList: true, subtree: true });
            };

            function fetchIds(id) {
                let post = thread.querySelector(".postContainer[data-full-i-d='" + id + "']");
                if (post.querySelector("a.linkify.youtube")) {
                    let postIds = [];
                    post.querySelectorAll("a.linkify.youtube + a.embedder").forEach(link => {
                        postIds.push(link.getAttribute("data-uid"));
                        if (!Object.values(threadVids).flat().includes(link.getAttribute("data-uid"))) {
                            if (!needsUpdate) { needsUpdate = true; }
                        };
                    });
                    threadVids[id] = postIds;
                }
            }

            function splitPlaylist(array, chunk) {
                let output = [];
                while (array.length) {
                    output.push(array.splice(0, chunk))
                };
                return output;
            };

            function updatePlaylist(state) {
                let playlist = splitPlaylist([...new Set(Object.values(threadVids).flat())], 200);
                let pages = document.querySelectorAll("#ytplaylist-page a[data-page]");
                let index = ytPlayer.getPlaylistIndex();
                let i = 0;
                while (i < playlist.length) {
                    if (playlist[i].includes(currentVideo)) {
                        if (isPlaying && state == 0) {
                            ytPlayer.loadPlaylist();
                            setTimeout(function () { ytPlayer.loadPlaylist(playlist[i], index); }, 500);
                        } else {
                            let cTime = ytPlayer.getCurrentTime();
                            ytPlayer.cuePlaylist();
                            setTimeout(function () { ytPlayer.cuePlaylist(playlist[i], index, cTime); }, 500);
                        };
                    };

                    // Reset pager if number of pages and chunked playlist length doesn't match
                    if (pages.length > playlist.length) {
                        pages.forEach(page => {pages.removeChild(page)});
                        pages = document.querySelectorAll("#ytplaylist-page a[data-page]");  
                    };
                    if ((i + 1) > pages.length) { addNewpage(i) };

                    i++;
                };
                needsUpdate = false;
            }

            function addNewpage(i) {
                let pager = document.querySelector("#ytplaylist-pager");
                let newPage = document.createElement("a");
                newPage.href = "javascript:;";
                newPage.setAttribute("data-page", (i + 1));
                newPage.innerHTML = i + 1;
                newPage.style = "padding: 0 2px;"
                pager.appendChild(newPage);
                newPage.addEventListener("click", (e) => {
                    e.preventDefault();
                    let chunkedPlaylist = splitPlaylist([...new Set(Object.values(threadVids).flat())], 200);
                    ytPlayer.cuePlaylist();
                    setTimeout(function () { ytPlayer.cuePlaylist( chunkedPlaylist[e.target.getAttribute("data-page") - 1] ) }, 500);
                });
            }

            function sendNotif(type, msg, lifetime) {
                let event = new CustomEvent("CreateNotification", {
                    "detail": {
                        'type': type,
                        'content': msg,
                        'lifetime': lifetime // optional - time in seconds till it disappears
                    }
                });
                document.dispatchEvent(event);
            };
        });
})();