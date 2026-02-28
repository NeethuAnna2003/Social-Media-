# Connectify-AI - Start Servers Script
# This script starts both backend and frontend servers

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Connectify-AI Server Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend is already running
Write-Host "Checking if backend is running..." -ForegroundColor Yellow
$backendRunning = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($backendRunning) {
    Write-Host "✓ Backend is already running on port 8000" -ForegroundColor Green
} else {
    Write-Host "✗ Backend is not running" -ForegroundColor Red
    Write-Host "Starting backend server..." -ForegroundColor Yellow
    
    # Start backend in new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\HP\Desktop\4th SEMES\connectify-ai\backend'; .\venv\Scripts\python.exe manage.py runserver"
    
    Write-Host "✓ Backend server started in new window" -ForegroundColor Green
}

Write-Host ""

# Check if frontend is already running
Write-Host "Checking if frontend is running..." -ForegroundColor Yellow
$frontendRunning = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($frontendRunning) {
    Write-Host "✓ Frontend is already running on port 5173" -ForegroundColor Green
} else {
    Write-Host "✗ Frontend is not running" -ForegroundColor Red
    Write-Host "Starting frontend server..." -ForegroundColor Yellow
    
    # Start frontend in new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\HP\Desktop\4th SEMES\connectify-ai\frontend'; npm run dev"
    
    Write-Host "✓ Frontend server started in new window" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Servers Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Word Filter Feature:" -ForegroundColor Yellow
Write-Host "  User:  http://localhost:5173/settings/word-filters" -ForegroundColor White
Write-Host "  Admin: http://localhost:5173/admin-dashboard/word-filters" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
