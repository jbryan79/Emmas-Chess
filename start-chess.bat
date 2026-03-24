@echo off
title Emma's Chess Server
cd /d "%~dp0"
echo.
echo    ==============================
echo       Emma's Chess Server
echo       http://192.168.50.153:3000
echo    ==============================
echo.
echo    Keep this window open (minimize it).
echo.
node server/index.js
pause
