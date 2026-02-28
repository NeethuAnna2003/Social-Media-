@echo off
echo ========================================
echo  FRESH NEWS - Complete Server Restart
echo ========================================
echo.

echo [1/4] Stopping all Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo [2/4] Clearing Vite cache...
cd frontend
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
    echo     - Vite cache cleared
)
if exist "dist" (
    rmdir /s /q "dist"
    echo     - Dist folder cleared
)

echo [3/4] Verifying code changes...
findstr /C:"v8_ultra_fresh" "src\utils\newsService.js" >nul
if %ERRORLEVEL% == 0 (
    echo     - Code version: v8 [OK]
) else (
    echo     - ERROR: v8 code not found!
    pause
    exit /b 1
)

findstr /C:"pageSize: '100'" "src\utils\newsService.js" >nul
if %ERRORLEVEL% == 0 (
    echo     - Page size: 100 articles [OK]
) else (
    echo     - ERROR: pageSize not updated!
    pause
    exit /b 1
)

echo.
echo [4/4] Starting fresh Vite server...
echo.
echo ========================================
echo  INSTRUCTIONS:
echo ========================================
echo  1. Wait for: "Local: http://localhost:5173/"
echo  2. Open browser in INCOGNITO mode
echo  3. Go to: http://localhost:5173/news-dashboard
echo  4. Press F12 and check Console for "v8"
echo  5. You should see 500+ articles!
echo ========================================
echo.

npm run dev
