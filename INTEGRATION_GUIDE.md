# Quick Integration Guide

## How to Use the New Features

### 1. Image Location Detection

#### In PostCard Component

```jsx
import PostLocation from './PostLocation';

function PostCard({ post }) {
  return (
    <div className="post-card">
      {/* Display location if detected */}
      <PostLocation locationData={post.location_data} />
      
      {/* Rest of post content */}
      <div className="post-content">
        <p>{post.text}</p>
        {/* ... */}
      </div>
    </div>
  );
}
```

The location will automatically appear above the post content if detected.

---

### 2. Comment Word Filter

#### In Comment Component

Replace your existing comment rendering with:

```jsx
import FilteredComment from './FilteredComment';

function CommentList({ comments }) {
  return (
    <div className="comments-list">
      {comments.map(comment => (
        <FilteredComment key={comment.id} comment={comment}>
          {/* Optional: Add reply/like buttons here */}
          <div className="comment-actions">
            <button>Reply</button>
            <button>Like</button>
          </div>
        </FilteredComment>
      ))}
    </div>
  );
}
```

#### In User Settings/Profile

Add a link to the Word Filter Manager:

```jsx
import { Link } from 'react-router-dom';

function UserSettings() {
  return (
    <div className="settings">
      <h2>Privacy Settings</h2>
      <Link to="/settings/word-filter">
        Manage Comment Filters
      </Link>
    </div>
  );
}
```

Then create a route:

```jsx
import WordFilterManager from './components/WordFilterManager';

// In your router
<Route path="/settings/word-filter" element={<WordFilterManager />} />
```

---

## Backend Setup

### 1. Run Migrations

```bash
cd backend
python manage.py migrate posts
```

### 2. Create Superuser (if needed)

```bash
python manage.py createsuperuser
```

### 3. Configure API Key (Optional)

Add to `backend/.env`:
```
GOOGLE_VISION_API_KEY=your_api_key_here
```

If not provided, the system will use mock data for testing.

---

## Admin Panel Integration

### Reviewing Word Filter Requests

Admins can review requests via API:

```javascript
// Get pending requests
GET /api/posts/admin/word-filter/requests/?status=pending

// Approve a request
POST /api/posts/admin/word-filter/requests/123/review/
{
  "action": "approve",
  "admin_notes": "Request approved"
}

// Reject a request
POST /api/posts/admin/word-filter/requests/123/review/
{
  "action": "reject",
  "admin_notes": "Words too broad"
}
```

You can create an admin dashboard component similar to `WordFilterManager` but with admin-specific features.

---

## Testing

### Test Location Detection

1. Create a post with an image
2. Check the response for `location_data` field
3. Location should appear within a few seconds (async processing)

### Test Comment Filtering

1. User A requests prohibited words (e.g., "test")
2. Admin approves the request
3. User B comments "this is a test" on User A's post
4. User B sees the comment in red with warning
5. User A and others don't see the comment

---

## API Endpoints Summary

### Location Detection
- `POST /api/posts/<post_id>/detect-location/` - Manual trigger
- `GET /api/posts/<post_id>/location/` - Get location data

### Word Filter (User)
- `GET/POST /api/posts/word-filter/requests/` - List/create requests
- `GET /api/posts/word-filter/words/` - List active filters
- `POST /api/posts/word-filter/words/<id>/toggle/` - Toggle filter
- `DELETE /api/posts/word-filter/words/<id>/delete/` - Delete filter

### Word Filter (Admin)
- `GET /api/posts/admin/word-filter/requests/` - List all requests
- `POST /api/posts/admin/word-filter/requests/<id>/review/` - Approve/reject
- `GET /api/posts/admin/word-filter/filtered-comments/` - View all filtered comments

---

## Troubleshooting

### Location not appearing?
- Check if image was uploaded successfully
- Wait a few seconds (async processing)
- Check browser console for errors
- Verify `location_data` field in API response

### Comments not being filtered?
- Verify admin approved the word request
- Check if word is active (`is_active: true`)
- Ensure exact word match (case-insensitive)
- Check browser console for errors

### Migration errors?
- Ensure all model files are imported in `models.py`
- Run `makemigrations` before `migrate`
- Check for circular import issues

---

## Performance Tips

1. **Location Detection**: Runs async, doesn't block post creation
2. **Comment Filtering**: Uses indexed queries for fast lookup
3. **Caching**: Image hashes prevent duplicate API calls
4. **Lazy Loading**: Only load location data when needed

---

## Security Notes

- ✅ Admin approval required for word filters
- ✅ Commenter always sees their comment (transparency)
- ✅ No PII exposed in location data
- ✅ Word boundary matching prevents false positives
- ✅ Audit trail via `FilteredComment` records

---

## Next Steps

1. ✅ Run migrations
2. ✅ Integrate components into your UI
3. ✅ Test both features thoroughly
4. ✅ Configure API keys if using real detection
5. ✅ Create admin dashboard for word filter management
6. ✅ Add user documentation/help text

---

For detailed documentation, see `LOCATION_AND_FILTER_FEATURES.md`
