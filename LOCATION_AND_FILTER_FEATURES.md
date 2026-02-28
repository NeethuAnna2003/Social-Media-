# Image Location Detection & Comment Word Filter Features

## Overview

This document describes two production-level features implemented for the Connectify-AI social media platform:

1. **Image Location Detection** - Automatically detect and display locations from uploaded images
2. **User-Controlled Comment Word Filter** - Allow users to filter prohibited words from comments on their posts

---

## FEATURE 1: IMAGE LOCATION DETECTION

### Description

When a user uploads an image to a post, the system automatically analyzes the image background using computer vision to detect:
- Landmarks (e.g., "Eiffel Tower")
- Cities (e.g., "Paris")
- Countries (e.g., "France")

The detected location is displayed above the post in the format: `📍 Place, Country`

### Key Features

✅ **Automatic Detection** - No manual location selection required
✅ **Intelligent Fallback** - Prefers landmark → city → country
✅ **Confidence Threshold** - Only shows locations with ≥70% confidence
✅ **Smart Caching** - Avoids reprocessing the same image
✅ **Async Processing** - Non-blocking, doesn't delay post creation
✅ **Mock Mode** - Works without API key for testing

### Technical Implementation

#### Backend Components

**Models** (`posts/location_models.py`):
- `ImageLocationCache` - Stores detected locations with confidence scores
- `PostLocation` - Links posts to detected locations

**Service** (`posts/location_service.py`):
- `ImageLocationService` - Handles image analysis and location detection
- Uses Google Cloud Vision API (or mock data if no API key)
- Implements SHA-256 hashing for cache lookup

**Views** (`posts/feature_views.py`):
- `DetectImageLocationView` - Manual trigger for location detection
- `PostLocationDetailView` - Retrieve location data for a post

**Integration** (`posts/views.py`):
- Automatic detection triggered on post creation
- Runs in background thread to avoid blocking
- Updates `PostLocation` model with results

#### API Endpoints

```
POST   /api/posts/<post_id>/detect-location/  - Manually trigger detection
GET    /api/posts/<post_id>/location/         - Get location data
```

#### Database Schema

**ImageLocationCache**:
```sql
- image_hash (VARCHAR, unique, indexed)
- landmark, city, country (VARCHAR, nullable)
- landmark_confidence, city_confidence, country_confidence (FLOAT)
- detected_location (VARCHAR) - formatted display string
- overall_confidence (FLOAT)
- raw_response (JSON) - API response for debugging
```

**PostLocation**:
```sql
- post_id (FK to Post, one-to-one)
- location_cache_id (FK to ImageLocationCache, nullable)
- display_location (VARCHAR) - e.g., "📍 Eiffel Tower, France"
- is_detected (BOOLEAN)
- detection_status (ENUM: pending, processing, completed, failed, no_location)
```

### Frontend Integration

The `PostSerializer` now includes a `location_data` field:

```json
{
  "id": 123,
  "user": {...},
  "text": "Amazing view!",
  "location_data": {
    "display_location": "📍 Eiffel Tower, France",
    "is_detected": true,
    "detection_status": "completed"
  }
}
```

**Display Logic**:
```jsx
{post.location_data?.is_detected && (
  <div className="post-location">
    {post.location_data.display_location}
  </div>
)}
```

### Configuration

Add to `backend/.env`:
```
GOOGLE_VISION_API_KEY=your_api_key_here
```

If no API key is provided, the system uses mock data for testing.

---

## FEATURE 2: USER-CONTROLLED COMMENT WORD FILTER

### Description

Users can request to filter specific words/phrases from comments on their posts. The system:
1. User messages admin with prohibited words
2. Admin reviews and approves/rejects
3. Approved words become active filters
4. Comments containing these words are filtered

### Visibility Rules

| Viewer | Filtered Comment Visibility |
|--------|---------------------------|
| **Commenter** | ✅ Visible (with red text + warning) |
| **Post Owner** | ❌ Hidden |
| **Other Users** | ❌ Hidden |

### Key Features

✅ **Admin Approval Required** - Prevents abuse
✅ **Intelligent Matching** - Case-insensitive, word boundaries
✅ **Variation Handling** - Auto-generates plurals and misspellings
✅ **Commenter Warning** - Shows red text with warning message
✅ **No Auto-Ban** - Only hides comments, doesn't ban users
✅ **Admin Dashboard** - View all filtered comments
✅ **Toggle On/Off** - Users can temporarily disable filters

### Technical Implementation

#### Backend Components

**Models** (`posts/filter_models.py`):
- `ProhibitedWordRequest` - User requests for word filters
- `ProhibitedWord` - Approved prohibited words
- `FilteredComment` - Tracks filtered comments

**Service** (`posts/filter_service.py`):
- `CommentFilterService` - Handles comment filtering logic
- `check_comment()` - Check if comment contains prohibited words
- `generate_variations()` - Create word variations
- `approve_request()` / `reject_request()` - Admin actions

**Views** (`posts/feature_views.py`):
- User endpoints for managing word filters
- Admin endpoints for reviewing requests
- Utility endpoints for visibility checks

**Integration** (`posts/views.py`):
- Comment creation checks for prohibited words
- Creates `FilteredComment` record if matched
- Comment queryset filters based on visibility rules

#### API Endpoints

**User Endpoints**:
```
GET/POST  /api/posts/word-filter/requests/              - List/create requests
GET       /api/posts/word-filter/requests/<id>/         - View request details
GET       /api/posts/word-filter/words/                 - List active filters
POST      /api/posts/word-filter/words/<id>/toggle/     - Toggle filter on/off
DELETE    /api/posts/word-filter/words/<id>/delete/     - Delete filter
GET       /api/posts/word-filter/filtered-comments/     - View filtered comments
```

