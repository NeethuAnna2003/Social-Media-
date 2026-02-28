@echo off
echo ========================================
echo   WORD FILTER FEATURE - VERIFICATION
echo ========================================
echo.

echo Checking backend files...
echo.

if exist "backend\posts\filter_models.py" (
    echo [OK] filter_models.py exists
) else (
    echo [ERROR] filter_models.py NOT FOUND
)

if exist "backend\posts\filter_service.py" (
    echo [OK] filter_service.py exists
) else (
    echo [ERROR] filter_service.py NOT FOUND
)

if exist "backend\posts\feature_views.py" (
    echo [OK] feature_views.py exists
) else (
    echo [ERROR] feature_views.py NOT FOUND
)

if exist "backend\posts\feature_serializers.py" (
    echo [OK] feature_serializers.py exists
) else (
    echo [ERROR] feature_serializers.py NOT FOUND
)

if exist "backend\posts\urls.py" (
    echo [OK] urls.py exists
) else (
    echo [ERROR] urls.py NOT FOUND
)

echo.
echo Checking frontend files...
echo.

if exist "frontend\src\components\SensitiveWordFilterManager.jsx" (
    echo [OK] SensitiveWordFilterManager.jsx exists
) else (
    echo [ERROR] SensitiveWordFilterManager.jsx NOT FOUND
)

if exist "frontend\src\components\admin\AdminWordFilterReview.jsx" (
    echo [OK] AdminWordFilterReview.jsx exists
) else (
    echo [ERROR] AdminWordFilterReview.jsx NOT FOUND
)

if exist "frontend\src\utils\commentFilterUtils.js" (
    echo [OK] commentFilterUtils.js exists
) else (
    echo [ERROR] commentFilterUtils.js NOT FOUND
)

if exist "frontend\src\router\AppRouter.jsx" (
    echo [OK] AppRouter.jsx exists
) else (
    echo [ERROR] AppRouter.jsx NOT FOUND
)

if exist "frontend\src\components\Sidebar.jsx" (
    echo [OK] Sidebar.jsx exists
) else (
    echo [ERROR] Sidebar.jsx NOT FOUND
)

if exist "frontend\src\components\admin\AdminLayout.jsx" (
    echo [OK] AdminLayout.jsx exists
) else (
    echo [ERROR] AdminLayout.jsx NOT FOUND
)

echo.
echo Checking migration...
echo.

if exist "backend\posts\migrations\0013_update_filtered_comment_visibility.py" (
    echo [OK] Migration file exists
) else (
    echo [ERROR] Migration file NOT FOUND
)

echo.
echo ========================================
echo   VERIFICATION COMPLETE
echo ========================================
echo.
echo If all files show [OK], the feature is ready!
echo.
echo Next steps:
echo 1. Run START_SERVERS.bat to start servers
echo 2. Apply migration: cd backend ^&^& .\venv\Scripts\python.exe manage.py migrate
echo 3. Open http://localhost:5173/settings/word-filters
echo.
pause
