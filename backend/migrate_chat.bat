@echo off
echo ========================================
echo AURORA CHAT - Database Migration Script
echo ========================================
echo.

echo Step 1: Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Step 2: Creating migrations for chat app...
python manage.py makemigrations chat

echo.
echo Step 3: Applying migrations...
python manage.py migrate

echo.
echo ========================================
echo Migration Complete!
echo ========================================
echo.
echo You can now start the server with:
echo python manage.py runserver
echo.
pause
