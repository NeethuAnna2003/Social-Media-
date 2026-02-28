@echo off
cls
echo ========================================
echo COMPLETE CACHE CLEAR AND RESTART
echo ========================================
echo.

echo [1/6] Killing all Node and Python processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul
echo     Done!

echo.
echo [2/6] Deleting Vite cache...
if exist "frontend\node_modules\.vite" (
    rmdir /s /q "frontend\node_modules\.vite"
    echo     Vite cache deleted
) else (
    echo     No Vite cache found
)

echo.
echo [3/6] Deleting dist folder...
if exist "frontend\dist" (
    rmdir /s /q "frontend\dist"
    echo     Dist deleted
) else (
    echo     No dist found
)

echo.
echo [4/6] Installing backend dependencies...
pip install beautifulsoup4 requests --quiet
echo     Dependencies installed

echo.
echo [5/6] Starting backend server...
start "Backend Server" cmd /k "cd backend && python manage.py runserver 0.0.0.0:8000"
timeout /t 3 /nobreak >nul
echo     Backend started on http://localhost:8000

echo.
echo [6/6] Starting frontend server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"
timeout /t 5 /nobreak >nul
echo     Frontend starting on http://localhost:5173

echo.
echo ========================================
echo SERVERS STARTED!
echo ========================================
echo.
echo IMPORTANT: Do these steps NOW:
echo.
echo 1. Wait 10 seconds for servers to fully start
echo.
echo 2. Open browser: http://localhost:5173/news-dashboard
echo.
echo 3. Press F12 to open console
echo.
echo 4. In console, type:
echo    localStorage.clear();
echo    location.reload();
echo.
echo 5. Press Enter
echo.
echo 6. Wait for news to load
echo.
echo 7. Click a news card (NOT "Read Full Story")
echo.
echo 8. You should see:
echo    - Voice Reader
echo    - AI Summary
echo    - Discussion
echo.
echo If still redirecting, check console for errors!
echo.
pause
