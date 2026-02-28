# User-Controlled Sensitive Word Filter Feature

## Overview
This feature allows users to submit a list of words they personally find sensitive or offensive. These words are filtered ONLY for the requesting user after admin approval. The system ensures privacy and a natural user experience.

## Feature Rules

### 1. User Submission
- Users can submit words/phrases they find sensitive (e.g., "fat", "ugly", "short", "dark")
- Words are NOT globally banned - they only affect the requesting user
- Users can provide a reason for their request (optional)

### 2. Admin Approval Workflow
- All word requests are sent to Admin Dashboard for review
- Admin can APPROVE or REJECT each request
- Only APPROVED words are added to the user's personal filter
- Admin can add notes explaining their decision

### 3. Comment Visibility Logic

#### For Post Owner (who has the filter):
- **HIDDEN**: Comments containing approved sensitive words are completely hidden
- No indication that comments were filtered

#### For Commenter (who wrote the comment):
- **VISIBLE**: Can always see their own comment
- **WARNING**: Shows a subtle warning message
- **HIGHLIGHTED**: Sensitive words are highlighted in RED color
- **NO NOTIFICATION**: System does not explicitly tell them the comment was hidden from post owner

#### For Other Users:
- **VISIBLE**: See the comment normally
- **NO INDICATION**: No sign that the comment is filtered for someone else
- Complete transparency - they see it as a normal comment

