Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d """ & Replace(WScript.ScriptFullName, WScript.ScriptName, "") & """ && node server/index.js", 0, False
