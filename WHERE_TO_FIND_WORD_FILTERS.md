# How to Access Sensitive Word Filter Feature

## ✅ Setup Complete!

The Sensitive Word Filter feature has been successfully integrated into your Connectify-AI application.

## 📍 Where to Find It

### For Regular Users:

1. **In the Sidebar Menu:**
   - Look for the **"Word Filters"** option with a shield icon (🛡️)
   - Click on it to access your filter management page
   - Direct URL: `http://localhost:5173/settings/word-filters`

2. **What You Can Do:**
   - Submit new word filter requests
   - View your pending, approved, and rejected requests
   - See your active filters
   - Toggle filters on/off
   - Delete filters you no longer need
   - View admin notes on your requests

### For Admins:

1. **In the Admin Dashboard:**
   - Navigate to Admin Dashboard
   - Look for **"Word Filter Requests"** in the sidebar
   - Direct URL: `http://localhost:5173/admin-dashboard/word-filters`

2. **What You Can Do:**
   - View all pending word filter requests
   - Approve or reject requests with notes
   - View approved and rejected requests
   - See analytics of all filtered comments
   - Monitor the filtering system

## 🎯 Quick Access Links

### User Interface:
```
http://localhost:5173/settings/word-filters
```

### Admin Interface:
```
http://localhost:5173/admin-dashboard/word-filters
```

## 📱 Navigation Path

### For Users:
```
Home → Sidebar → Word Filters (Shield Icon)
```

### For Admins:
```
Admin Dashboard → Word Filter Requests (Shield Icon)
```

## 🚀 Getting Started

### As a User:

1. Click **"Word Filters"** in the sidebar
2. Enter words you want to filter (comma-separated)
3. Optionally add a reason
4. Click **"Submit Request"**
5. Wait for admin approval
6. Once approved, the words will be active in your filter

### As an Admin:

1. Go to **Admin Dashboard → Word Filter Requests**
2. Click on the **"Pending"** tab
3. Review each request
4. Click **"Approve"** or **"Reject"**
5. Add admin notes (optional)
6. Submit your decision

## 📊 Visual Guide

```
┌─────────────────────────────────────────┐
│           Connectify-AI                 │
│                                         │
│  ┌─────────────┐                        │
│  │  Sidebar    │                        │
│  │             │                        │
│  │  🏠 Home    │                        │
│  │  📰 News    │                        │
│  │  👥 Friends │                        │
│  │  🔖 Saved   │                        │
│  │  🛡️ Word    │  ← Click Here!        │
│  │    Filters  │                        │
│  │  ⚙️ Settings│                        │
│  └─────────────┘                        │
│                                         │
└─────────────────────────────────────────┘
```

## ✨ Features Available

### User Features:
- ✅ Submit word filter requests
- ✅ View request status (pending/approved/rejected)
- ✅ Manage active filters
- ✅ Toggle filters on/off
- ✅ Delete unwanted filters
- ✅ See how many times each filter was triggered

### Admin Features:
- ✅ Review all requests
- ✅ Approve/reject with notes
- ✅ View analytics
- ✅ Monitor filtered comments
- ✅ Track user activity

## 🎉 You're All Set!

The feature is now fully accessible in your application. Users can start submitting word filter requests, and admins can review them from the dashboard.

**Note:** Make sure both your backend and frontend servers are running:
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`
