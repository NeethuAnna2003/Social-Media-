@echo off
echo Starting Frontend Server...
cd /d "c:\Users\HP\Desktop\4th SEMES\connectify-ai\frontend"
echo Current directory: %CD%
echo.
echo Attempting to start npm dev server...
call npm run dev
pause
