# ============================================
# CONNECTIFY-AI - COMPLETE SERVICE STARTUP
# ============================================
# This script starts ALL required services for the full-stack application

Write-Host "🚀 Starting Connectify-AI Full Stack Application..." -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a port is in use
function Test-Port {
    param($Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
    return $connection
}

# Function to kill process on a port
function Stop-ProcessOnPort {
    param($Port)
    $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($process) {
        Write-Host "⚠️  Killing existing process on port $Port..." -ForegroundColor Yellow
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# ============================================
# STEP 1: Check Prerequisites
# ============================================
Write-Host "📋 Step 1: Checking Prerequisites..." -ForegroundColor Green
Write-Host ""

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found! Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Please install Node.js" -ForegroundColor Red
    exit 1
}

# Check MySQL
$mysqlRunning = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue | Where-Object {$_.Status -eq "Running"}
if ($mysqlRunning) {
    Write-Host "✅ MySQL: Running" -ForegroundColor Green
} else {
    Write-Host "⚠️  MySQL: Not running. Attempting to start..." -ForegroundColor Yellow
    try {
        Start-Service -Name "MySQL*" -ErrorAction Stop
        Write-Host "✅ MySQL: Started successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ MySQL: Failed to start. Please start MySQL manually" -ForegroundColor Red
        Write-Host "   Run: net start MySQL" -ForegroundColor Yellow
        exit 1
    }
}

# Check Redis
$redisRunning = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
if ($redisRunning) {
    Write-Host "✅ Redis: Running" -ForegroundColor Green
} else {
    Write-Host "⚠️  Redis: Not running. Attempting to start..." -ForegroundColor Yellow
    try {
        # Try to start Redis (if installed via Memurai or Redis for Windows)
        Start-Process -FilePath "redis-server" -WindowStyle Hidden -ErrorAction Stop
        Start-Sleep -Seconds 2
        Write-Host "✅ Redis: Started successfully" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Redis: Not found or failed to start" -ForegroundColor Yellow
        Write-Host "   Installing Redis via Chocolatey..." -ForegroundColor Yellow
        Write-Host "   If this fails, install Redis manually from: https://github.com/microsoftarchive/redis/releases" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   For now, continuing without Redis (Celery tasks will run synchronously)..." -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================
# STEP 2: Clean up existing processes
# ============================================
Write-Host "🧹 Step 2: Cleaning up existing processes..." -ForegroundColor Green
Write-Host ""

Stop-ProcessOnPort 8000  # Django backend
Stop-ProcessOnPort 5173  # Vite frontend

Write-Host "✅ Cleanup complete" -ForegroundColor Green
Write-Host ""

# ============================================
# STEP 3: Setup Backend Environment
# ============================================
Write-Host "🔧 Step 3: Setting up Backend..." -ForegroundColor Green
Write-Host ""

Set-Location -Path "$PSScriptRoot\backend"

# Check if virtual environment exists
if (-Not (Test-Path "venv")) {
    Write-Host "📦 Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
Write-Host "🔌 Activating virtual environment..." -ForegroundColor Cyan
& ".\venv\Scripts\Activate.ps1"

# Install/Update dependencies
Write-Host "📦 Installing Python dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt --quiet

# Run migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Cyan
python manage.py makemigrations --noinput
python manage.py migrate --noinput

Write-Host "✅ Backend setup complete" -ForegroundColor Green
Write-Host ""

# ============================================
# STEP 4: Setup Frontend Environment
# ============================================
Write-Host "🔧 Step 4: Setting up Frontend..." -ForegroundColor Green
Write-Host ""

Set-Location -Path "$PSScriptRoot\frontend"

# Check if node_modules exists
if (-Not (Test-Path "node_modules")) {
    Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "✅ Node modules already installed" -ForegroundColor Green
}

Write-Host "✅ Frontend setup complete" -ForegroundColor Green
Write-Host ""

# ============================================
# STEP 5: Start All Services
# ============================================
Write-Host "🚀 Step 5: Starting All Services..." -ForegroundColor Green
Write-Host ""

Set-Location -Path "$PSScriptRoot"

# Start Django Backend
Write-Host "🌐 Starting Django Backend (http://localhost:8000)..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '.\venv\Scripts\Activate.ps1'; python manage.py runserver 8000" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start Celery Worker (if Redis is available)
if ($redisRunning -or (Get-Process -Name "redis-server" -ErrorAction SilentlyContinue)) {
    Write-Host "⚙️  Starting Celery Worker..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '.\venv\Scripts\Activate.ps1'; celery -A config worker --loglevel=info --pool=solo" -WindowStyle Normal
    Start-Sleep -Seconds 2
} else {
    Write-Host "⚠️  Skipping Celery Worker (Redis not available)" -ForegroundColor Yellow
}

# Start Frontend
Write-Host "⚛️  Starting Vite Frontend (http://localhost:5173)..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

# ============================================
# STEP 6: Verify Services
# ============================================
Write-Host ""
Write-Host "🔍 Step 6: Verifying Services..." -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 5

$backendRunning = Test-Port 8000
$frontendRunning = Test-Port 5173

if ($backendRunning) {
    Write-Host "✅ Backend: Running on http://localhost:8000" -ForegroundColor Green
} else {
    Write-Host "❌ Backend: Failed to start on port 8000" -ForegroundColor Red
}

if ($frontendRunning) {
    Write-Host "✅ Frontend: Running on http://localhost:5173" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend: Failed to start on port 5173" -ForegroundColor Red
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "🎉 Connectify-AI is now running!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔧 Backend API: http://localhost:8000/api/" -ForegroundColor Cyan
Write-Host "👨‍💼 Admin Panel: http://localhost:8000/admin/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C in each terminal window to stop services" -ForegroundColor Yellow
Write-Host ""

# Open browser
Write-Host "🌐 Opening browser..." -ForegroundColor Cyan
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"
