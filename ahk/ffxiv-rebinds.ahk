#NoEnv  ; Recommended for performance and compatibility with future AutoHotkey releases.
SendMode Input  ; Recommended for new scripts due to its superior speed and reliability.
SetWorkingDir %A_ScriptDir%  ; Ensures a consistent starting directory.
#NoTrayIcon

if WinExist("FINAL FANTASY XIV") {
	WinWaitClose, FINAL FANTASY XIV
	ExitApp
}

#If WinActive("FINAL FANTASY XIV")
	!Tab::Return ; Disable Alt+Tab
	#Tab::Return ; Disable Windows Key + Tab
	;LWin::Return ; Disable Left Windows Key
	RWin::Return ; Disable Right Windows Key
	CapsLock::Shift ; Remap CapsLock into Shift
#If
