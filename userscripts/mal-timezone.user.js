// ==UserScript==
// @name MAL Timezone Converter
// @description Converts JST broadcast time into your timezone
// @include https://myanimelist.net/anime/*/*
// @include https://myanimelist.net/anime/season*
// @require https://momentjs.com/downloads/moment.min.js
// @require https://momentjs.com/downloads/moment-timezone-with-data.min.js
// @grant none
// ==/UserScript==

// https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
// If timezone isn't guessed correctly you can manually set it
// Example: var zone = "America/Toronto"
var zone = ""

function isSeason() { // Ugly regex check shush don't look at it
    let regex = /^https:\/\/myanimelist\.net\/anime\/season/
    if (regex.test(window.location.href)) {
        return true
    } else {
        return false
    }
}

function toLocalezone(string) {
    if (isSeason()) { //  Oct 1, 2020, 23:30 (JST)
        var format = "MMM D, YYYY, HH:mm (z)"
    } else { // Thursdays at 23:30 (JST)
        var format = "dddd[s at] HH:mm (z)"
    }
    if (zone === "") {zone = moment.tz.guess()}
    let input = moment.tz(string, format, "Asia/Tokyo")
    let result = input.tz(zone).format(format)
    return result.toString()
}

if (isSeason()) {
    var animeList, animeItem
    animeList = document.querySelectorAll(".seasonal-anime-list > .seasonal-anime")
    animeList.forEach(animeItem => {
        let  broadcastDate = animeItem.querySelector(".remain-time")
        if (/\(JST\)$/.test(broadcastDate.innerText)) {
            broadcastDate.setAttribute("title", toLocalezone(broadcastDate.innerText.trim()))
        }
    })
} else {
    var infoList = document.querySelectorAll("#content > table div.spaceit")
    infoList.forEach(info => {
        let infoText = info.innerText
        if (/^Broadcast:/.test(infoText)) {
            info.setAttribute("title", toLocalezone(infoText.replace("Broadcast: ", "")))
        }
    })
}
