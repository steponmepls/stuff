// ==UserScript==
// @name            FFXIV Fish Tracker Autocomplete
// @namespace       ff14fish-carbuncleplushy-autocomplete
// @description     Adds autocomplete buttons to use with Import feature
// @match           https://ff14fish.carbuncleplushy.com/
// @grant           none
// ==/UserScript==

const  fishes = Object.entries(DATA.FISH), exportedFishes = {}, 
    importButton = document.getElementById("checklist").parentNode, 
    autoComplete = document.getElementById("filterPatch").cloneNode(true),
    loadData = document.getElementById("import-settings-load");

//  Add patch picker to Advanced settings
let row = document.createElement("div");
row.classList.add("centered", "row");
importButton.parentNode.insertBefore(row, importButton);
let header = autoComplete.querySelector(".row");
header.innerText = "Autocomplete by Expansion or Patch:";
autoComplete.id = "autocomplete-fishes";
row.appendChild(autoComplete);

let container = document.createElement("div");
container.classList.add("column");
container.style.width="unset";
container.innerHTML = `<div class="row" style="padding-bottom: .5rem"><div class="ui mini compact buttons" style="width: 100%;"><div id="inject-autocomplete" class="ui button">Autocomplete</div></div></div><div class="row"><div class="field"><textarea id="inject-textarea" style="font-family: monospace; resize: none; height: 7.8rem;"></textarea></div></div>`;
autoComplete.parentNode.appendChild(container);

const injectButton = document.getElementById("inject-autocomplete"),
    injectTextarea = document.getElementById("inject-textarea");

// Init inject area as disabled due to Object having no children on start
injectButton.classList.add("disabled");
injectTextarea.setAttribute("disabled", "");

// Append flattened array copy of the object in the textarea..
injectButton.addEventListener("click", () => {
    // ..only if the object contains fishes
    if (Object.keys(exportedFishes).length > 0) {
        let flattenedArray = Object.values(exportedFishes).flat().toString();
        injectTextarea.value = "[" + flattenedArray + "]";
    }
});

// Autoselect all textarea content on click
injectTextarea.addEventListener("click", (e) => {
    e.target.focus();
    e.target.select();
});

// Init autocompletion buttons ignoring patches not yet released
autoComplete.querySelectorAll(".button[data-filter]:not(.disabled)").forEach((button, i, l) => {
    // Make sure all buttons are toggled off on start
    button.classList.remove("active");
    button.addEventListener("click", (e) => togglePatch(e.target, l) );
});

// Reset autocompletion buttons after Load in Import Settings
loadData.addEventListener("click", () => {
    if (Object.keys(exportedFishes).length > 0) {
        // Clear the autocompletion object
        for (let f in exportedFishes) {
            delete exportedFishes[f];
        }
        // Reset styling for buttons
        autoComplete.querySelectorAll(".button[data-filter]:not(.disabled)").forEach(button => {
            button.classList.remove("active");
        });
        // Disable injection button+textarea
        injectButton.classList.add("disabled");
        injectTextarea.setAttribute("disabled", "");
        // Reset textarea value to none
        injectTextarea.value = "";
    }
});

function togglePatch(button, nodeList) {
    // Get patch number from the button itself
    let patch = button.getAttribute("data-filter");
    if (button.classList.contains("patch-set")) { // If expac button
        // Remove all previous occurrances of siblings
        // This happens both when toggling on and off
        // so I just put it here at the beginning (?)
        for (p in exportedFishes) {
            if (p.startsWith(patch)) {
                delete exportedFishes[p]
            }
        };
        // Fetch patch number from siblings
        let siblingButtons = Array.from(nodeList).filter(node => 
            !node.classList.contains("patch-set") &&
            node.getAttribute("data-filter").startsWith(patch)
        );
        // Toggle expac button + patch buttons
        if (button.classList.contains("active")) { // ON -> OFF
            siblingButtons.forEach(b => b.classList.remove("active"));
        } else { // OFF -> ON
            siblingButtons.forEach(b => {
                b.classList.add("active");
                let p = b.getAttribute("data-filter");
                exportedFishes[p] = fishesFrom(p);
            })
        };
    } else { // If patch button
        // Toggle single patch button
        if (patch in exportedFishes) { // ON -> OFF
            delete exportedFishes[patch]
        } else { // OFF -> ON
            exportedFishes[patch] = fishesFrom(patch)
        }
    };
    button.classList.toggle("active");

    // Disables inject if no expac/patch has been set
    if (Object.keys(exportedFishes).length > 0) {
        injectButton.classList.remove("disabled");
        injectTextarea.removeAttribute("disabled");
    } else {
        injectButton.classList.add("disabled");
        injectTextarea.setAttribute("disabled", "");
    };
}

// So small !!
function fishesFrom(p) {
    let fList = fishes.filter(fish => fish[1].patch == p).flat()
                .filter(i => typeof i === "string");
    return fList;
}
