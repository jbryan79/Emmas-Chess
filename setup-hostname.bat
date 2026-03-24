@echo off
echo.
echo    ==============================
echo     Setting up "emmaschess" hostname
echo    ==============================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo This needs to run as Administrator.
    echo Right-click this file and select "Run as administrator"
    pause
    exit /b
)

:: Add hostname to hosts file if not already there
findstr /c:"emmaschess" %windir%\System32\drivers\etc\hosts >nul 2>&1
if %errorlevel% neq 0 (
    echo.>> %windir%\System32\drivers\etc\hosts
    echo 192.168.50.153    emmaschess>> %windir%\System32\drivers\etc\hosts
    echo Done! "emmaschess" now points to 192.168.50.153
) else (
    echo Already set up! "emmaschess" is already in your hosts file.
)

echo.
echo You can now open:  http://emmaschess:3000
echo.
pause
