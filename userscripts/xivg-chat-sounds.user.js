// ==UserScript==
// @name        FFXIV Chat sounds for /xivg/
// @namespace   xivg-chat-sounds
// @match       https://boards.4channel.org/vg/thread/*
// @grant       none
// @version     1.0
// @author      -
// @description Play chat sounds from new posts.
// @run-at document-start
// ==/UserScript==

// pls don't read my code it's ugly

(function() {
    // wait for 4chanX
    document.addEventListener("4chanXInitFinished", function (e) {
        const thread = document.querySelector(".thread"),
            sysSounds = [
                "https://a.pomf.cat/hoawrt.ogg",
                "https://a.pomf.cat/dhhxra.ogg",
                "https://a.pomf.cat/okvhzx.ogg",
                "https://a.pomf.cat/ujxzje.ogg",
                "https://a.pomf.cat/ymtxag.ogg",
                "https://a.pomf.cat/iqfhge.ogg",
                "https://a.pomf.cat/tgzypq.ogg",
                "https://a.pomf.cat/lanymu.ogg",
                "https://a.pomf.cat/cwohfm.ogg",
                "https://a.pomf.cat/gjoflq.ogg",
                "https://a.pomf.cat/txiysh.ogg",
                "https://a.pomf.cat/fvqcyx.ogg",
                "https://a.pomf.cat/dccedn.ogg",
                "https://a.pomf.cat/ycgyxz.ogg",
                "https://a.pomf.cat/epgqkl.ogg",
                "https://a.pomf.cat/fwqloa.ogg"
            ];

        if (isXivg(thread.querySelector(".opContainer"))) { // if op subject contains xivg keywords
            let cooldown = 0; // init cd value

            // init players
            // why 5 players? a single player can't handle 5 sounds playing at once wat the heck!!!
            const cPlayer = document.createElement("div");
            cPlayer.id = "xivg-chat-sounds";
            document.body.appendChild(cPlayer);
            for (let i=1; i<6; i++) {
                const newPlayer = document.createElement("audio");
                newPlayer.volume = 0.25;
                newPlayer.setAttribute("preload", "auto");
                newPlayer.classList.add("player" + i);
                cPlayer.appendChild(newPlayer);
            }

            document.addEventListener("ThreadUpdate", function (e) {
                if (e.detail[404] === false) {
                    if (e.detail.newPosts.length > 0) {
                        // console.debug("Possible new posts..");
                        const newPosts = e.detail.newPosts;
                        for (const id of newPosts) {
                            const post = thread.querySelector(".postContainer[id$=\"" + id.split(".").pop() + "\"]"), 
                                postMessage = post.querySelector(".postMessage").innerText,
                                regex = /<se\.([1-9]|1[0-6])>/g,
                                sounds = [];

                            // why not reusing regex variable you ask? BECAUSE JAVASCRIPT FUCKING SUCKS COCKS AND BALLS
                            // more on the issue here https://jsfiddle.net/1qymptex/
                            // and here https://medium.com/software-developer/reusing-javascript-regexp-instance-fails-test-and-exec-when-it-shouldnt-fd911def684e
                            if (/<se\.([1-9]|1[0-6])>/.test(postMessage) && cooldown === 0) { // if post includes matching patterns and not on cd
                                const rawSounds = postMessage.matchAll(regex), 
                                    players = cPlayer.querySelectorAll("audio");

                                for (const sound of rawSounds) { // loop through them
                                    sounds.push(parseInt(sound[1])) // and add them to the post container
                                }
                                const sanitizedSounds = sounds.slice(0, 5);
                                // console.debug(sounds);
                                // console.debug(sanitizedSounds);

                                players.forEach(player => {player.removeAttribute("src")});
                                sanitizedSounds.forEach((sound, i) => {
                                    players[i].src = sysSounds[sound - 1];
                                    players[i].play();
                                });
                                startCD();

                                // you fuck I told not to read
                            }
                        };
                    }
                }
            });
        }

        function isXivg(node) { // make sure it's actually a xivg thread
            const subject = node.querySelector(".postInfo > .subject").innerText,
                // maybe overkill but it should match all words in any order in the subject
                regex = /^(?=.*\bxivg\b)(?=.*\bFinal\b)(?=.*\bFantasy\b)(?=.*\bXIV\b).*$/i;

            // was toString() necessary? dunno
            if (regex.test(subject)) {
                console.debug("It's probably xivg. Subject: " + subject);
                return true
            } else {
                return false
            }
        }

        function startCD() {
            cooldown = 60;
            console.debug("Cooldown set to " + cooldown);
            const timer = setInterval(() => {
                cooldown--;
                if (cooldown === 0) {
                    console.debug("Cooldown back to " + cooldown);
                    clearInterval(timer)
                } else {
                    // console.debug("chatsndCD: " + cooldown);
                };
            }, 1000);
        }
    });
})();