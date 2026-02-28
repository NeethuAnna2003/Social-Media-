@echo off
echo ========================================
echo   DIAGNOSTIC CHECK
echo ========================================
echo.

echo [1] Checking if newsService.js has v8 code...
findstr /C:"v8_ultra_fresh" "frontend\src\utils\newsService.js" >nul
if %ERRORLEVEL% == 0 (
    echo ✅ Code has v8 - CORRECT
) else (
    echo ❌ Code does NOT have v8 - ERROR
    pause
    exit /b 1
)

echo.
echo [2] Checking if pageSize is 100...
findstr /C:"pageSize: '100'" "frontend\src\utils\newsService.js" >nul
if %ERRORLEVEL% == 0 (
    echo ✅ pageSize is 100 - CORRECT
) else (
    echo ❌ pageSize is NOT 100 - ERROR
    pause
    exit /b 1
)

echo.
echo [3] Checking if Node is running...
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if %ERRORLEVEL% == 0 (
    echo ⚠️  Node is RUNNING
    echo    You need to stop it and restart!
) else (
    echo ✅ Node is NOT running
    echo    Ready to start fresh server
)

echo.
echo [4] Checking .env file...
if exist "frontend\.env" (
    echo ✅ .env file exists
    findstr /C:"VITE_NEWS_API_KEY" "frontend\.env" >nul
    if %ERRORLEVEL% == 0 (
        echo ✅ API key is set
    ) else (
        echo ❌ API key is MISSING
    )
) else (
    echo ❌ .env file is MISSING
)

echo.
echo ========================================
echo   DIAGNOSIS COMPLETE
echo ========================================
echo.
echo NEXT STEPS:
echo 1. If Node is running, close the terminal running it
echo 2. Run START_FRESH.bat
echo 3. Open INCOGNITO browser
echo 4. Go to http://localhost:5173/news-dashboard
echo 5. Press F12 and check Console
echo.
pause
