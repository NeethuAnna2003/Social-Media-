@echo off
echo ========================================
echo WORD FILTER FEATURE - DEBUG SCRIPT
echo ========================================
echo.

cd backend

echo [1/4] Checking if migration exists...
if exist "posts\migrations\0003_prohibitedword_prohibitedwordrequest_filteredcomment.py" (
    echo ✓ Migration file exists
) else (
    echo ✗ Migration file NOT found!
    echo Please create the migration first.
    pause
    exit /b 1
)

echo.
echo [2/4] Checking database tables...
.\venv\Scripts\python.exe manage.py shell -c "from django.db import connection; cursor = connection.cursor(); cursor.execute(\"SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'posts_%%word%%'\"); tables = cursor.fetchall(); print('Tables found:', tables if tables else 'NONE')"

echo.
echo [3/4] Applying migrations...
.\venv\Scripts\python.exe manage.py migrate posts

echo.
echo [4/4] Checking if tables were created...
.\venv\Scripts\python.exe manage.py shell -c "from posts.filter_models import ProhibitedWordRequest; count = ProhibitedWordRequest.objects.count(); print(f'Total requests in database: {count}')"

echo.
echo ========================================
echo DEBUG COMPLETE
echo ========================================
echo.
echo If you see "Total requests: 0", the tables exist but are empty.
echo If you see errors, the migration hasn't been applied.
echo.
pause
