# Clear cache and restart
Write-Host "🧹 Clearing browser cache..." -ForegroundColor Yellow
Write-Host "Please open your browser console (F12) and run:" -ForegroundColor Cyan
Write-Host "localStorage.clear(); sessionStorage.clear(); location.reload();" -ForegroundColor Green
Write-Host ""

# Stop any running frontend servers
Write-Host "🛑 Stopping frontend server..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*frontend*"} | Stop-Process -Force
Start-Sleep -Seconds 2

# Navigate to frontend
Set-Location -Path "c:\Users\HP\Desktop\4th SEMES\connectify-ai\frontend"

Write-Host "🚀 Starting frontend server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Server will start in a new window" -ForegroundColor Green
Write-Host "✅ Navigate to: http://localhost:5173/news-dashboard" -ForegroundColor Green
Write-Host ""

# Start the server
npm run dev
