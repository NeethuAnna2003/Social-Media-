@echo off
echo ============================================
echo CONNECTIFY-AI - DATABASE SETUP
echo ============================================
echo.

echo This script will create the database if it doesn't exist
echo.

REM Check if MySQL is running
sc query MySQL | findstr "RUNNING" >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting MySQL service...
    net start MySQL
    timeout /t 3 /nobreak >nul
)

echo Creating database 'connectify_db'...
echo.

REM Create database using MySQL command line
mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS connectify_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul

if %errorlevel% equ 0 (
    echo [OK] Database created successfully
) else (
    echo [INFO] Attempting alternative method...
    echo CREATE DATABASE IF NOT EXISTS connectify_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; | mysql -u root -proot
)

echo.
echo Verifying database...
mysql -u root -proot -e "SHOW DATABASES LIKE 'connectify_db';"

echo.
echo Running Django migrations...
cd backend
call venv\Scripts\activate.bat
python manage.py makemigrations
python manage.py migrate

echo.
echo ============================================
echo Database Setup Complete
echo ============================================
echo.
echo You can now run: QUICK_START.bat
echo.
pause
