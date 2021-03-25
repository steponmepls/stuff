// ==UserScript==
// @name            TeamCraft Handlers
// @namespace       teamcraft-handlers
// @match           https://www.garlandtools.org/db/
// @grant           none
// @version         1.2
// @author          -
// @description     Adds TC handlers to Garland Tools recipes.
// ==/UserScript==

const container = document.getElementById("main"),
        options = { childList: true, subtree: true },
        regex = /^https:\/\/ffxivteamcraft\.com\//g;

// Sample function from Mozilla MDN
const mutationCallback = function(mutationsList, observer) {
    for(const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            let recipeList = container.querySelectorAll(".block.item:not(.has-handler)");
            recipeList.forEach(recipe => {
                addHandler(recipe);
            });
        }
    }
};

const observer = new MutationObserver(mutationCallback);
observer.observe(container, options);

function addHandler(r) {
    // If craftable
    if (r.querySelector(".craftinfo > div > .action-link + a")) {
        r.classList.add("has-handler");
        let simLink = r.querySelector(".craftinfo > div > .action-link + a");
        let newLink = simLink.href.replace(regex, "teamcraft://");
        simLink.setAttribute("href", newLink);
        simLink.removeAttribute("target");
    }
};
