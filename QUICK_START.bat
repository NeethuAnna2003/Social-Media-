@echo off
echo ============================================
echo CONNECTIFY-AI - QUICK START
echo ============================================
echo.

echo Starting all services...
echo.

cd /d "%~dp0"

echo [1/3] Starting Backend...
start "Django Backend" cmd /k "cd backend && venv\Scripts\activate && python manage.py runserver 8000"
timeout /t 3 /nobreak >nul

echo [2/3] Starting Celery Worker...
start "Celery Worker" cmd /k "cd backend && venv\Scripts\activate && celery -A config worker --loglevel=info --pool=solo"
timeout /t 2 /nobreak >nul

echo [3/3] Starting Frontend...
start "Vite Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo Services Started!
echo ============================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo Admin:    http://localhost:8000/admin
echo.
echo Press any key to open browser...
pause >nul

start http://localhost:5173
