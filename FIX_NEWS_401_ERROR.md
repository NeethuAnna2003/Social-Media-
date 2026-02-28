# 🔧 FIX: 401 Unauthorized Error for News Fetch Content

## Problem
The `/api/news/fetch-content/` endpoint is returning 401 Unauthorized errors.

## Root Cause
1. **Global REST Framework Setting**: `DEFAULT_PERMISSION_CLASSES` requires authentication for all endpoints
2. **Server Not Restarted**: Changes to `news/views.py` haven't been applied yet
3. **Permission Override**: The `FetchContentView` needs `AllowAny` permission

## Solution Applied

### File: `backend/news/views.py` (Line 67-68)

**BEFORE:**
```python
class FetchContentView(APIView):
    permission_classes = [permissions.IsAuthenticated]
```

**AFTER:**
```python
class FetchContentView(APIView):
    permission_classes = [permissions.AllowAny]  # Allow public access to fetch article content
```

## How to Apply the Fix

### Step 1: Verify the Change
The file `backend/news/views.py` has already been updated with the fix.

### Step 2: Restart Django Server

**Option A: If server is running in a terminal**
1. Press `Ctrl+C` to stop the server
2. Run: `python manage.py runserver 0.0.0.0:8000`

**Option B: If you don't know where the server is running**
1. Find the Python process:
   ```powershell
   Get-Process python | Where-Object {$_.MainWindowTitle -like "*manage.py*"}
   ```
2. Kill it and restart:
   ```powershell
   cd backend
   python manage.py runserver 0.0.0.0:8000
   ```

### Step 3: Test the Endpoint

**Using PowerShell:**
```powershell
$url = "http://127.0.0.1:8000/api/news/fetch-content/?url=https://variety.com/2026/music/news/bruno-mars-adds-romantic-tour-dates-1236631834/"
Invoke-RestMethod -Uri $url -Method GET
```

**Using Browser:**
```
http://127.0.0.1:8000/api/news/fetch-content/?url=https://variety.com/2026/music/news/bruno-mars-adds-romantic-tour-dates-1236631834/
```

**Expected Response:**
```json
{
  "content": "Article content here..."
}
```

## Why This Fix Works

1. **`AllowAny` Permission**: Overrides the global `IsAuthenticated` default
2. **Public Content**: News articles are public web content that doesn't require authentication
3. **No Security Risk**: The endpoint only fetches and parses publicly available HTML

## Additional Notes

### Other Endpoints That Should Be Public
If you encounter similar issues with other news endpoints, check:
- `NewsCommentView.get()` - Already set to `IsAuthenticatedOrReadOnly` ✅
- Other read-only endpoints

### Global Permission Setting
The global setting in `config/settings.py` (line 175-177):
```python
'DEFAULT_PERMISSION_CLASSES': [
    'rest_framework.permissions.IsAuthenticated',
],
```

This is correct for security. Individual endpoints override this as needed.

## Troubleshooting

### If 401 Error Persists After Restart:

1. **Check if changes were saved:**
   ```powershell
   Get-Content backend\news\views.py | Select-String -Pattern "AllowAny"
   ```
   Should show: `permission_classes = [permissions.AllowAny]`

2. **Check server logs:**
   Look for any import errors or syntax errors in the terminal

3. **Clear Python cache:**
   ```powershell
   Remove-Item -Recurse -Force backend\__pycache__
   Remove-Item -Recurse -Force backend\news\__pycache__
   ```

4. **Verify the URL is correct:**
   - Correct: `/api/news/fetch-content/?url=...`
   - Wrong: `/api/news/https://...` (this causes 404)

### If You See "Not Found" Error:

The error `Not Found: /api/news/https://variety.com/...` means the frontend is constructing the URL incorrectly.

**Check frontend code** for how it's calling the endpoint. It should be:
```javascript
const response = await api.get('/news/fetch-content/', {
  params: { url: articleUrl }
});
```

NOT:
```javascript
const response = await api.get(`/news/${articleUrl}/comments/`);
```

## Status
✅ **Backend Fix Applied** - `news/views.py` updated
⏳ **Server Restart Required** - Must restart Django server
🔍 **Frontend Check Needed** - Verify API call format

---

**Last Updated**: 2026-01-16 18:45 IST
**Issue**: 401 Unauthorized on `/api/news/fetch-content/`
**Status**: Fixed (pending server restart)
