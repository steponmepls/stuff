#NoEnv  ; Recommended for performance and compatibility with future AutoHotkey releases.
; #Warn  ; Enable warnings to assist with detecting common errors.
SendMode Input  ; Recommended for new scripts due to its superior speed and reliability.
SetWorkingDir %A_ScriptDir%  ; Ensures a consistent starting directory.

SetTitleMatchMode, 2
winclass = FFXIVGAME

; Look for possible configs
IniRead, ConfirmDelayValue, config.ini, Advanced, ConfirmDelay, 600
IniRead, StartcraftDelayValue, config.ini, Advanced, StartcraftDelay, 1200
IniRead, EndcraftDelayValue, config.ini, Advanced, EndcraftDelay, 2500

Gui, New
Gui, Add, Tab3, Wrap, Binds|Advanced|Debug|Help

Gui, Tab, 1
Gui, Add, Text, Section, How many loops?
Gui, Add, Edit, w200 vLoopFor Center Limit4 Number, 1

Gui, Add, Text, xs, Macro #1
Gui, Add, Edit, w99 vMacroBind1 Center 
Gui, Add, Edit, x+2 w99 vMacroDur1 Center Limit6 Number

Gui, Add, CheckBox, xs gToggleBind2 vToggleBind2, Macro #2
Gui, Add, Edit, w99 vMacroBind2 Center Disabled
Gui, Add, Edit, x+2 w99 vMacroDur2 Center Limit6 Number Disabled 

Gui, Add, CheckBox, xs gToggleBind3 vToggleBind3 Disabled, Macro #3
Gui, Add, Edit, w99 vMacroBind3 Center Disabled
Gui, Add, Edit, x+2 w99 vMacroDur3 Center Limit6 Number Disabled 
Gui, Tab

; Footer
Gui, Add, Progress, Section w224 h20 BackgroundWhite vLoopProgress
Gui, Add, Button, xs-1 w112 gStartLoop vStartButton, Start
Gui, Add, Button, x+2 w112 gCancelLoop vCancelButton Disabled, Cancel

