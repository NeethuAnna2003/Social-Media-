# News API 404 Errors - FIXED ✅

## Problem
The news discussion feature was throwing 404 errors when trying to access comments:
```
Not Found: /api/news/https://www.gamespot.com/gallery/.../comments/
HTTP GET /api/news/https://www.gamespot.com/.../comments/?sort=hot 404
```

## Root Cause
The `NewsDiscussion.jsx` component was using **path parameters** with the full article URL:
```javascript
// ❌ WRONG - Using articleId in URL path
await api.get(`/news/${articleId}/comments/`)
```

When `articleId` was actually a full URL (like `https://www.gamespot.com/...`), it created malformed URLs that didn't match any backend route.

## Backend URL Patterns
The backend `news/urls.py` supports two patterns:
1. **Query parameter**: `/news/comments/?url=<article_url>` ✅ (Used by NewsDetail.jsx)
2. **Path parameter**: `/news/<article_id>/comments/` (Expects numeric ID, not URL)

## Solution
Updated `NewsDiscussion.jsx` to use **query parameters** instead of path parameters:

### Changes Made:

1. **GET Comments** (Line 48):
   ```javascript
   // ✅ FIXED
   const response = await api.get(`/news/comments/`, {
       params: { 
           url: articleUrl,
           sort: sortBy 
       }
   });
   ```

2. **POST Comment** (Line 136):
   ```javascript
   // ✅ FIXED
   const response = await api.post(`/news/comments/`, commentData);
   ```

3. **Vote on Comment** (Line 165):
   ```javascript
   // ✅ FIXED
   await api.post(`/news/vote/`, { comment_id: commentId, value });
   ```

4. **Delete Comment** (Line 195):
   ```javascript
   // ✅ FIXED - Removed non-existent backend endpoint
   // Backend delete not implemented yet, use local delete
   const updated = comments.filter(c => c.id !== commentId);
   setComments(updated);
   localStorage.setItem(`comments_${articleUrl}`, JSON.stringify(updated));
   ```

## Files Modified
- ✅ `frontend/src/components/NewsDiscussion.jsx`

## Testing
After these changes:
1. Navigate to a news article detail page
2. The comments section should load without 404 errors
3. Posting comments should work
4. Voting on comments should work
5. Delete will work locally (backend endpoint not implemented yet)

## Status
🟢 **FIXED** - All API endpoints now use the correct URL patterns that match the backend routing.
