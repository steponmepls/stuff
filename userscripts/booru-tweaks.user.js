// ==UserScript==
// @name        Booru Tweaks
// @namespace   Violentmonkey Scripts
// @match       https://danbooru.donmai.us/
// @match       https://danbooru.donmai.us/posts
// @exclude     https://danbooru.donmai.us/posts/
// @grant       none
// @version     1.0
// @author      -
// @description Adds some stuff like infinite scroll and hover preview
// @require https://unpkg.com/infinite-scroll@3/dist/infinite-scroll.pkgd.min.js
// ==/UserScript==

var css, container, imgPreview, webmPreview, nodes, boorus = [];

container = document.createElement("div");
container.id = "preview-hover";
imgPreview = new Image();
imgPreview.id = "preview-image";
webmPreview = document.createElement("video");
webmPreview.id = "preview-webm";
webmPreview.defaultMuted = true;
webmPreview.autoplay = true;
webmPreview.loop = true;
container.appendChild(imgPreview);
container.appendChild(webmPreview);
document.body.appendChild(container);

boorus = [
    {
        url: "https://danbooru.donmai.us",
        container: "#posts-container",
        nextpage: ".paginator a#paginator-next",
        newitem: "article[id^='post_']",
        permalink: "a",
        thumbnail: "a picture img",
        regex: /danbooru\.donmai\.us\/data\//i
    },
    {
        url: "https://gelbooru.com",
        container: ".thumbnail-container",
        nextpage: function() {
            let pageNumber = (this.loadCount + 1) * 42
            return window.location.href.replace(/&pid=\d+/,"") + "&pid=" + pageNumber
        },
        newitem: "div.thumbnail-preview",
        permalink: "a[id^=p]",
        thumbnail: "img.thumbnail-preview",
        regex: /img\d\.gelbooru/i
    },
    {
        url: "https://yande.re",
        container: "#post-list-posts",
        nextpage: ".pagination > a.next_page",
        newitem: "li[id^='p']",
        permalink: "a.thumb",
        thumbnail: "a.thumb > img",
        regex: /files\.yande\.re/i
    }
];

for (let i=0; i<boorus.length; i++) {
    if (correctURL(boorus[i].url)) {
        nodeList = document.querySelector(boorus[i].container)
        nodeList.querySelectorAll(boorus[i].newitem).forEach(node => {
            // Add mouse enter event to all starting items
            node.addEventListener("mouseenter", function() {
                hoverPreview(
                    node,
                    boorus[i].permalink,
                    boorus[i].thumbnail,
                    boorus[i].regex
                )
            })
        })

        // Start infinite scroll
        var infScroll = new InfiniteScroll( boorus[i].container, {
            path: boorus[i].nextpage,
            append: boorus[i].newitem,
            history: false,
            //debug: true
        })

        // Custom infinite scroll settings
        if (i == 1) { // If yande.re
            infScroll.option({
                scrollThreshold: 400,
                loadOnScroll: false,
                elementScroll: document.body.parentNode
            })
            // Unhide newly added items
            infScroll.on( 'append', function( response, path, items ) {
                items.forEach(item => {
                    item.classList.remove("javascript-hide")
                })
            })
        }

        // Add mouse enter event to all newly added items by infinite scroll
        infScroll.on( 'append', function( response, path, items ) {
            items.forEach(item => {
                item.addEventListener("mouseenter", function() {
                    hoverPreview(
                        item,
                        boorus[i].permalink,
                        boorus[i].thumbnail,
                        boorus[i].regex
                    )
                })
            })
        })

        // End of booru array loop check
        break
    }
};

function hoverPreview(node, url, thmb, regex) {
    let permalink = node.querySelector(url)
    let thumbnail = node.querySelector(thmb)

    // Exec if node hasn't been init
    if (!thumbnail.getAttribute("data-source")) {
        // Defuse title attribute
        if (!thumbnail.getAttribute("data-title")) {
            let title = thumbnail.title
            thumbnail.setAttribute("data-title", title)
            thumbnail.removeAttribute("title")
        }
        // Send fetch request if cursor stays on thumb for at least 500ms
        cursorOntop = setTimeout(function(){
            fetchImage(permalink.href, thumbnail, regex)
        }, 500)
        // Abort fetch request wait if cursor leaves thumb before 500ms
        node.addEventListener("mouseleave", function(){
            clearTimeout(cursorOntop)
        }, {once: true})
    } else {
        showPreview(thumbnail.getAttribute("data-source"))
    }
}

function showPreview(img) {
    if (isWebm(img)) {
        webmPreview.src = img
        webmPreview.muted = true
    } else {
        imgPreview.src = img
        imgPreview.removeAttribute("style")
        imgPreview.removeAttribute("hidden")
    }
}

function fetchImage(url, thmb, regex) {
    fetch(url, {credentials: "same-origin"})
    .then(response => response.text())
    .then(data => {
        let parser = new DOMParser()
        data = parser.parseFromString(data, "text/html")
        // Turn HTMLCollection into array so I can use find()
        let links = Array.from(data.links)
        let result = links.find(link => regex.test(link.href))
        thmb.setAttribute("data-source", result)
        // Hide preview if attribute exists and cursor left thumb
        thmb.addEventListener("mouseleave", function() {
            imgPreview.removeAttribute("src")
            webmPreview.removeAttribute("src")
        })
        showPreview(thmb.getAttribute("data-source"))
    })
}

function correctURL(address) {
    let currentURL = window.location.href
    let regex = new RegExp("^" + address, "g")
    if (regex.test(currentURL)) {
        return true
    }
}

function isWebm(url) {
    let regex = /\.(webm|mp4)$/
    if (regex.test(url)) {
        return true
    }
}

css = document.createElement("style");
document.head.appendChild(css);
css.textContent = `
    #preview-hover {
        display: flex;
        justify-content: center;
        align-items: center;
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
    }
    #preview-hover > img:not([src]), 
    #preview-hover > img[src="null"],
    #preview-hover > video:not([src]) {
        display: none;
    }
    #preview-hover > img, #preview-hover > video {
        display: block;
        max-width: 90vw;
        max-height: 90vh;
    }
`;