; Advanced tab
Gui, Tab, 2
Gui, Add, Text,, Confirm delay [ConfirmDelay]
Gui, Add, Edit, w200 vConfirmDelay Limit6 Number, %ConfirmDelayValue%
Gui, Add, Text,, Synthesize delay [StartcraftDelay]
Gui, Add, Edit, w200 vStartcraftDelay Limit6 Number, %StartcraftDelayValue%
Gui, Add, Text,, End of craft delay [EndcraftDelay]
Gui, Add, Edit, w200 vEndcraftDelay Limit6 Number, %EndcraftDelayValue%
Gui, Add, Text, w200, `nDouble 'Synthesize' delay if you are playing with high ping (180-200ms).
Gui, Tab

; Debug tab
Gui, Tab, 3
Gui, Add, CheckBox, vCrafting Checked , Auto click on 'Synthesize'
Gui, Add, CheckBox, vAutohide Checked , Minimize game window
Gui, Add, CheckBox, gOnTop vOnTop Checked , Toggle 'Always on top'
Gui, Tab

; Help tab
Gui, Tab, 4
Gui, Add, Edit, Wrap ReadOnly r10 w200, The pair of forms in the 'Binds' tab works like so: left is for binds, right is for duration (in milliseconds).`nShift+X -> {Shift down}x`n24s -> 24000`n`nYou'll have to wrap your bind in curly brackets if it's longer than two characters (ex: {Home} key would be sent as h+o+m+e bind sequence instead of literal 'Home' key if not wrapped in curly brackets). Also no need to wrap your modifier binds in down/up release events as the documentation shows. A down event prefix is enough because the script will automatically release all the three modifiers once the bind is sent. This is needed to avoid issues with latency and to simplify the form.`n`nIt's also possible to save configs in the 'Advanced' tab by adding a config.ini file in the same folder as this script and filling it like so:`n`n[Advanced]`nConfirmDelay=123`nStartcraftDelay=123`nEndcraftDelay=123
Gui, Add, Link, w200, List of key names <a href="https://www.autohotkey.com/docs/commands/Send.htm#keynames">here</a>.`nBinds documentation <a href="https://www.autohotkey.com/docs/commands/Send.htm#Parameters">here</a>.
Gui, Tab

Gui, Show
Gui,+AlwaysOnTop
return

ToggleBind2:
Gui, Submit, NoHide ; Update toggle state
GuiControl, Enable%ToggleBind2%, MacroBind2
GuiControl, Enable%ToggleBind2%, MacroDur2
GuiControl, Enable%ToggleBind2%, ToggleBind3
if (ToggleBind2 = 1 and ToggleBind3 = 1) { ; if enabled
	GuiControl, Enable, MacroBind3
	GuiControl, Enable, MacroDur3
} else { ; if disabled
	GuiControl, Disable, MacroBind3
	GuiControl, Disable, MacroDur3
}
return

ToggleBind3:
Gui, Submit, NoHide ; Update toggle state
GuiControl, Enable%ToggleBind3%, MacroBind3
GuiControl, Enable%ToggleBind3%, MacroDur3
return

OnTop:
Gui, Submit, NoHide ; Update toggle state
if (OnTop = 1) {
	Gui,+AlwaysOnTop
} else {
	Gui,-AlwaysOnTop
}
return

StartLoop:
if WinExist("FINAL FANTASY XIV") {
	Gui, Submit, NoHide
	GuiControl, Enable, CancelButton
	GuiControl, Disable, StartButton
	GuiControl, Disable, ToggleBind2
	GuiControl, Disable, ToggleBind3
	GuiControl,, LoopProgress, 0 ; Reset progress bar
	GuiControl, +Range0-%LoopFor%, LoopProgress
	
	if (Autohide = 1) {
		WinMinimize, FINAL FANTASY XIV
	}
	
	Loop % LoopFor {
		if (stopLoop = 1) {
			stopLoop := 0
			break
		}
		
		ControlSend, , %MacroBind1%, ahk_class %winclass%
		; What the fuck is this you ask? It's here so you don't need
		; to wrap your binds in both down/up tags + solve latency issues
		; causing normal binds being sent instead of modifier combos
		; probably due to up event being sent too fast..
		; Smol indie company purisu understand
		sleep 100
		ControlSend, , {alt up}{shift up}{ctrl up}, ahk_class %winclass%
		sleep %MacroDur1%
		
		if (ToggleBind2 = 1) { ; if checked
			ControlSend, , %MacroBind2%, ahk_class %winclass%
			sleep 100
			ControlSend, , {alt up}{shift up}{ctrl up}, ahk_class %winclass%
			sleep %MacroDur2%
			if (ToggleBind3 = 1) { ; if checked
				ControlSend, , %MacroBind3%, ahk_class %winclass%
				sleep 100
				ControlSend, , {alt up}{shift up}{ctrl up}, ahk_class %winclass%
				sleep %MacroDur3%
			}
		}
		
		GuiControl,, LoopProgress, +1
		
		if (Crafting = 1) {
			sleep %EndcraftDelay%
		}
		
		if (A_Index < LoopFor) {
			if (Crafting = 1) {
				ControlSend, , {Numpad0}, ahk_class %winclass% ; Gain window focus
				sleep %ConfirmDelay%
				ControlSend, , {Numpad0}, ahk_class %winclass% ; Select last crafted recipe
				sleep %ConfirmDelay%
				ControlSend, , {Numpad0}, ahk_class %winclass% ; Select 'Synthesize'
				sleep %StartcraftDelay%
			}
		} else {
			Gui, Flash
			GuiControl, Disable, CancelButton
			GuiControl, Enable, StartButton
			GuiControl, Enable, ToggleBind2
			if (ToggleBind2 = 1) {
				GuiControl, Enable, ToggleBind3
			}
		}
	}
} else { ; Unnecessarily rude alert
	MsgBox, You have to start the game first you twat!
}
return

CancelLoop:
GuiControl, Disable, CancelButton
GuiControl, Enable, StartButton
stopLoop := 1
return

GuiClose:
ExitApp
return
