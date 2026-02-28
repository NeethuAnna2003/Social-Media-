@echo off
echo.
echo ========================================
echo   RESTARTING FRONTEND WITH FRESH CODE
echo ========================================
echo.
echo Stopping all Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo Clearing Vite cache...
cd frontend
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
if exist "dist" rmdir /s /q "dist"

echo.
echo Starting server...
echo.
echo ========================================
echo   AFTER SERVER STARTS:
echo   1. Open INCOGNITO browser (Ctrl+Shift+N)
echo   2. Go to: http://localhost:5173/news-dashboard
echo   3. Press F12 and look for "v8" in Console
echo ========================================
echo.

start cmd /k "npm run dev"

echo.
echo Server is starting in a new window...
echo Wait for "Local: http://localhost:5173/"
echo Then open INCOGNITO browser!
echo.
pause
