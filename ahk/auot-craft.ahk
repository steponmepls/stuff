#NoEnv  ; Recommended for performance and compatibility with future AutoHotkey releases.
; #Warn  ; Enable warnings to assist with detecting common errors.
SendMode Input  ; Recommended for new scripts due to its superior speed and reliability.
SetWorkingDir %A_ScriptDir%  ; Ensures a consistent starting directory.

SetTitleMatchMode, 2
winclass = FFXIVGAME

; Look for possible configs
IniRead, ConfirmDelayValue, auto-craft.ini, Advanced, ConfirmDelay, 600
IniRead, StartcraftDelayValue, auto-craft.ini, Advanced, StartcraftDelay, 1200
IniRead, EndcraftDelayValue, auto-craft.ini, Advanced, EndcraftDelay, 2500

; Main
Gui, New
Gui, Add, Tab3, Wrap Section, Binds|Advanced
Gui, Tab, 1
	Gui, Add, Text, Section, How many loops?
	Gui, Add, Edit, xs w200 vLoopFor Center Limit4 Number, 1
	; Macro 1
	Gui, Add, Text, xs, Macro #1
	Gui, Add, Edit, vMacroBind1 Center xs w99
	Gui, Add, Edit, vMacroDur1 Center Limit6 Number x+2 w99
	; Macro 2
	Gui, Add, CheckBox, vToggleBind2 gToggleBind2 xs, Macro #2
	Gui, Add, Edit, vMacroBind2 Center Disabled w99
	Gui, Add, Edit, vMacroDur2 Center Limit6 Number Disabled x+2 w99
	; Macro 3
	Gui, Add, CheckBox, vToggleBind3 gToggleBind3 xs Disabled, Macro #3
	Gui, Add, Edit, vMacroBind3 Center Disabled w99
	Gui, Add, Edit, vMacroDur3 Center Limit6 Number Disabled x+2 w99
	Gui, Add, Link, xs w200, <a href="https://www.autohotkey.com/docs/commands/Send.htm#keynames">Key names</a> | <a href="https://www.autohotkey.com/docs/commands/Send.htm#Parameters">Formatting</a> | <a href="https://github.com/steponmepls/scripts/wiki/AutoCraft-Documentation">How to use?</a>
Gui, Tab

; Footer
Gui, Add, Progress, Section BackgroundWhite vLoopProgress w224 h20
Gui, Add, Button, vStartButton gStartLoop xs-1 w112, Start
Gui, Add, Button, vCancelButton gCancelLoop Disabled x+2 w112, Cancel

Gui, Tab, 2
	Gui, Add, Text, Section, Confirm delay
	Gui, Add, Edit, vConfirmDelay Center Limit6 Number w65, %ConfirmDelayValue%
	Gui, Add, Button, gSaveConfirmDelay x+3 yp-1 w65, Save
	Gui, Add, Button, gResetConfirmDelay x+2 w65, Reset
	Gui, Add, Text, xs, Synthesize delay
	Gui, Add, Edit, vStartcraftDelay Center Limit6 Number w65, %StartcraftDelayValue%
	Gui, Add, Button, gSaveStartcraftDelay x+3 yp-1 w65, Save
	Gui, Add, Button, gResetStartcraftDelay x+2 w65, Reset
	Gui, Add, Text, xs, End of craft delay
	Gui, Add, Edit, vEndcraftDelay Center Limit6 Number w65, %EndcraftDelayValue%
	Gui, Add, Button, gSaveEndcraftDelay x+3 yp-1 w65, Save
	Gui, Add, Button, gResetEndcraftDelay x+2 w65, Reset
	Gui, Add, CheckBox, vCrafting Checked xs, Start new craft each loop
	Gui, Add, CheckBox, vAutohide Checked, Minimize game window
	Gui, Add, CheckBox, gOnTop vOnTop Checked, Enable 'Always on top'
Gui, Tab

Gui, Show
Gui,+AlwaysOnTop
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
			
			GuiControl,, LoopProgress, +1 ; Update progress bar
			if (Crafting = 1) {  ; Wait for animation if crafting
				sleep %EndcraftDelay% 
			}
			if (A_Index < LoopFor) { ; If not at the end of the loop
				if (Crafting = 1) { ; Start new craft if crafting
					ControlSend, , {Numpad0}, ahk_class %winclass% ; Gain window focus
					sleep %ConfirmDelay%
					ControlSend, , {Numpad0}, ahk_class %winclass% ; Select last crafted recipe
					sleep %ConfirmDelay%
					ControlSend, , {Numpad0}, ahk_class %winclass% ; Select 'Synthesize'
					sleep %StartcraftDelay%
				}
			} else { ; If at end of the loop
				Gui, Flash
				GuiControl, Disable, CancelButton
				GuiControl, Enable, StartButton
				GuiControl, Enable, ToggleBind2
				if (ToggleBind2 = 1) {
					GuiControl, Enable, ToggleBind3
				}
			}
		}
	} else {
		MsgBox, You have to start the game first you twat!
	}
return

ToggleBind2:
	Gui, Submit, NoHide
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
	Gui, Submit, NoHide
	GuiControl, Enable%ToggleBind3%, MacroBind3
	GuiControl, Enable%ToggleBind3%, MacroDur3
return

CancelLoop:
	GuiControl, Disable, CancelButton
	GuiControl, Enable, StartButton
	GuiControl, Enable, ToggleBind2
	if (ToggleBind2 = 1) {
		GuiControl, Enable, ToggleBind3
	}
	stopLoop := 1
return

OnTop:
	Gui, Submit, NoHide ; Update toggle state
	if (OnTop = 1) {
		Gui,+AlwaysOnTop
	} else {
		Gui,-AlwaysOnTop
	}
return

SaveConfirmDelay:
	Gui, Submit, NoHide
	IniWrite, %ConfirmDelay%, auto-craft.ini, Advanced, ConfirmDelay
return
SaveStartcraftDelay:
	Gui, Submit, NoHide
	IniWrite, %StartcraftDelay%, auto-craft.ini, Advanced, StartcraftDelay
return
SaveEndcraftDelay:
	Gui, Submit, NoHide
	IniWrite, %EndcraftDelay%, auto-craft.ini, Advanced, EndcraftDelay
return

ResetConfirmDelay:
	GuiControl, Text, ConfirmDelay, 600
	IniDelete, auto-craft.ini, Advanced, ConfirmDelay
return
ResetStartcraftDelay:
	GuiControl, Text, StartcraftDelay, 1200
	IniDelete, auto-craft.ini, Advanced, StartcraftDelay
return
ResetEndcraftDelay:
	GuiControl, Text, EndcraftDelay, 2500
	IniDelete, auto-craft.ini, Advanced, EndcraftDelay
return

GuiClose:
ExitApp
return
