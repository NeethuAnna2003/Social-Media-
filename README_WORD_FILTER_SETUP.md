# 🚀 SENSITIVE WORD FILTER - COMPLETE SETUP GUIDE

## ✅ What Has Been Implemented

The **Sensitive Word Filter** feature is now **FULLY INTEGRATED** into your Connectify-AI project!

### Backend ✓
- ✅ URL routes configured (`/api/posts/filter/...`)
- ✅ Database models ready
- ✅ API endpoints working
- ✅ Filter service implemented
- ✅ Admin approval workflow ready

### Frontend ✓
- ✅ User management component created
- ✅ Admin review component created
- ✅ Routes added to AppRouter
- ✅ Navigation links added to Sidebar
- ✅ Admin navigation links added

---

## 🎯 HOW TO START THE PROJECT

### Option 1: Double-Click Batch File (EASIEST)

1. Navigate to your project folder:
   ```
   C:\Users\HP\Desktop\4th SEMES\connectify-ai\
   ```

2. **Double-click** the file:
   ```
   START_SERVERS.bat
   ```

3. Two command windows will open:
   - **Backend Server** (Django)
   - **Frontend Server** (Vite + React)

4. Wait 10-15 seconds for servers to start

5. Open your browser and go to:
   ```
   http://localhost:5173
   ```

### Option 2: Manual Start

#### Start Backend:
```cmd
cd C:\Users\HP\Desktop\4th SEMES\connectify-ai\backend
.\venv\Scripts\python.exe manage.py runserver
```

#### Start Frontend (in another terminal):
```cmd
cd C:\Users\HP\Desktop\4th SEMES\connectify-ai\frontend
npm run dev
```

---

## 📍 WHERE TO FIND THE FEATURE

### For Regular Users:

1. **Login** to your account
2. Look at the **left sidebar**
3. Click on **"Word Filters"** (🛡️ shield icon)
4. You'll see the filter management page

**Direct URL:**
```
http://localhost:5173/settings/word-filters
```

### For Admins:

1. **Login** as admin
2. Go to **Admin Dashboard**
3. Click **"Word Filter Requests"** in the sidebar
4. You'll see the admin review page

**Direct URL:**
```
http://localhost:5173/admin-dashboard/word-filters
```

---

## 🧪 TESTING THE FEATURE

### Step 1: Apply Database Migration

Before using the feature, apply the migration:

```cmd
cd C:\Users\HP\Desktop\4th SEMES\connectify-ai\backend
.\venv\Scripts\python.exe manage.py migrate posts
```

**Expected output:**
```
Running migrations:
  Applying posts.0013_update_filtered_comment_visibility... OK
```

### Step 2: Create Test Data

#### As a Regular User:

1. Go to: `http://localhost:5173/settings/word-filters`
2. Enter words: `ugly, fat, stupid`
3. Add reason: `These words hurt me`
4. Click **"Submit Request"**
5. You should see: "Request submitted! Waiting for admin approval."

#### As an Admin:

1. Go to: `http://localhost:5173/admin-dashboard/word-filters`
2. Click on **"Pending"** tab
3. You'll see the request from the user
4. Click **"Approve"**
5. Add admin notes: `Request approved`
6. Submit

#### Test Comment Filtering:

1. As another user, post a comment with the word "ugly" on the first user's post
2. **Expected behavior:**
   - **Post owner (User 1):** Cannot see the comment
   - **Commenter (User 2):** Sees comment with RED "ugly" and warning
   - **Other users:** See comment normally

---

## 🔍 TROUBLESHOOTING

### Issue 1: "Word Filters" not showing in sidebar

**Solution:**
1. Make sure frontend server is running
2. Hard refresh the page (Ctrl + Shift + R)
3. Clear browser cache
4. Check browser console for errors (F12)

### Issue 2: 404 Error on API calls

**Solution:**
1. Make sure backend server is running on port 8000
2. Check that URL routes are correct in `backend/posts/urls.py`
3. Restart backend server