### 4. Privacy & Security
- Filtering is case-insensitive
- Uses word boundary matching to avoid false positives (e.g., "fat" won't block "fatal")
- Only the affected user and admin know about the filter
- No public indication of filtering

## Technical Implementation

### Backend Components

#### Models (`posts/filter_models.py`)

1. **ProhibitedWordRequest**
   - Stores user requests for word filtering
   - Status: pending, approved, rejected
   - Tracks admin who reviewed and when

2. **ProhibitedWord**
   - Approved words for a specific user
   - Includes variations (plurals, common misspellings)
   - Tracks how many times triggered

3. **FilteredComment**
   - Links comments to filter rules
   - Stores matched words
   - Visibility flags:
     - `is_visible_to_owner`: False (hidden from post owner)
     - `is_visible_to_public`: True (visible to other users)
     - `is_visible_to_commenter`: True (visible to commenter with warning)

#### Service (`posts/filter_service.py`)

**CommentFilterService** provides:
- `check_comment()`: Check if comment contains prohibited words
- `create_filter_request()`: Create new word filter request
- `approve_request()`: Admin approves request and creates filters
- `reject_request()`: Admin rejects request
- `get_comment_visibility()`: Determine visibility for specific viewer
- `get_visible_comments()`: Get list of visible comment IDs for a post

#### Views (`posts/feature_views.py`)

**User Endpoints:**
- `POST /api/posts/filter/requests/` - Submit word filter request
- `GET /api/posts/filter/requests/` - View own requests
- `GET /api/posts/filter/words/` - View active filters
- `POST /api/posts/filter/words/{id}/toggle/` - Toggle filter on/off
- `DELETE /api/posts/filter/words/{id}/` - Delete filter

**Admin Endpoints:**
- `GET /api/posts/filter/admin/requests/` - View all pending requests
- `POST /api/posts/filter/admin/requests/{id}/review/` - Approve/reject request
- `GET /api/posts/filter/admin/filtered-comments/` - View all filtered comments

### Comment Creation Flow

When a comment is created (`posts/views.py` - `CommentListCreateView.perform_create()`):

1. Comment is saved with AI sentiment analysis
2. **Filter Check**: If commenter ≠ post owner:
   - Check if comment contains post owner's prohibited words
   - If match found:
     - Create `FilteredComment` record
     - Store matched words
     - Set visibility flags
3. Broadcast comment to real-time listeners (if not flagged)

### Comment Retrieval Flow

When comments are fetched (`posts/views.py` - `CommentListCreateView.get_queryset()`):

1. Get all top-level comments for the post
2. If user is authenticated:
   - Get filtered comments where current user is the post owner
   - Exclude those comments from results
3. Return visible comments

### Comment Serialization

The `CommentSerializer` (`posts/serializers.py`) includes:
- `is_filtered`: Boolean indicating if comment is filtered
- `filter_warning`: Object with warning message and matched words (only for commenter)

```python
{
    "id": 123,
    "text": "You look fat today",
    "user": {...},
    "is_filtered": true,
    "filter_warning": {
        "show": true,
        "message": "⚠️ This comment contains words restricted by the user and is only visible to you.",
        "matched_words": ["fat"]
    }
}
```

## Frontend Implementation

### Displaying Comments with Highlighting

In the comment component (e.g., `PostCard.jsx` or `CommentList.jsx`), you need to:

1. **Check for filter warning**:
```javascript
const hasFilterWarning = comment.filter_warning && comment.filter_warning.show;
```

2. **Highlight sensitive words in RED**:
```javascript
const highlightSensitiveWords = (text, matchedWords) => {
  if (!matchedWords || matchedWords.length === 0) return text;
  
  let highlightedText = text;
  matchedWords.forEach(word => {
    // Case-insensitive word boundary matching
    const regex = new RegExp(`\\b(${word})\\b`, 'gi');
    highlightedText = highlightedText.replace(
      regex,
      '<span style="color: red; font-weight: bold;">$1</span>'
    );
  });
  
  return highlightedText;
};
```

3. **Display with warning**:
```jsx
{hasFilterWarning && (
  <div className="filter-warning">
    <span className="warning-icon">⚠️</span>
    <span className="warning-text">
      {comment.filter_warning.message}
    </span>
  </div>
)}

<div 
  className="comment-text"
  dangerouslySetInnerHTML={{
    __html: hasFilterWarning 
      ? highlightSensitiveWords(comment.text, comment.filter_warning.matched_words)
      : comment.text
  }}
/>
```

### User Interface for Managing Filters

Create a settings page where users can:
1. Submit new word filter requests
2. View pending/approved/rejected requests
3. Toggle active filters on/off
4. Delete filters they no longer need

### Admin Dashboard Integration

Add to admin dashboard:
1. **Pending Requests Tab**: Show all pending word filter requests
2. **Review Interface**: Approve/reject with notes
3. **Analytics**: Show filtered comment statistics

## API Endpoints Summary

### User Endpoints
```
POST   /api/posts/filter/requests/              # Submit request
GET    /api/posts/filter/requests/              # List own requests
GET    /api/posts/filter/requests/{id}/         # View request details
GET    /api/posts/filter/words/                 # List active filters
POST   /api/posts/filter/words/{id}/toggle/     # Toggle filter
DELETE /api/posts/filter/words/{id}/            # Delete filter
GET    /api/posts/filter/filtered-comments/     # View filtered comments on own posts
```

### Admin Endpoints
```
GET    /api/posts/filter/admin/requests/                    # List all requests
POST   /api/posts/filter/admin/requests/{id}/review/        # Approve/reject
GET    /api/posts/filter/admin/filtered-comments/           # All filtered comments
```

### Utility Endpoints
```
GET    /api/posts/comments/{id}/visibility/                 # Check comment visibility
GET    /api/posts/{id}/visible-comments/                    # Get visible comment IDs
```

## Database Migration

After updating the `FilteredComment` model default values, create and run a migration:

```bash
cd backend
python manage.py makemigrations posts
python manage.py migrate posts
```

## Testing Scenarios

### Test 1: Basic Filtering
1. User A submits word filter request for "ugly"
2. Admin approves the request
3. User B comments "You're ugly" on User A's post
4. **Expected**:
   - User A: Does NOT see the comment
   - User B: Sees comment with red "ugly" and warning
   - User C: Sees comment normally

### Test 2: Multiple Words
1. User A has filters for ["fat", "short", "dark"]
2. User B comments "You're too fat and short"
3. **Expected**:
   - User A: Does NOT see comment
   - User B: Sees "fat" and "short" highlighted in red
   - User C: Sees comment normally

### Test 3: Word Variations
1. User A filters "fat"
2. System auto-generates variations: ["fats", "fatt", "phatt"]
3. User B comments "You're so fatt"
4. **Expected**: Comment is filtered (variation matched)

### Test 4: False Positive Prevention
1. User A filters "fat"
2. User B comments "That's a fatal mistake"
3. **Expected**: Comment is NOT filtered (word boundary protection)

### Test 5: Privacy
1. User A filters "ugly"
2. User B's comment is filtered
3. User C views the post
4. **Expected**: User C has NO indication that filtering occurred

## Security Considerations

1. **Rate Limiting**: Limit word filter requests per user (e.g., 10 per day)
2. **Word Validation**: Prevent abuse (e.g., filtering common words like "the", "and")
3. **Admin Review**: All requests require admin approval
4. **Privacy**: Filter lists are private to user and admin only
5. **No Retaliation**: Commenters don't know their comment was filtered

## Performance Optimization

1. **Caching**: Cache active prohibited words per user
2. **Indexing**: Database indexes on user_id and is_active
3. **Batch Processing**: Process multiple comments efficiently
4. **Lazy Loading**: Load filter data only when needed

## Future Enhancements

1. **Bulk Import**: Allow users to import word lists
2. **Categories**: Group filters by category (body-shaming, racism, etc.)
3. **Temporary Filters**: Set expiration dates for filters
4. **Analytics**: Show users how many comments were filtered
5. **AI Suggestions**: Suggest related words to filter
6. **Export**: Allow users to export their filter list

## Conclusion

This implementation provides a robust, privacy-focused word filtering system that respects all parties:
- Post owners get protection from unwanted words
- Commenters maintain visibility of their content
- Other users experience no disruption
- Admins maintain control and oversight

The system is designed to be transparent, fair, and non-intrusive while providing effective content filtering for those who need it.
