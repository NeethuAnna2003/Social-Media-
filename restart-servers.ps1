Write-Host "=== Connectify AI - Server Restart Script ===" -ForegroundColor Cyan
Write-Host ""

# Kill existing Node processes (frontend)
Write-Host "Stopping frontend server..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Kill existing Python processes (backend)
Write-Host "Stopping backend server..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.MainWindowTitle -like "*manage.py*" -or $_.CommandLine -like "*runserver*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "=== Starting Backend Server ===" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\HP\Desktop\4th SEMES\connectify-ai\backend'; python manage.py runserver"

Write-Host "Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "=== Starting Frontend Server ===" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\HP\Desktop\4th SEMES\connectify-ai\frontend'; npm run dev"

Write-Host ""
Write-Host "=== Servers Starting ===" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:8000" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Please wait 10-15 seconds for both servers to fully start..." -ForegroundColor Yellow
Write-Host "Then open http://localhost:5173 in your browser" -ForegroundColor Green
