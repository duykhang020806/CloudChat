@echo off
title CloudChat Launcher
echo ========================================================
echo               CloudChat - Web Chat Cloud
echo ========================================================
echo.
echo Dang khoi dong Backend tai port 8787...
start "CloudChat Backend (Port 8787)" cmd /k "node backend/server.js"
timeout /t 2 /nobreak >nul
echo.
echo Dang khoi dong Frontend tai Vite (http://localhost:5173)...
start "CloudChat Frontend" cmd /k "cd frontend && npm run dev"
echo.
echo ========================================================
echo   Ca Backend va Frontend deu da duoc bat thanh cong!
echo ========================================================
