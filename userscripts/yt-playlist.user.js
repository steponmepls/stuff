// ==UserScript==
// @name 4chanX YouTube Playlists for /jp/
// @version 1.3.1
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
    document.addEventListener("4chanXInitFinished", function (e) {

        // Fetch ids from thread
        const threadIds = {};
        let needsUpdate = false;
        const thread = document.querySelector(".board > .thread"),
            posts = thread.querySelectorAll(".postContainer");
        for (const post of posts) {
            const fullId = post.getAttribute("data-full-i-d");
            fetchIds(fullId);
        };

        document.addEventListener("ThreadUpdate", function (e) {
            if (e.detail[404] === false) {
                if (e.detail.newPosts.length > 0) {
                    const newPosts = e.detail.newPosts;
                    for (const fullId of newPosts) {
                        fetchIds(fullId)
                    };
                }
                if (e.detail.deletedPosts.length > 0) {
                    const delPosts = e.detail.deletedPosts;
                    for (const fullId of delPosts) {
                        if (Object.keys(threadIds).includes(fullId)) {
                            delete threadIds[fullId];
                            needsUpdate = true;
                        }
                    }
                };
            };
        });

        const qrToggle = document.getElementById("shortcut-qr"),
            eDialog = document.getElementById("embedding"),
            eMedia = document.getElementById("media-embed"),
            eMove = eDialog.querySelector(".move");
        
        const dToggle = document.createElement("span"),
            eToggle = document.createElement("a");

        // Add toggle to headerbar
        dToggle.id = "shortcut-youtube";
        dToggle.classList.add("shortcut");
        dToggle.innerHTML = `<a class="fa fa-window-maximize disabled" title="Toggle embed dialog" href="javascript:;">Embed</a>`;
        qrToggle.parentNode.insertBefore(dToggle, qrToggle);
        dToggle.querySelector("a").onclick = (e) => {
            e.preventDefault();
            if (playlistReady) {
                if (eMedia.querySelector("iframe")) {
                    e.target.classList.toggle("disabled");
                    eDialog.classList.toggle("empty");
                } else {
                    initAPI();
                }
            };
        };

        // Add toggle to embed dialog
        eToggle.classList.add("fa", "fa-list-ul", "togglePlaylist");
        eToggle.href = "javascript:;";
        eMove.parentNode.insertBefore(eToggle, eMove);
        eToggle.onclick = (e) => {
            e.preventDefault();
            if (eDialog.classList.contains("has-embed") && 
                eDialog.querySelector("iframe#ytplaylist")) {
                eDialog.classList.toggle("show-embed")
            } else {
                initAPI();
            };
        };

        // Needed so I don't have to add listeners to each (embed) link
        const eObserver = new MutationObserver( () => {
            if (eMedia.querySelector(".media-embed")) {
                eDialog.classList.add("has-embed");
                eDialog.classList.add("show-embed");
                dToggle.querySelector("a").classList.remove("disabled");
            } else {
                eDialog.classList.remove("has-embed");
                eDialog.classList.remove("show-embed");
                dToggle.querySelector("a").classList.add("disabled");
            }
        });
        eObserver.observe(eMedia, { childList: true });

        // Styling
        const css = document.createElement("style");
        document.head.appendChild(css);
        css.innerHTML = `
            #embedding:not(.has-embed) .togglePlaylist,
            #embedding.show-embed #ytplaylist-pager,
            #embedding:not(.show-embed) .jump.legacy,
            #embedding.show-embed .jump:not(.legacy),
            #embedding:not(.show-embed) .media-embed,
            #embedding.show-embed #ytplaylist {
                display: none;
            }
        `;

        // Add playlist container to embed dialog
        const pContainer = document.createElement("div");
        pContainer.innerHTML = `<div id="ytplaylist"></div>`;

        // Add playlist pager to embed dialog
        const ePager = document.createElement("div")
        ePager.id = "ytplaylist-pager";
        eMove.parentNode.insertBefore(ePager, eMove);

        // Populate playlist container
        window.onYouTubeIframeAPIReady = function () {
            let isPlaying = false, cLength, cTrack, cIndex = 0;

            const filteredIds = [...new Set(Object.values(threadIds).flat())], 
                pagedIds = splitPlaylist(filteredIds, 200), 
                player = new YT.Player("ytplaylist", {
                    width: '512',
                    height: '288',
                    playerVars: {
                        'fs': 0,
                        'disablekb': 1,
                        'modestbranding': 1,
                        'playlist': pagedIds[0].toString()
                    },
                    events: {
                        "onReady": function(e) {
                            needsUpdate = false;
                            cTrack = e.target.getVideoUrl().split("=").pop();
                            cLength = e.target.getPlaylist().length;
                            updatePager();
                        },
                        "onStateChange": function(e) {
                            if (e.data == 0) { // If track ended
                                if (needsUpdate) { updatePlaylist(e.data) };
                                // If last track of the page..
                                if (cIndex === (cLength - 1)) {
                                    const filteredIds = [...new Set(Object.values(threadIds).flat())],
                                        pagedIds = splitPlaylist(filteredIds, 200);
                                    
                                    pagedIds.forEach((page, index) => {
                                        // ..and if NOT last page of the playlist..
                                        if (isPlaying && page.includes(cTrack) && 
                                            index !== (pagedIds.length - 1)) {
                                            e.target.loadPlaylist();
                                            setTimeout(() => { e.target.loadPlaylist(pagedIds[index + 1]) }, 500);
                                        }
                                    });
                                };
                             };
                            if (e.data == -1) { // If next track is loaded
                                cTrack = e.target.getVideoUrl().split("=").pop();
                                cIndex = e.target.getPlaylistIndex();
                                cLength = e.target.getPlaylist().length;
                                // console.debug("cTrack: " + cTrack + "\ncIndex: " + cIndex + "\ncLength: " + cLength);
                            };
                            // This has to stay at the bottom or it
                            // will mess with prev isPlaying checks
                            isPlaying = (e.data == 1 || e.data == 3) ? true : false;
                        },
                        "onError": function(e) {
                            let errLvl, errMsg;
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
                            const index = e.target.getPlaylistIndex() + 1,
                                total = e.target.getPlaylist().length,
                                output = "Error - Video #" + index + "\n" + errMsg;
                            console.warn(output);
                            sendNotif(errLvl, output, 10);
                            // Only skip if not at the end of the playlist
                            if (index < total) { e.target.nextVideo() };
                        }
                    }
            });

            // Add playlist's own jumpTo
            const lJumpto = eDialog.querySelector(".jump"),
                pJumpto = lJumpto.cloneNode(true);
            lJumpto.classList.add("legacy");
            lJumpto.parentNode.insertBefore(pJumpto, lJumpto);
            pJumpto.onclick = (e) => {
                e.preventDefault();
                const id = Object.entries(threadIds).find(post => post[1].includes(cTrack))[0];
                thread.querySelector("[data-full-i-d=\"" + id + "\"]").scrollIntoView();
            };
            
            // Attempt to update playlist if not playing
            document.addEventListener("ThreadUpdate", function (e) {
                const filteredIds = [...new Set(Object.values(threadIds).flat())],
                    pagedIds = splitPlaylist(filteredIds, 200);
                pagedIds.forEach((page, index) => {
                    if (page.includes(cTrack) && cLength !== page.length) {
                        needsUpdate = true
                    }
                });
                if (!isPlaying && needsUpdate) { updatePlaylist() };
            });

            function updatePlaylist(state) {
                console.debug("Updating playlist");
                const filteredIds = [...new Set(Object.values(threadIds).flat())],
                    pagedIds = splitPlaylist(filteredIds, 200),
                    pagesList = ePager.querySelectorAll("a[data-page]");

                // Refresh pager only when needed
                if (pagesList.length !== pagedIds.length) { updatePager(pagesList) };

                pagedIds.forEach((page, index) => {
                    if (page.includes(cTrack)) {
                        // The empty calls are needed because of this
                        // https://stackoverflow.com/questions/66188481
                        if (isPlaying && state === 0) {
                            console.debug("loadPlaylist()");
                            player.loadPlaylist();
                            setTimeout(()=>{ player.loadPlaylist(page, (cIndex + 1)) }, 500);
                        } else {
                            const cTime = player.getCurrentTime();
                            console.debug("cuePlaylist()");
                            player.cuePlaylist();
                            setTimeout(()=>{ player.cuePlaylist(page, cIndex, cTime) }, 500);
                        }
                    }
                });

                // Reset mutation check
                needsUpdate = false;
            }

            function updatePager(pages) {
                const filteredIds = [...new Set(Object.values(threadIds).flat())],
                    pagedIds = splitPlaylist(filteredIds, 200);

                if (typeof pages !== "undefined") {
                    for (const page of pages) {
                        page.parentNode.removeChild(page)
                    };
                }

                pagedIds.forEach((chunk, index) => {
                    const newPage = document.createElement("a");
                    newPage.href = "javascript:;";
                    newPage.setAttribute("data-page", index);
                    newPage.innerHTML = index + 1;
                    newPage.style = "padding: 0 2px;"
                    ePager.appendChild(newPage);
                    newPage.addEventListener("click", (e) => {
                        e.preventDefault();
                        const filteredIds = [...new Set(Object.values(threadIds).flat())],
                            pagedIds = splitPlaylist(filteredIds, 200),
                            pageNum = e.target.getAttribute("data-page");
                        player.cuePlaylist();
                        setTimeout(()=>{ player.cuePlaylist( pagedIds[pageNum] ) }, 500);
                    });
                });
            };

            function splitPlaylist(array, chunk) {
                let i = 0;
                const output = [];
                while (i < array.length) {
                    output.push(array.splice(0, chunk));
                    i++;
                };
                return output;
            };

        };

        // Functions
        function fetchIds(id) {
            const post = thread.querySelector(".postContainer[id$=\"" +
                id.split(".").pop() + "\"]");
            if (post.querySelector("a.linkify.youtube")) {
                const postIds = [];
                const links = post.querySelectorAll("a.linkify.youtube + a.embedder");
                for (const link of links) {
                    const rawIds = Object.values(threadIds).flat(),
                        uId = link.getAttribute("data-uid");
                    postIds.push(uId);
                    if (!rawIds.includes(uId) && !needsUpdate) {
                        needsUpdate = true;
                    };
                };
                if (postIds.length > 0) { threadIds[id] = postIds };
            }
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

        function playlistReady() {
            if (Object.entries(threadIds).length > 0) {
                return true
            } else {
                sendNotif("warning", "No valid YouTube links in this thread.", 3);
                return false
            }
        };

        function initAPI() {
            if (!document.getElementById("ytplaylist")) {
                const script = document.createElement("script");
                script.src = "https://www.youtube.com/iframe_api";
                document.head.appendChild(script);
                eMedia.appendChild(pContainer);
                setTimeout(() => {
                    if (!eMedia.querySelector("iframe#ytplaylist")) {
                        failedToload();
                    } else {
                        dToggle.querySelector("a").classList.remove("disabled");
                        eDialog.classList.remove("empty");
                        eDialog.classList.remove("show-embed");
                    }
                }, 500);
            } else if (!eMedia.querySelector("iframe#ytplaylist")) {
                failedToload()
            };
        };

        function failedToload() {
            sendNotif("error", "Unable to load YouTube Iframe API.\nPress F12 and check for errors in the console.");
            console.error("Unable to load YouTube Iframe API.\n" +
                "Remember to add the following exceptions:\n" +
                "4chanX's Settings > Advanced > Javascript Whitelist\n" +
                " https://www.youtube.com/iframe_api\n" +
                " https://www.youtube.com/s/player/\n" +
                "Filters in your AdBlock extension\n" +
                " @@||www.youtube.com/iframe_api$script,domain=4channel.org\n" +
                " @@||www.youtube.com/s/player/*$script,domain=4channel.org\n"
            );
        };
    });
})();
