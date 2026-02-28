# 🔐 QUICK LOGIN GUIDE - Connectify-AI

## ✅ ISSUE RESOLVED!

The **401 Unauthorized** errors have been fixed! The application now properly requires authentication.

---

## 🚀 How to Login

### Step 1: Open the Application
Navigate to: **http://localhost:5173**

You will be automatically redirected to the login page.

### Step 2: Use Test Credentials

**Regular User:**
```
Username: testuser
Password: Test@123
```

**Admin User:**
```
Username: admin
Password: Admin@123
```

### Step 3: Access Features

After logging in, you'll have full access to:
- ✅ News Feed
- ✅ Create Posts
- ✅ Stories
- ✅ Notifications
- ✅ Messages
- ✅ AI Features
- ✅ And more!

---

## 🔧 What Was Fixed

### Problem
```
Unauthorized: /api/notifications/
Unauthorized: /api/posts/feed/
HTTP GET /api/notifications/ 401
HTTP GET /api/posts/feed/?page=1 401
WebSocket REJECT /ws/notifications/1/
```

### Root Cause
The frontend was trying to access protected API endpoints without a valid JWT authentication token. The `AuthContext` was creating a "mock user" without actually logging in, so no token was being sent with API requests.

### Solution
1. **Removed mock user logic** from `AuthContext.jsx`
2. **Enforced proper authentication** - users must login to get JWT tokens
3. **Created test user accounts** with valid credentials
4. **Updated axios interceptor** to properly send JWT tokens with requests

---

## 🎯 Authentication Flow (Now Working)

1. **User visits app** → No token found → Redirected to `/login`
2. **User enters credentials** → Backend validates → Returns JWT tokens
3. **Tokens stored** in `localStorage` (`access` and `refresh`)
4. **Axios interceptor** adds `Authorization: Bearer <token>` to all requests
5. **Backend validates token** → Grants access to protected endpoints
6. **User sees feed** with posts, notifications, etc.

---

## 📊 API Endpoints Now Working

All these endpoints now work properly with authentication:

- ✅ `GET /api/posts/feed/` - Get personalized feed
- ✅ `GET /api/notifications/` - Get notifications
- ✅ `WS /ws/notifications/` - WebSocket notifications
- ✅ `GET /api/accounts/profile/` - Get user profile
- ✅ `POST /api/posts/` - Create posts
- ✅ And all other protected endpoints!

---

## 🔑 Token Management

### Access Token
- **Lifetime:** 1 day
- **Purpose:** Authenticate API requests
- **Storage:** `localStorage.getItem('access')`

### Refresh Token
- **Lifetime:** 7 days
- **Purpose:** Get new access tokens when they expire
- **Storage:** `localStorage.getItem('refresh')`

### Auto-Refresh
The axios interceptor automatically refreshes expired access tokens using the refresh token, so you stay logged in seamlessly!

---

## 🆘 Troubleshooting

### Still Getting 401 Errors?

**1. Clear Browser Storage**
```javascript
// Open browser console (F12) and run:
localStorage.clear();
// Then refresh and login again
```

**2. Verify Backend is Running**
```powershell
# Check if Django is running on port 8000
curl http://localhost:8000/api/health/
```

**3. Check Credentials**
Make sure you're using the exact credentials:
- Username: `testuser` (lowercase, no spaces)
- Password: `Test@123` (case-sensitive)

**4. Restart Services**
```powershell
# Stop all services (Ctrl+C in each terminal)
# Then restart:
.\QUICK_START.bat
```

---

## 📱 Next Steps

1. **Login** with test credentials
2. **Create your first post**
3. **Upload a video** and try AI caption generation
4. **Explore AI features** - sentiment analysis, news summaries, etc.
5. **Check admin panel** (if using admin account)

---

## 🎉 Success Indicators

After logging in, you should see:
- ✅ Your username in the navbar
- ✅ Posts in the feed
- ✅ Notification bell (may show count)
- ✅ Create post form
- ✅ Stories bar
- ✅ No error messages

---

## 📞 Quick Reference

| Item | Value |
|------|-------|
| **Login URL** | http://localhost:5173/login |
| **Test Username** | testuser |
| **Test Password** | Test@123 |
| **Admin Username** | admin |
| **Admin Password** | Admin@123 |
| **Admin Panel** | http://localhost:8000/admin/ |

---

**✅ You're all set! Enjoy using Connectify-AI!**

*Last Updated: 2026-01-08 22:55 IST*
