# Sensitive Word Filter - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Apply Database Migration
```bash
cd backend
.\venv\Scripts\python.exe manage.py migrate posts
```

**Expected Output:**
```
Running migrations:
  Applying posts.0013_update_filtered_comment_visibility... OK
```

---

### Step 2: Restart Backend Server
```bash
.\venv\Scripts\python.exe manage.py runserver
```

---

### Step 3: Test the API (Optional)

#### Create a Test User Request
```bash
curl -X POST http://localhost:8000/api/posts/filter/requests/ \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"words": ["ugly", "fat"], "reason": "Test request"}'
```

#### Admin Approves (as admin)
```bash
curl -X POST http://localhost:8000/api/posts/filter/admin/requests/1/review/ \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve", "admin_notes": "Approved for testing"}'
```

---

## 📱 Frontend Integration (10 Minutes)

### Step 1: Add Routes

**File:** `frontend/src/router/AppRouter.jsx`

```jsx
import SensitiveWordFilterManager from '../components/SensitiveWordFilterManager';
import AdminWordFilterReview from '../components/admin/AdminWordFilterReview';

// In your routes:
<Route path="/settings/word-filters" element={<SensitiveWordFilterManager />} />
<Route path="/admin/word-filters" element={<AdminWordFilterReview />} />
```

---

### Step 2: Update Comment Component

**File:** `frontend/src/components/PostCard.jsx` (or wherever you render comments)

```jsx
import { formatCommentText, getFilterWarning } from '../utils/commentFilterUtils';

// In your comment rendering function:
const renderComment = (comment) => {
  const { html, isHighlighted } = formatCommentText(comment);
  const warning = getFilterWarning(comment);

  return (
    <div className="comment">
      {/* Warning banner (only for commenter) */}
      {warning && warning.show && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderLeft: '3px solid #ef4444',
          borderRadius: '6px',
          marginBottom: '8px',
          fontSize: '13px',
          color: '#991b1b'
        }}>
          <span style={{ marginRight: '8px' }}>⚠️</span>
          <span>{warning.message}</span>
        </div>
      )}

      {/* Comment text with highlighting */}
      {isHighlighted ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div>{html}</div>
      )}
    </div>
  );
};
```

---

### Step 3: Add Navigation Links

**User Settings Menu:**
```jsx
<Link to="/settings/word-filters">
  <span>🛡️</span>
  <span>Sensitive Word Filters</span>
</Link>
```

**Admin Dashboard Menu:**
```jsx
<Link to="/admin/word-filters">
  <span>📝</span>
  <span>Word Filter Requests</span>
</Link>
```

---

## ✅ Testing Checklist

### Backend Tests

1. **Submit Request**
   ```bash
   POST /api/posts/filter/requests/
   Body: {"words": ["ugly"], "reason": "Test"}
   Expected: 201 Created
   ```

2. **List Requests**
   ```bash
   GET /api/posts/filter/requests/
   Expected: 200 OK with array of requests
   ```

3. **Admin Approve**
   ```bash
   POST /api/posts/filter/admin/requests/1/review/
   Body: {"action": "approve"}
   Expected: 200 OK, words created
   ```

4. **Post Filtered Comment**
   - User A has "ugly" in filters
   - User B posts "You're ugly" on User A's post
   - Expected: Comment created, FilteredComment created

5. **Check Visibility**
   - User A fetches comments: Should NOT see comment
   - User B fetches comments: Should see comment with warning
   - User C fetches comments: Should see comment normally

---

### Frontend Tests

1. **Submit Request Form**
   - Navigate to `/settings/word-filters`
   - Fill form with words: "ugly, fat"
   - Submit
   - Expected: Success toast, request appears in "My Requests" tab

2. **View Active Filters**
   - After admin approval
   - Navigate to "Active Filters" tab
   - Expected: See approved words with variations

3. **Toggle Filter**
   - Click "Disable" on a filter
   - Expected: Filter marked as disabled
   - Click "Enable"
   - Expected: Filter re-enabled

4. **Delete Filter**
   - Click "Delete" on a filter
   - Confirm deletion
   - Expected: Filter removed from list

5. **Admin Review**
   - Navigate to `/admin/word-filters`
   - View pending requests
   - Click "Approve" or "Reject"
   - Add admin notes
   - Expected: Request status updated

