# 🐛 DEBUGGING WORD FILTER REQUESTS

## The Issue
- Requests exist in database (confirmed: 2 requests)
- But they're not showing up in the UI

## ✅ What We Know
1. **Database has 2 requests** ✓
2. **Backend serializer works** ✓ (tested manually)
3. **Migration is applied** ✓
4. **API endpoints exist** ✓

## 🔍 Next Steps - CHECK BROWSER CONSOLE

### 1. Open Browser Console
- Press **F12** in your browser
- Click on the **"Console"** tab

### 2. Refresh the Page
- Go to: `http://localhost:5173/settings/word-filters`
- Look for console messages starting with `[Word Filter]`

### 3. What to Look For

#### ✅ SUCCESS - You should see:
```
[Word Filter] Fetching requests...
[Word Filter] Requests response: [{id: 2, username: "Sunshine1", ...}]
[Word Filter] Is array? true
[Word Filter] Length: 2
```

#### ❌ ERROR - You might see:
```
[Word Filter] Error fetching requests: Error: ...
[Word Filter] Error details: {status: 401, ...}
```

### 4. Common Issues & Solutions

#### Issue 1: 401 Unauthorized
**Problem:** Not logged in or token expired
**Solution:**
1. Log out
2. Log back in
3. Try again

#### Issue 2: 404 Not Found
**Problem:** API endpoint not found
**Solution:**
1. Check backend is running on port 8000
2. Check URL: `http://localhost:8000/api/posts/filter/requests/`
3. Restart backend server

#### Issue 3: CORS Error
**Problem:** Cross-origin request blocked
**Solution:**
1. Check Vite proxy configuration
2. Restart frontend server

#### Issue 4: Empty Array []
**Problem:** API returns empty array
**Solution:**
1. Check if you're logged in as the right user
2. Check database: `python manage.py shell -c "from posts.filter_models import ProhibitedWordRequest; print(ProhibitedWordRequest.objects.all())"`

---

## 📊 Test the API Directly

### Test User Endpoint:
```bash
# In browser or Postman
GET http://localhost:8000/api/posts/filter/requests/
Headers: Authorization: Bearer <your_access_token>
```

### Test Admin Endpoint:
```bash
GET http://localhost:8000/api/posts/filter/admin/requests/?status=pending
Headers: Authorization: Bearer <admin_access_token>
```

---

## 🔧 Quick Fixes

### Fix 1: Hard Refresh
1. Press **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac)
2. This clears the cache and reloads

### Fix 2: Clear LocalStorage
1. Open Console (F12)
2. Go to "Application" tab
3. Click "Local Storage" → `http://localhost:5173`
4. Click "Clear All"
5. Log in again

### Fix 3: Restart Servers
1. Close all terminal windows
2. Double-click `START_SERVERS.bat`
3. Wait for both servers to start
4. Try again

---

## 📝 Send Me the Console Output

If you still see issues, please:
1. Open browser console (F12)
2. Go to the word filter page
3. Copy ALL the console messages
4. Send them to me

Look for messages with these prefixes:
- `[Word Filter]`
- `[Admin Word Filter]`
- `[Dashboard]`

---

## 🎯 Expected Behavior

### User Page (`/settings/word-filters`):
- Should show "My Requests" tab
- Should display 2 requests
- Each request should show:
  - Status badge (pending/approved/rejected)
  - Requested words
  - Submission date

### Admin Page (`/admin-dashboard/word-filters`):
- Should show "Pending (2)" tab
- Should display 2 pending requests
- Each request should have approve/reject buttons

### Dashboard (`/dashboard`):
- Should show "Your Word Filter Requests" widget
- Should display up to 6 most recent requests

---

## 🚨 If Nothing Shows Up

The most likely issues are:
1. **Not logged in as the right user** - Log in as the user who created the requests
2. **Token expired** - Log out and log back in
3. **Backend not running** - Check `http://localhost:8000/admin`
4. **Frontend cache** - Hard refresh (Ctrl + Shift + R)

---

**Next Step:** Open the browser console and share what you see!
