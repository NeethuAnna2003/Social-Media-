@echo off
cls
echo ========================================
echo FORCE FRESH NEWS - Complete Reset
echo ========================================
echo.

echo [1/7] Killing all processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/7] Deleting ALL caches...
if exist "frontend\node_modules\.vite" rmdir /s /q "frontend\node_modules\.vite"
if exist "frontend\dist" rmdir /s /q "frontend\dist"
if exist "frontend\.cache" rmdir /s /q "frontend\.cache"

echo [3/7] Clearing browser storage...
echo IMPORTANT: You must do this manually!
echo 1. Open browser
echo 2. Press F12
echo 3. Go to Application tab
echo 4. Click "Clear storage"
echo 5. Click "Clear site data"
echo.
pause

echo [4/7] Installing backend dependencies...
pip install beautifulsoup4 requests --quiet

echo [5/7] Starting backend...
start "Backend" cmd /k "cd backend && python manage.py runserver 0.0.0.0:8000"
timeout /t 3 /nobreak >nul

echo [6/7] Starting frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 5 /nobreak >nul

echo [7/7] Opening browser...
timeout /t 3 /nobreak >nul
start http://localhost:5173/news-dashboard

echo.
echo ========================================
echo SERVERS STARTED!
echo ========================================
echo.
echo CRITICAL: Do these steps NOW:
echo.
echo 1. When browser opens, press F12
echo.
echo 2. In console, type EXACTLY:
echo    localStorage.clear();
echo    location.reload();
echo.
echo 3. Press Enter
echo.
echo 4. Wait for news to load
echo.
echo 5. Check console for:
echo    "🔄 Fetching Live News"
echo.
echo 6. Wait 60 seconds, click "Refresh Feed" button
echo.
echo 7. News should change!
echo.
echo If news doesn't change after 60 seconds:
echo - Check your API key in frontend/.env
echo - Check console for errors
echo - NewsAPI might be returning same articles
echo.
pause
