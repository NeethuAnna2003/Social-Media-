# 🚀 AI News Platform - Complete Startup Guide

Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   AI NEWS PLATFORM - PRODUCTION STARTUP SCRIPT" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop existing processes
Write-Host "🛑 Step 1: Stopping existing processes..." -ForegroundColor Yellow
Get-Process -Name "node", "python" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Step 2: Clean frontend cache
Write-Host "🧹 Step 2: Cleaning frontend cache..." -ForegroundColor Yellow
Remove-Item -Path "frontend/node_modules/.vite" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "   ✅ Cache cleaned" -ForegroundColor Green

# Step 3: Install backend dependencies
Write-Host "📦 Step 3: Installing backend dependencies..." -ForegroundColor Yellow
pip install beautifulsoup4 requests --quiet
Write-Host "   ✅ beautifulsoup4 installed (for article scraping)" -ForegroundColor Green

# Step 4: Verify environment variables
Write-Host "🔐 Step 4: Verifying environment variables..." -ForegroundColor Yellow
$frontendEnv = Get-Content "frontend/.env" -ErrorAction SilentlyContinue
$backendEnv = Get-Content "backend/.env" -ErrorAction SilentlyContinue

if ($frontendEnv -match "VITE_NEWS_API_KEY") {
    Write-Host "   ✅ Frontend NewsAPI key found" -ForegroundColor Green
} else {
    Write-Host "   ❌ WARNING: VITE_NEWS_API_KEY not found in frontend/.env" -ForegroundColor Red
}

if ($backendEnv -match "GEMINI_API_KEY") {
    Write-Host "   ✅ Backend Gemini key found" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  WARNING: GEMINI_API_KEY not found in backend/.env" -ForegroundColor Yellow
}

# Step 5: Start backend
Write-Host ""
Write-Host "🚀 Step 5: Starting Django backend..." -ForegroundColor Yellow
Start-Process -FilePath "python" -ArgumentList "manage.py", "runserver", "0.0.0.0:8000" -WorkingDirectory "backend" -WindowStyle Normal
Write-Host "   ✅ Backend starting on http://localhost:8000" -ForegroundColor Green
Start-Sleep -Seconds 3

# Step 6: Start frontend
Write-Host "🚀 Step 6: Starting React frontend..." -ForegroundColor Yellow
Set-Location "frontend"
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Normal
Write-Host "   ✅ Frontend starting on http://localhost:5173" -ForegroundColor Green

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   ✅ STARTUP COMPLETE!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Wait 10 seconds for servers to fully start"
Write-Host "   2. Open browser: http://localhost:5173/news"
Write-Host "   3. Look for 'System v5.0' at bottom of page"
Write-Host "   4. Test features:"
Write-Host "      - Click any news card → Opens detail page"
Write-Host "      - Click 'Read Full Story' → Opens external link"
Write-Host "      - Test Voice Reader (Play/Pause/Speed)"
Write-Host "      - Check AI Summary generation"
Write-Host "      - Post a comment in Discussion"
Write-Host ""
Write-Host "🐛 Troubleshooting:" -ForegroundColor Yellow
Write-Host "   - No news showing? Clear browser cache: Ctrl+Shift+Delete"
Write-Host "   - Console errors? Run: localStorage.clear(); location.reload();"
Write-Host "   - Backend errors? Check: http://localhost:8000/admin"
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "   - Architecture: COMPLETE_IMPLEMENTATION_GUIDE.md"
Write-Host "   - Navigation Fix: NAVIGATION_FIX_REPORT.md"
Write-Host "   - AI Platform: AI_NEWS_PLATFORM_ARCHITECTURE.md"
Write-Host ""
