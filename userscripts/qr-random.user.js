// ==UserScript==
// @name 4chanX Randomizer in QR filename
// @include https://boards.4chan.org/*
// @include https://boards.4channel.org/*
// @grant none
// @run-at document-start
// ==/UserScript==

(function () {
    document.addEventListener("4chanXInitFinished", initTweaks);
    document.addEventListener("QRDialogCreation", initTweaks);
    function initTweaks() {
        if (document.querySelector("#qr")) {
            var qr = document.querySelector("#qr");
            // Randomizer in QR
            let container = qr.querySelector("#qr-filename-container");
            let filename = container.querySelector("#qr-filename");
            if (!container.querySelector("#randomizer")) {
                var randomizer = document.createElement("a");
                randomizer.id = "randomizer";
                randomizer.setAttribute("title", "Randomize filename");
                randomizer.setAttribute("aria-hidden", "true");
                randomizer.setAttribute("class", "fa fa-hashtag");
                randomizer.style.opacity = ".6";
                randomizer.onclick = function() {
                    $.DAY = 24 * ($.HOUR = 60 * ($.MINUTE = 60 * ($.SECOND = 1000)))
                    let newFilename = (Date.now() - Math.floor(Math.random() * 365 * $.DAY))
                    filename.value = newFilename
                };
                container.appendChild(randomizer);
            };
        };
    };
})();
