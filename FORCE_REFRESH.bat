@echo off
echo ========================================
echo FORCE REFRESH - News Platform
echo ========================================
echo.

echo Step 1: Stopping all Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Deleting Vite cache...
if exist "frontend\node_modules\.vite" (
    rmdir /s /q "frontend\node_modules\.vite"
    echo    - Vite cache deleted
) else (
    echo    - No Vite cache found
)

echo Step 3: Deleting dist folder...
if exist "frontend\dist" (
    rmdir /s /q "frontend\dist"
    echo    - Dist folder deleted
) else (
    echo    - No dist folder found
)

echo.
echo ========================================
echo Cache cleared! Now restart the server:
echo ========================================
echo.
echo 1. Open CMD (not PowerShell)
echo 2. Run: cd frontend
echo 3. Run: npm run dev
echo 4. Open browser: http://localhost:5173/news
echo 5. Press Ctrl+Shift+R (hard refresh)
echo 6. Press F12, go to Console tab
echo 7. Click "Read Full Story" on any article
echo 8. Look for: "✅ EXTERNAL LINK FIX ACTIVE"
echo.
echo If you see that message, the fix is loaded!
echo.
pause
