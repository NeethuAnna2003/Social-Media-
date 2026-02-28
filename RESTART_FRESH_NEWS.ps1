# 🔄 FORCE FRESH NEWS - Complete Restart Script
# Run this in PowerShell from the project root

Write-Host "🛑 Step 1: Stopping all Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Write-Host "🧹 Step 2: Clearing Vite cache..." -ForegroundColor Yellow
if (Test-Path "frontend\node_modules\.vite") {
    Remove-Item -Recurse -Force "frontend\node_modules\.vite"
    Write-Host "✅ Vite cache cleared" -ForegroundColor Green
}

if (Test-Path "frontend\dist") {
    Remove-Item -Recurse -Force "frontend\dist"
    Write-Host "✅ Dist folder cleared" -ForegroundColor Green
}

Write-Host "📦 Step 3: Verifying newsService.js changes..." -ForegroundColor Yellow
$v8Check = Get-Content "frontend\src\utils\newsService.js" | Select-String -Pattern "v8_ultra_fresh"
$pageSizeCheck = Get-Content "frontend\src\utils\newsService.js" | Select-String -Pattern "pageSize: '100'"

if ($v8Check -and $pageSizeCheck) {
    Write-Host "✅ Code changes verified:" -ForegroundColor Green
    Write-Host "   - Cache version: v8" -ForegroundColor Cyan
    Write-Host "   - Page size: 100 articles" -ForegroundColor Cyan
} else {
    Write-Host "❌ ERROR: Code changes not found!" -ForegroundColor Red
    exit 1
}

Write-Host "`n🚀 Step 4: Starting fresh Vite server..." -ForegroundColor Yellow
Write-Host "⏳ Please wait for 'Local: http://localhost:5173/' message..." -ForegroundColor Cyan
Write-Host "`n📋 After server starts:" -ForegroundColor Yellow
Write-Host "   1. Open browser in INCOGNITO/PRIVATE mode" -ForegroundColor White
Write-Host "   2. Go to: http://localhost:5173/news-dashboard" -ForegroundColor White
Write-Host "   3. Press F12 and check Console for 'v8' logs" -ForegroundColor White
Write-Host "   4. You should see 500+ articles with fresh timestamps`n" -ForegroundColor White

cd frontend
npm run dev