**Admin Endpoints**:
```
GET   /api/posts/admin/word-filter/requests/                    - List all requests
POST  /api/posts/admin/word-filter/requests/<id>/review/        - Approve/reject
GET   /api/posts/admin/word-filter/filtered-comments/           - All filtered comments
```

#### Database Schema

**ProhibitedWordRequest**:
```sql
- user_id (FK to User)
- requested_words (TEXT) - comma-separated
- reason (TEXT, nullable)
- status (ENUM: pending, approved, rejected)
- admin_notes (TEXT, nullable)
- reviewed_by_id (FK to User, nullable)
- reviewed_at (DATETIME, nullable)
```

**ProhibitedWord**:
```sql
- user_id (FK to User)
- word (VARCHAR) - lowercase
- variations (JSON) - list of variations
- is_active (BOOLEAN)
- request_id (FK to ProhibitedWordRequest, nullable)
- times_triggered (INTEGER) - usage count
UNIQUE(user_id, word)
```

**FilteredComment**:
```sql
- comment_id (FK to Comment, one-to-one)
- post_owner_id (FK to User)
- commenter_id (FK to User)
- matched_words (JSON) - list of matched words
- is_visible_to_owner (BOOLEAN) - always False
- is_visible_to_public (BOOLEAN) - always False
- is_visible_to_commenter (BOOLEAN) - always True
```

### Frontend Integration

**Comment Serializer** now includes filter fields:

```json
{
  "id": 456,
  "user": {...},
  "text": "This is a comment",
  "is_filtered": true,
  "filter_warning": {
    "show": true,
    "message": "⚠️ This comment contains words restricted by the user and is only visible to you.",
    "matched_words": ["word1", "word2"]
  }
}
```

**Display Logic**:
```jsx
<div className={comment.is_filtered ? 'filtered-comment' : 'comment'}>
  <p style={{ color: comment.is_filtered ? 'red' : 'inherit' }}>
    {comment.text}
  </p>
  {comment.filter_warning?.show && (
    <div className="filter-warning">
      {comment.filter_warning.message}
    </div>
  )}
</div>
```

### User Flow

1. **Request Filters**:
   ```javascript
   POST /api/posts/word-filter/requests/
   {
     "words": ["word1", "word2", "word3"],
     "reason": "These words are offensive to me"
   }
   ```

2. **Admin Reviews**:
   ```javascript
   POST /api/posts/admin/word-filter/requests/123/review/
   {
     "action": "approve",
     "admin_notes": "Request approved"
   }
   ```

3. **Automatic Filtering**:
   - When someone comments on the user's post
   - System checks comment against approved words
   - If match found, creates `FilteredComment` record
   - Comment visibility controlled by queryset

### Word Matching Algorithm

```python
# Case-insensitive, word boundary matching
pattern = r'\b' + re.escape(word.lower()) + r'\b'
matches = re.search(pattern, comment_text.lower())
```

**Examples**:
- "fat" matches "fat" but not "father"
- "obese" matches "obese" and "Obese"
- Variations: "fat" → ["fats", "fatt", "phatt"]

---

## Database Migrations

Run migrations to create the new tables:

```bash
cd backend
python manage.py makemigrations posts
python manage.py migrate posts
```

Migration file: `posts/migrations/0012_imagelocationcache_postlocation_and_more.py`

---

## Testing

### Test Image Location Detection

```python
from posts.location_service import ImageLocationService

service = ImageLocationService()
location_data = service.get_or_detect_location(image_file)
print(location_data['detected_location'])  # "📍 Eiffel Tower, France"
```

### Test Comment Filtering

```python
from posts.filter_service import CommentFilterService

service = CommentFilterService()
is_filtered, matched = service.check_comment("This is fat", user_id=1)
print(is_filtered)  # True
print(matched)  # ["fat"]
```

---

## Security Considerations

### Image Location Detection
- ✅ Async processing prevents DoS attacks
- ✅ Caching reduces API costs
- ✅ Confidence threshold prevents false positives
- ✅ No PII exposed in location data

### Comment Filtering
- ✅ Admin approval prevents abuse
- ✅ Word boundary matching prevents false positives
- ✅ Commenter always sees their comment (transparency)
- ✅ No automatic bans (user-friendly)
- ✅ Audit trail via `FilteredComment` records

---

## Performance Optimization

### Location Detection
- **Caching**: SHA-256 hash lookup before API call
- **Async**: Background thread doesn't block post creation
- **Lazy Loading**: Detection only for images, not videos

### Comment Filtering
- **Indexed Queries**: `user_id + is_active` index on `ProhibitedWord`
- **Batch Loading**: `prefetch_related('filter_data')` in queryset
- **Early Exit**: Skip filtering if no prohibited words exist

---

## Future Enhancements

### Location Detection
- [ ] Support for video thumbnails
- [ ] User override/edit location
- [ ] Location-based post discovery
- [ ] Privacy settings (hide location)

### Comment Filtering
- [ ] ML-based word detection
- [ ] Contextual filtering (sentiment analysis)
- [ ] Bulk word import
- [ ] User-to-user blocking

---

## API Documentation

See the full API documentation in the Swagger/OpenAPI schema (if available) or test using the endpoints listed above.

---

## Support

For issues or questions:
- Backend: Check `backend/posts/feature_views.py` and `backend/posts/feature_serializers.py`
- Frontend: Implement UI components based on serializer output
- Database: Run migrations and check models in `location_models.py` and `filter_models.py`

---

**Implementation Date**: February 2026
**Version**: 1.0.0
**Status**: Production Ready ✅