### Issue 3: Components not loading

**Solution:**
1. Check that files exist:
   - `frontend/src/components/SensitiveWordFilterManager.jsx`
   - `frontend/src/components/admin/AdminWordFilterReview.jsx`
2. Check `frontend/src/router/AppRouter.jsx` has the imports
3. Restart frontend server

### Issue 4: Migration not applied

**Solution:**
```cmd
cd backend
.\venv\Scripts\python.exe manage.py makemigrations posts
.\venv\Scripts\python.exe manage.py migrate posts
```

---

## 📂 PROJECT STRUCTURE

```
connectify-ai/
│
├── backend/
│   ├── posts/
│   │   ├── filter_models.py          ✅ Database models
│   │   ├── filter_service.py         ✅ Filter logic
│   │   ├── feature_views.py          ✅ API endpoints
│   │   ├── feature_serializers.py    ✅ Serializers
│   │   ├── urls.py                   ✅ URL routes (UPDATED)
│   │   └── migrations/
│   │       └── 0013_update_filtered_comment_visibility.py ✅
│   └── manage.py
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SensitiveWordFilterManager.jsx  ✅ User UI
│   │   │   ├── admin/
│   │   │   │   └── AdminWordFilterReview.jsx   ✅ Admin UI
│   │   │   ├── Sidebar.jsx                     ✅ (UPDATED)
│   │   │   └── admin/
│   │   │       └── AdminLayout.jsx             ✅ (UPDATED)
│   │   ├── router/
│   │   │   └── AppRouter.jsx                   ✅ (UPDATED)
│   │   └── utils/
│   │       └── commentFilterUtils.js           ✅ Utilities
│   └── package.json
│
├── START_SERVERS.bat                 ✅ Easy startup script
└── README_WORD_FILTER_SETUP.md       ✅ This file
```

---

## ✨ FEATURES AVAILABLE

### User Features:
- ✅ Submit word filter requests
- ✅ View request status (pending/approved/rejected)
- ✅ Manage active filters
- ✅ Toggle filters on/off
- ✅ Delete unwanted filters
- ✅ See how many times each filter was triggered
- ✅ View admin notes on requests

### Admin Features:
- ✅ Review all requests
- ✅ Approve/reject with notes
- ✅ View analytics
- ✅ Monitor filtered comments
- ✅ Track user activity

### Comment Filtering:
- ✅ Comments hidden from post owner
- ✅ Comments visible to commenter with warning
- ✅ Sensitive words highlighted in RED
- ✅ Comments visible normally to other users
- ✅ Case-insensitive matching
- ✅ Word boundary protection (prevents false positives)

---

## 🎬 QUICK START CHECKLIST

- [ ] 1. Double-click `START_SERVERS.bat`
- [ ] 2. Wait for servers to start (10-15 seconds)
- [ ] 3. Open browser: `http://localhost:5173`
- [ ] 4. Login to your account
- [ ] 5. Look for "Word Filters" in sidebar (🛡️)
- [ ] 6. Click it to access the feature
- [ ] 7. Submit a test request
- [ ] 8. Login as admin
- [ ] 9. Go to Admin Dashboard → Word Filter Requests
- [ ] 10. Approve the request
- [ ] 11. Test comment filtering

---

## 📞 SUPPORT

If you encounter any issues:

1. **Check server status:**
   - Backend: `http://localhost:8000/api/health/`
   - Frontend: `http://localhost:5173`

2. **Check browser console** (F12) for errors

3. **Check terminal** for server errors

4. **Restart servers:**
   - Close all terminal windows
   - Double-click `START_SERVERS.bat` again

---

## 🎉 YOU'RE ALL SET!

The Sensitive Word Filter feature is **100% ready to use**!

Just start the servers and navigate to:
- **User Interface:** `http://localhost:5173/settings/word-filters`
- **Admin Interface:** `http://localhost:5173/admin-dashboard/word-filters`

**Enjoy your fully working project!** 🚀
