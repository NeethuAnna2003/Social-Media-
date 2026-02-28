Write-Host "🛑 Stopping all Node/Python processes..."
Get-Process -Name "node", "python" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "🧹 Cleaning Frontend Cache (Vital for update)..."
Remove-Item -Path "frontend/node_modules/.vite" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "📦 Installing Backend Dependencies (for scraping)..."
pip install beautifulsoup4 requests

Write-Host "🚀 Starting Backend..."
Start-Process -FilePath "python" -ArgumentList "manage.py runserver 0.0.0.0:8000" -WorkingDirectory "backend" -WindowStyle Minimized

Write-Host "🚀 Starting Frontend..."
Set-Location "frontend"
npm run dev