6. **Comment Highlighting**
   - Post comment with filtered word
   - View as commenter
   - Expected: Red highlighting + warning banner
   - View as other user
   - Expected: Normal display, no highlighting

---

## 🐛 Troubleshooting

### Issue: Migration Fails

**Error:** `No such table: prohibited_words`

**Solution:**
```bash
cd backend
.\venv\Scripts\python.exe manage.py makemigrations posts
.\venv\Scripts\python.exe manage.py migrate posts
```

---

### Issue: Comments Not Filtering

**Check:**
1. Is the word approved by admin?
   ```bash
   GET /api/posts/filter/words/
   ```

2. Is the filter active?
   - Check `is_active: true` in response

3. Is the commenter the post owner?
   - Filtering only works when commenter ≠ post owner

---

### Issue: Highlighting Not Working

**Check:**
1. Is `filter_warning` present in comment data?
2. Is `dangerouslySetInnerHTML` being used?
3. Check browser console for errors

**Debug:**
```javascript
console.log('Comment:', comment);
console.log('Filter Warning:', getFilterWarning(comment));
console.log('Formatted:', formatCommentText(comment));
```

---

### Issue: Admin Can't See Requests

**Check:**
1. Is user an admin?
   ```python
   user.is_staff == True
   ```

2. Is the endpoint correct?
   ```
   /api/posts/filter/admin/requests/
   ```

3. Check authentication token

---

## 📊 Monitoring

### Check Filter Statistics

```python
# In Django shell
from posts.filter_models import ProhibitedWord, FilteredComment

# Total active filters
ProhibitedWord.objects.filter(is_active=True).count()

# Total filtered comments
FilteredComment.objects.count()

# Most triggered words
ProhibitedWord.objects.order_by('-times_triggered')[:10]
```

---

### Check Pending Requests

```python
from posts.filter_models import ProhibitedWordRequest

# Pending requests
ProhibitedWordRequest.objects.filter(status='pending').count()

# Approved today
from django.utils import timezone
from datetime import timedelta

today = timezone.now().date()
ProhibitedWordRequest.objects.filter(
    status='approved',
    reviewed_at__date=today
).count()
```

---

## 🎯 Common Use Cases

### Use Case 1: User Wants to Filter Body-Shaming Words

**Steps:**
1. User navigates to `/settings/word-filters`
2. Enters words: "fat, ugly, skinny, short"
3. Adds reason: "I want to avoid body-shaming comments"
4. Submits request
5. Admin reviews and approves
6. Words are now active in user's filter

**Result:** Comments containing these words on user's posts are hidden from the user but visible to everyone else.

---

### Use Case 2: Admin Reviews Bulk Requests

**Steps:**
1. Admin navigates to `/admin/word-filters`
2. Sees 10 pending requests
3. Reviews each request:
   - Approves reasonable requests
   - Rejects inappropriate requests (e.g., filtering common words)
4. Adds notes explaining decisions

**Result:** Users receive approved filters, rejected users can see admin notes.

---

### Use Case 3: User Temporarily Disables Filter

**Steps:**
1. User navigates to `/settings/word-filters`
2. Goes to "Active Filters" tab
3. Clicks "Disable" on "ugly" filter
4. Filter is disabled but not deleted

**Result:** Comments with "ugly" are no longer filtered until user re-enables.

---

## 📚 Additional Resources

- **Full Documentation:** `SENSITIVE_WORD_FILTER_IMPLEMENTATION.md`
- **API Reference:** `SENSITIVE_WORD_FILTER_API.md`
- **Flow Diagrams:** `SENSITIVE_WORD_FILTER_FLOW.md`
- **Summary:** `SENSITIVE_WORD_FILTER_SUMMARY.md`

---

## 🆘 Getting Help

### Check Logs

**Backend:**
```bash
# In backend directory
tail -f logs/django.log
```

**Frontend:**
```javascript
// In browser console
localStorage.debug = '*'
```

### Common Log Messages

**Success:**
```
Comment 123 filtered. Matched words: ['ugly']
```

**Error:**
```
Comment filtering error: <error details>
```

---

## ✨ You're All Set!

The sensitive word filter feature is now ready to use. Users can submit requests, admins can review them, and comments are automatically filtered based on approved words.

**Next Steps:**
1. Test with real users
2. Monitor filter statistics
3. Adjust as needed based on feedback

Happy filtering! 🎉
