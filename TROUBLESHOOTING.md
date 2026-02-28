# Connectify-AI - Troubleshooting Guide

## 🔴 Error: `ECONNREFUSED` - Proxy Connection Failed

### Problem
The Vite frontend cannot connect to the Django backend API.

### Root Cause
The Django backend server is not running on `http://localhost:8000`.

### Solution

#### Option 1: Use the Automated Startup Script (Recommended)
```powershell
# Run this in PowerShell (as Administrator if needed)
.\START_ALL_SERVICES.ps1
```

#### Option 2: Manual Startup
Start services in this order:

**1. Start MySQL**
```powershell
net start MySQL
```

**2. Start Redis (Optional, for async tasks)**
```powershell
redis-server
```

**3. Start Django Backend**
```powershell
cd backend
.\venv\Scripts\activate
python manage.py runserver 8000
```

**4. Start Celery Worker (Optional)**
```powershell
cd backend
.\venv\Scripts\activate
celery -A config worker --loglevel=info --pool=solo
```

**5. Start Frontend**
```powershell
cd frontend
npm run dev
```

---

## 🔧 Common Issues & Fixes

### Issue 1: MySQL Not Running
**Error:** `Can't connect to MySQL server`

**Fix:**
```powershell
# Start MySQL service
net start MySQL

# Or start via Services app
services.msc  # Find MySQL and click Start
```

### Issue 2: Redis Not Installed
**Error:** `redis-server : The term 'redis-server' is not recognized`

**Fix:**
```powershell
# Install via Chocolatey
choco install redis-64

# Or download from:
# https://github.com/microsoftarchive/redis/releases
```

**Alternative:** The app will work without Redis, but Celery tasks will run synchronously.

### Issue 3: Port Already in Use
**Error:** `Error: That port is already in use`

**Fix:**
```powershell
# Find and kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID_NUMBER> /F

# Find and kill process on port 5173
netstat -ano | findstr :5173
taskkill /PID <PID_NUMBER> /F
```

### Issue 4: Python Dependencies Missing
**Error:** `ModuleNotFoundError: No module named 'django'`

**Fix:**
```powershell
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Issue 5: Node Modules Missing
**Error:** `Cannot find module 'vite'`

**Fix:**
```powershell
cd frontend
npm install
```

### Issue 6: Database Not Migrated
**Error:** `no such table: accounts_customuser`

**Fix:**
```powershell
cd backend
.\venv\Scripts\activate
python manage.py makemigrations
python manage.py migrate
```

### Issue 7: CORS Errors
**Error:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Fix:**
- Ensure backend is running on `http://localhost:8000`
- Check `backend/config/settings.py` has correct CORS settings
- Frontend must be on `http://localhost:5173`

---

## 📊 Service Status Check

### Check if services are running:
```powershell
# Check ports
netstat -ano | findstr :8000  # Django backend
netstat -ano | findstr :5173  # Vite frontend
netstat -ano | findstr :6379  # Redis
netstat -ano | findstr :3306  # MySQL

# Check processes
Get-Process | Where-Object {$_.ProcessName -like "*python*"}
Get-Process | Where-Object {$_.ProcessName -like "*node*"}
Get-Process | Where-Object {$_.ProcessName -like "*redis*"}
```

### Test API endpoints:
```powershell
# Test backend health
curl http://localhost:8000/api/

# Test frontend
curl http://localhost:5173/
```

---

## 🎯 Quick Verification Checklist

Before starting the app, ensure:

- [ ] MySQL service is running
- [ ] Redis is installed (optional but recommended)
- [ ] Python virtual environment exists in `backend/venv`
- [ ] Node modules installed in `frontend/node_modules`
- [ ] Database migrations are up to date
- [ ] `.env` file exists in backend (if using environment variables)
- [ ] Ports 8000 and 5173 are available

---

## 🚀 Recommended Startup Order

1. **MySQL** - Database must be running first
2. **Redis** - Task queue (optional)
3. **Django Backend** - API server
4. **Celery Worker** - Background tasks (optional)
5. **Vite Frontend** - User interface

---

## 📝 Environment Variables

Create `backend/.env` if it doesn't exist:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
GEMINI_API_KEY=your-gemini-api-key
ASSEMBLYAI_API_KEY=your-assemblyai-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

---

## 🆘 Still Having Issues?

1. **Check all terminal windows** for error messages
2. **Review Django logs** in the backend terminal
3. **Check browser console** (F12) for frontend errors
4. **Verify database connection** in `backend/config/settings.py`
5. **Ensure all dependencies are installed** (Python & Node)

---

## 📞 Service URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/api/
- **Admin Panel:** http://localhost:8000/admin/
- **API Documentation:** http://localhost:8000/api/docs/ (if configured)

---

## 🔄 Clean Restart

If everything fails, try a clean restart:

```powershell
# Stop all services
taskkill /F /IM python.exe
taskkill /F /IM node.exe

# Clear caches
cd backend
rm -r __pycache__ -Force -Recurse
cd ../frontend
rm -r node_modules/.vite -Force

# Restart
.\START_ALL_SERVICES.ps1
```
