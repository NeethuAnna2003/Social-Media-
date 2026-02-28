@echo off
echo ============================================
echo CONNECTIFY-AI - SYSTEM CHECK
echo ============================================
echo.

echo Checking system requirements...
echo.

REM Check Python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python is installed
    python --version
) else (
    echo [FAIL] Python is NOT installed
    echo Please install Python 3.8+ from https://www.python.org/
)
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Node.js is installed
    node --version
) else (
    echo [FAIL] Node.js is NOT installed
    echo Please install Node.js from https://nodejs.org/
)
echo.

REM Check MySQL
sc query MySQL >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] MySQL service exists
    sc query MySQL | findstr "STATE"
) else (
    echo [FAIL] MySQL service not found
    echo Please install MySQL from https://dev.mysql.com/downloads/
)
echo.

REM Check Redis
redis-server --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Redis is installed
    redis-server --version
) else (
    echo [WARN] Redis is NOT installed (optional)
    echo Install from: https://github.com/microsoftarchive/redis/releases
)
echo.

REM Check Backend Virtual Environment
if exist "backend\venv" (
    echo [OK] Backend virtual environment exists
) else (
    echo [WARN] Backend virtual environment NOT found
    echo Creating virtual environment...
    cd backend
    python -m venv venv
    cd ..
    echo [OK] Virtual environment created
)
echo.

REM Check Frontend Node Modules
if exist "frontend\node_modules" (
    echo [OK] Frontend node_modules exists
) else (
    echo [WARN] Frontend node_modules NOT found
    echo Installing dependencies...
    cd frontend
    call npm install
    cd ..
    echo [OK] Dependencies installed
)
echo.

REM Check Database
echo Checking database connection...
cd backend
call venv\Scripts\activate.bat
python -c "import django; import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings'); django.setup(); from django.db import connection; connection.ensure_connection(); print('[OK] Database connection successful')" 2>nul
if %errorlevel% neq 0 (
    echo [WARN] Database connection failed
    echo Make sure MySQL is running and database 'connectify_db' exists
)
cd ..
echo.

echo ============================================
echo System Check Complete
echo ============================================
echo.
echo If all checks passed, run: QUICK_START.bat
echo.
pause
