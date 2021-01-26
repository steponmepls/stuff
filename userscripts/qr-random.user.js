// ==UserScript==
// @name 4chanX Randomizer in QR filename
// @include https://boards.4chan.org/*
// @include https://boards.4channel.org/*
// @grant none
// ==/UserScript==

document.addEventListener("4chanXInitFinished", function() {
    //console.log("Init")
    if (document.querySelector("#qr")) {
        initRandomizer()
        // fallback for non-persistent QR configs
        document.addEventListener("QRDialogCreation", function() {
            initRandomizer()
        })
    }
});

// dirtier fallback for those times 4chanX init doesn't fire somehow
setTimeout(function() {
    if (document.querySelector("#qr")) {
      initRandomizer()
    }
  }, 3000);

function initRandomizer() {
    var container = document.querySelector("#qr-filename-container")
    var filename = container.querySelector("#qr-filename")
    if (!container.querySelector("#randomizer")) {
        var randomizer = document.createElement("a")
        randomizer.id = "randomizer"
        randomizer.setAttribute("title", "Randomize filename")
        randomizer.setAttribute("aria-hidden", "true")
        randomizer.setAttribute("class", "fa fa-hashtag")
        randomizer.style.opacity = ".6"
        randomizer.onclick = function() {
            $.DAY = 24 * ($.HOUR = 60 * ($.MINUTE = 60 * ($.SECOND = 1000)))
            let newFilename = (Date.now() - Math.floor(Math.random() * 365 * $.DAY))
            filename.value = newFilename
        }
        container.appendChild(randomizer)
    }
};