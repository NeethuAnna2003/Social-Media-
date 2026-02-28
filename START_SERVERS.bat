@echo off
echo ========================================
echo   Connectify-AI Server Startup
echo ========================================
echo.

echo Starting Backend Server...
start "Connectify Backend" cmd /k "cd /d C:\Users\HP\Desktop\4th SEMES\connectify-ai\backend && .\venv\Scripts\python.exe manage.py runserver"

timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start "Connectify Frontend" cmd /k "cd /d C:\Users\HP\Desktop\4th SEMES\connectify-ai\frontend && npm run dev"

echo.
echo ========================================
echo   Servers Started!
echo ========================================
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Word Filter Feature:
echo   User:  http://localhost:5173/settings/word-filters
echo   Admin: http://localhost:5173/admin-dashboard/word-filters
echo.
echo Press any key to exit...
pause >nul
