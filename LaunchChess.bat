@echo off
NET SESSION >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo   NEED ADMIN - Relaunching...
    echo ========================================
    powershell -Command "Start-Process cmd -ArgumentList '/c cd /d \"%~dp0\" && \"%~f0\"' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo.
echo ========================================
echo   Opening firewall for Emma's Chess...
echo ========================================
netsh advfirewall firewall delete rule name="Emmas Chess" >nul 2>&1
netsh advfirewall firewall add rule name="Emmas Chess" dir=in action=allow protocol=TCP localport=3000 profile=any >nul 2>&1
if %errorlevel% equ 0 (
    echo   Firewall rule added successfully!
) else (
    echo   Warning: Could not add firewall rule
)

echo.
echo ========================================
echo.
echo   YOUR IP ADDRESSES:
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do echo     http://%%a:3000
echo.
echo   On THIS machine:
echo     http://localhost:3000
echo.
echo ========================================
echo   Emma's Chess Server is running!
echo   Keep this window open (minimize it).
echo   Press Ctrl+C to stop.
echo ========================================
echo.

node server/index.js
pause
