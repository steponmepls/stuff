-- Tweaked script so webms and gifs without audio are also parsed as (animated) images
-- Source: https://git.sr.ht/~guidocella/mpv-image-config/tree/master/item/scripts/image-detection.lua

local was_image

function reset_filters()
	mp.set_property('vf set', '')
	mp.set_property('video-pan-x', 0)
	mp.set_property('video-pan-y', 0)
	mp.set_property('video-zoom', 0)
end

mp.register_event('file-loaded', function()
	local container_fps = mp.get_property_number('container-fps')
	local file_format = mp.get_property('video-format')
	-- check if still image but
	if (container_fps == 1 or container_fps == nil)
	-- also consider animated webm/gif
	or (file_format == 'vp8' or file_format == 'vp9' or file_format == 'gif')
	--  without audio
	and not mp.get_property('audio-codec') then
		if (was_image == false or was_image == nil) then
			mp.command('enable-section image')
			was_image = true
		else
			reset_filters()
		end
	elseif (was_image == true) then
		reset_filters()
		mp.command('disable-section image')
		was_image = false
	end
end)
