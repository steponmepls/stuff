-- Tweaked script so webms and gifs without audio are also parsed as (animated) images
-- Source: https://git.sr.ht/~guidocella/mpv-image-config/tree/master/item/scripts/image-detection.lua

local was_image

mp.register_event('file-loaded', function()
    local container_fps = mp.get_property_number('container-fps')
	local file_format = mp.get_property('video-format')
	-- check if still image but
	if (container_fps == 1 or container_fps == nil)
		-- also consider animated webm/gif
		or (file_format == 'vp8' or file_format == 'vp9' or file_format == 'gif')
		--  without audio
        and not mp.get_property('audio-codec') then
        -- mp.command('show-text "[${playlist-pos-1}/${playlist-count}] ${filename} ${width}x${height} ${!gamma==0:☀}" 3000')
        -- Or set osd-msg1 to show text permanently.

        if not was_image then
            -- mp.set_property('video-unscaled', 'yes')
			mp.command('apply-profile image')
            mp.command('enable-section image')
            was_image = true
        end
    elseif was_image then
        --mp.set_property('video-unscaled', 'no')
        mp.set_property('video-zoom', 0)
        mp.set_property('panscan', 0)
        mp.command('disable-section image')
        was_image = false
    end
end)
