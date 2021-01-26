// ==UserScript==
// @name 4chanX YouTube Playlists for /jp/
// @description Wraps all YouTube links within a thread into an embedded playlist
// @include https://boards.4channel.org/jp/thread/*
// @grant none
// ==/UserScript==

// -----------------[Add the following exceptions]------------------|
// 4chanX's Settings > Advanced > Javascript Whitelist              |
// https://s.ytimg.com                                              |
// https://www.youtube.com/iframe_api                               |
// -----------------------------------------------------------------|
// uBlock Origin's Dashboard > My filters                           |
// @@||s.ytimg.com$script,domain=boards.4channel.org                |
// @@||www.youtube.com/iframe_api$script,domain=boards.4channel.org |
// @@||www.youtube.com/s/player/*$script,domain=boards.4channel.org |
// -----------------------------------------------------------------|

var css, thread, posts, container, playlist, ytPlayer, toggle, threadIds = [],
    needsUpdate = false, isPlaying = false

document.addEventListener("4chanXInitFinished", function() {
    // Init playlist container
    container = document.createElement("div")
    container.id = "yt-player-container"
    container.classList.add("hide")
    container.classList.add("custom-css")
    playlist = document.createElement("div")
    playlist.id = "yt-player"
    container.appendChild(playlist)
    document.body.appendChild(container)

    // Init IDs array fetching from thread posts
    thread = document.querySelector(".board .thread")
    posts = thread.querySelectorAll(".postContainer")
    posts.forEach(post => {
        if (isYoutube(post)) {
            fetchIds(post)
        }
    })

   // Async API init
   api = document.createElement('script');
   api.src = "https://www.youtube.com/iframe_api";
   document.head.appendChild(api)

    window.onYouTubeIframeAPIReady = function() {
        console.log("YouTube Iframe API Ready.")
        // Actual player init
        ytPlayer = new YT.Player('yt-player', {
            videoId: threadIds[0],
            playerVars: {
                'fs': 0,
                'disablekb': 1,
                'modestbranding': 1,
                // 'origin': window.location.toString(),
                'playlist': threadIds.slice(1).toString()
            },
            events: {
                "onStateChange": function (event) {
                    // Debug events
                    // console.log(event)
                    if (event.data == 1) {
                        isPlaying = true
                    } else {
                        isPlaying = false
                    }
                    // Recheck playlist at the end of each video
                    if (needsUpdate && ytPlayer.getPlayerState() == 0) {
                        let currentVideo = ytPlayer.getPlaylistIndex()
                        let currentTiming = ytPlayer.getCurrentTime()
                        ytPlayer.loadPlaylist(threadIds, currentVideo, currentTiming)
                        // Reset mutation checker
                        needsUpdate = false
                    }
                }
            }
        })
    }

    // On new/deleted posts event
    document.addEventListener("ThreadUpdate", function (e) {
        if (e.detail.newPosts.length > 0) {
            let newPosts = e.detail.newPosts
            newPosts.forEach(postId => {
                let fullId = "[data-full-i-d='" + postId + "']"
                let post = thread.querySelector(".postContainer" + fullId)
                if (isYoutube(post)) {
                    fetchIds(post)
                }
            });
        }
        if (e.detail.deletedPosts.length > 0) {
            let deletedPosts = e.detail.deletedPosts
            deletedPosts.forEach(postId => {
                let fullId = "[data-full-i-d='" + postId + "']"
                let post = thread.querySelector(".postContainer" + fullId)
                if (isYoutube(post)) {
                    removeIds(post)
                }
            })
        }
        // Recheck playlist if not playing
        if (needsUpdate && !isPlaying) {
            let currentVideo = ytPlayer.getPlaylistIndex()
            let currentTiming = ytPlayer.getCurrentTime()
            ytPlayer.cuePlaylist(threadIds, currentVideo, currentTiming)
            // Reset mutation checker
            needsUpdate = false
        }
    })

    // Add toggle button to 4chanX header
    toggle = document.createElement("span")
    toggle.id = "shortcut-youtube"
    toggle.classList.add("shortcut")
    toggle.innerHTML = `
        <a class="fa fa-youtube-play disabled" 
            title="Toggle YouTube Playlist" 
            href="javascript:;">
            YT
        </a>
    `
    let qr = document.querySelector("#header-bar #shortcuts #shortcut-qr")
    qr.parentNode.insertBefore(toggle, qr)

    toggle.querySelector("a").onclick = function () {
        if (threadIds.length > 0) {
            container.classList.toggle("hide")
            this.classList.toggle("disabled")
        } else {
            // Send a custom notification if no available links
            let event = new CustomEvent("CreateNotification", {
                "detail": {
                    'type': 'warning',
                    'content': 'No valid links in this thread. :c',
                    'lifetime': 3
                }
            })
            document.dispatchEvent(event)
        }
    }
})

// Scripts
function isYoutube(post) {
    let msg = post.querySelector(".postMessage")
    if (msg.querySelector("a.linkify.youtube")) {
        return true
    }
}

function fetchIds(post) {
    let postIds = []
    let postLinks = post.querySelectorAll("a.linkify.youtube + a.embedder")
    postLinks.forEach(link => postIds.push(link.getAttribute("data-uid")))
    postIds.forEach(id => {
        if (!threadIds.includes(id)) {
            threadIds.push(id)
            needsUpdate = true
        }
    })
}

function removeIds(post) {
    let postIds = []
    let postLinks = post.querySelectorAll("a.linkify.youtube + a.embedder")
    postLinks.forEach(link => postIds.push(link.getAttribute("data-uid")))
    postIds.forEach(id => {
        if (threadIds.includes(id)) {
            threadIds.pop(id)
            needsUpdate = true
        }
    })
}

// Styling
css = document.createElement("style")
document.head.appendChild(css)
css.textContent = `
    #yt-player-container {
        z-index: 9;
        position: fixed;
        right: 0;
        bottom: 0;
    }
    #yt-player-container.hide {display: none;}
`
