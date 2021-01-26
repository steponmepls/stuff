// ==UserScript==
// @name Source link - Sad Panda
// @include https://exhentai.org/*/*/*
// @grant none
// ==/UserScript==

var regex, originalTitle, link

// old regex /^(?:(?:\[.+?\]|\(.+?\)) )+(.+)(?: (?:\[.+?\]|\(.+?\)))$/g
regex = /^(?:(?:\(.+?\) ?)+)?(?:(?:\[.+?\] ?)+)?(.+?)(?:(?: ?\(.+?\))+)?(?:(?: ?\[.+?\])+)?$/
originalTitle = document.querySelector(".gm > #gd2 > #gj")
link = document.createElement("a")
originalTitle.parentNode.insertBefore(link,originalTitle)
link.appendChild(originalTitle)
originalTitle = regex.exec(originalTitle.innerText)
link.href = "/?f_search=" + `${originalTitle[1]}`

console.log("Debug: " + `${originalTitle[1]}`)
