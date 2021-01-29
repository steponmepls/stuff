-- Just a script to quickly copy title + url from streamed playlists
-- requires xclip if on *nix - https://github.com/astrand/xclip
-- starts_with() function comes from here:
-- https://web.archive.org/web/20200627024126/http://lua-users.org/wiki/StringRecipes

function fetchTitle()
	local title = mp.get_property("media-title")
	local path = mp.get_property("path")
	if (type(title) == "string" and type(path) == "string") then
		local function starts_with(str, start)
			return str:sub(1, #start) == start
		end
		if (starts_with(path, "http")) then
			copyTitle(title, path)
		end
	else
		mp.osd_message("Error: coudln't copy title to clipboard")
	end
end

function copyTitle(title, url)
	local output = title .. " " .. url
	if (isWindows()) then
		mp.commandv("run", "powershell", "set-clipboard -Value \"", output, "\".trim()")
	elseif (isMac()) then
		mp.commandv("run", "echo \"", output, "\" | pbcopy")
	else
		mp.commandv("run", "echo \"", output, "\" | xclip -selection clipboard")
	end
	mp.osd_message("Title copied to clipboard")
end

function isWindows()
	local pathSeparator = package.config:sub(1,1)
	if (pathSeparator == "\\") then
		return true
	else
		return false
	end
end

function isMac()
	local tempfile = io.popen("uname -s")
	local kernel = tempfile:read()
	tempfile:close()
	if not (kernel == "Linux") then
		return true
	else
		return false
	end
end

mp.add_key_binding("ctrl+c", "copyTitle", fetchTitle)
