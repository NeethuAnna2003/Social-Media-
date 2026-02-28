# Sensitive Word Filter API Reference

## Base URL
```
/api/posts/filter/
```

## User Endpoints

### 1. Submit Word Filter Request
**POST** `/requests/`

Submit a new request to filter specific words.

**Request Body:**
```json
{
  "words": ["ugly", "fat", "stupid"],
  "reason": "These words make me uncomfortable" // Optional
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "user": 5,
  "username": "john_doe",
  "requested_words": "ugly, fat, stupid",
  "reason": "These words make me uncomfortable",
  "status": "pending",
  "admin_notes": null,
  "reviewed_by": null,
  "reviewed_by_username": null,
  "reviewed_at": null,
  "created_at": "2026-02-10T10:00:00Z",
  "updated_at": "2026-02-10T10:00:00Z"
}
```

---

### 2. List Own Requests
**GET** `/requests/`

Get all word filter requests submitted by the current user.

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "user": 5,
    "username": "john_doe",
    "requested_words": "ugly, fat, stupid",
    "reason": "These words make me uncomfortable",
    "status": "approved",
    "admin_notes": "Request approved. Words added to your filter.",
    "reviewed_by": 1,
    "reviewed_by_username": "admin",
    "reviewed_at": "2026-02-10T11:00:00Z",
    "created_at": "2026-02-10T10:00:00Z",
    "updated_at": "2026-02-10T11:00:00Z"
  }
]
```

---

### 3. View Request Details
**GET** `/requests/{id}/`

Get details of a specific request.

**Response (200 OK):**
```json
{
  "id": 1,
  "user": 5,
  "username": "john_doe",
  "requested_words": "ugly, fat, stupid",
  "reason": "These words make me uncomfortable",
  "status": "approved",
  "admin_notes": "Request approved.",
  "reviewed_by": 1,
  "reviewed_by_username": "admin",
  "reviewed_at": "2026-02-10T11:00:00Z",
  "created_at": "2026-02-10T10:00:00Z",
  "updated_at": "2026-02-10T11:00:00Z"
}
```

---

### 4. List Active Filters
**GET** `/words/`

Get all active prohibited words for the current user.

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "user": 5,
    "username": "john_doe",
    "word": "ugly",
    "variations": ["uglies", "uglyy"],
    "is_active": true,
    "times_triggered": 5,
    "created_at": "2026-02-10T11:00:00Z"
  },
  {
    "id": 2,
    "user": 5,
    "username": "john_doe",
    "word": "fat",
    "variations": ["fats", "fatt", "phatt"],
    "is_active": true,
    "times_triggered": 3,
    "created_at": "2026-02-10T11:00:00Z"
  }
]
```

---

### 5. Toggle Filter On/Off
**POST** `/words/{id}/toggle/`

Enable or disable a specific word filter.

**Response (200 OK):**
```json
{
  "id": 1,
  "user": 5,
  "username": "john_doe",
  "word": "ugly",
  "variations": ["uglies", "uglyy"],
  "is_active": false,  // Toggled
  "times_triggered": 5,
  "created_at": "2026-02-10T11:00:00Z"
}
```

---

### 6. Delete Filter
**DELETE** `/words/{id}/`

Permanently delete a word filter.

**Response (204 No Content)**

---

### 7. View Filtered Comments
**GET** `/filtered-comments/`

View comments that have been filtered on your posts.

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "comment": 123,
    "post_owner": 5,
    "post_owner_username": "john_doe",
    "commenter": 10,
    "commenter_username": "jane_smith",
    "comment_text": "You look ugly today",
    "matched_words": ["ugly"],
    "is_visible_to_owner": false,
    "is_visible_to_public": true,
    "is_visible_to_commenter": true,
    "created_at": "2026-02-10T12:00:00Z"
  }
]
```

---

## Admin Endpoints

### 8. List All Requests (Admin)
**GET** `/admin/requests/`

List all word filter requests. Supports status filtering.

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `approved`, `rejected`)

**Example:**
```
GET /api/posts/filter/admin/requests/?status=pending
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "user": 5,
    "username": "john_doe",
    "requested_words": "ugly, fat, stupid",
    "reason": "These words make me uncomfortable",
    "status": "pending",
    "admin_notes": null,
    "reviewed_by": null,
    "reviewed_by_username": null,
    "reviewed_at": null,
    "created_at": "2026-02-10T10:00:00Z",
    "updated_at": "2026-02-10T10:00:00Z"
  }
]
```

---

### 9. Review Request (Admin)
**POST** `/admin/requests/{id}/review/`

Approve or reject a word filter request.

**Request Body:**
```json
{
  "action": "approve",  // or "reject"
  "admin_notes": "Request approved. Words added to filter." // Optional
}
```

**Response (200 OK) - Approved:**
```json
{
  "status": "approved",
  "created_words_count": 3,
  "message": "Request approved. 3 word(s) added to filter."
}
```

**Response (200 OK) - Rejected:**
```json
{
  "status": "rejected",
  "message": "Request rejected."
}
```

---

### 10. View All Filtered Comments (Admin)
**GET** `/admin/filtered-comments/`

View all filtered comments across the entire platform.

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "comment": 123,
    "post_owner": 5,
    "post_owner_username": "john_doe",
    "commenter": 10,
    "commenter_username": "jane_smith",
    "comment_text": "You look ugly today",
    "matched_words": ["ugly"],
    "is_visible_to_owner": false,
    "is_visible_to_public": true,
    "is_visible_to_commenter": true,
    "created_at": "2026-02-10T12:00:00Z"
  }
]
```

---

## Utility Endpoints

### 11. Check Comment Visibility
**GET** `/api/posts/comments/{comment_id}/visibility/`

Check if a specific comment should be visible to the current user.

**Response (200 OK):**
```json
{
  "visible": true,
  "is_filtered": true,
  "show_warning": true,
  "matched_words": ["ugly"]
}
```

**Visibility Rules:**
- **Post Owner**: `visible: false` if comment is filtered
- **Commenter**: `visible: true, show_warning: true, matched_words: [...]`
- **Other Users**: `visible: true, is_filtered: false` (no indication)

---

### 12. Get Visible Comments for Post
**GET** `/api/posts/{post_id}/visible-comments/`

Get list of comment IDs visible to the current user for a specific post.

**Response (200 OK):**
```json
{
  "post_id": 42,
  "visible_comment_ids": [1, 2, 3, 5, 7, 8]
}
```

---

## Comment Serialization

When fetching comments, the response includes filter information:

```json
{
  "id": 123,
  "user": {
    "id": 10,
    "username": "jane_smith",
    "profile_picture": "/media/profiles/jane.jpg"
  },
  "text": "You look ugly today",
  "sentiment": "negative",
  "is_flagged": false,
  "created_at": "2026-02-10T12:00:00Z",
  "updated_at": "2026-02-10T12:00:00Z",
  "parent": null,
  "replies": [],
  "toxicity": "none",
  "ai_confidence": 0.0,
  "ai_reason": "",
  "is_filtered": true,
  "filter_warning": {
    "show": true,
    "message": "⚠️ This comment contains words restricted by the user and is only visible to you.",
    "matched_words": ["ugly"]
  }
}
```

**Note:** `filter_warning` is only present when:
- The comment is filtered
- The current user is the commenter
- `show: true` indicates the warning should be displayed

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "A post must contain text, an image, or media."
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

---

## Rate Limiting

**Recommended:** Implement rate limiting on word filter requests:
- **User Requests**: 10 requests per day
- **Admin Actions**: No limit

---

## Authentication

All endpoints require authentication using JWT tokens:

```http
Authorization: Bearer <your_jwt_token>
```

Admin endpoints additionally require admin privileges (`is_staff=True`).

---

## Examples

### Example 1: User Submits Request

```javascript
// Frontend code
const submitWordFilter = async () => {
  try {
    const response = await api.post('/posts/filter/requests/', {
      words: ['ugly', 'fat', 'stupid'],
      reason: 'These words make me uncomfortable'
    });
    
    console.log('Request submitted:', response.data);
    toast.success('Request submitted! Waiting for admin approval.');
  } catch (error) {
    console.error('Error:', error);
    toast.error('Failed to submit request');
  }
};
```

### Example 2: Admin Approves Request

```javascript
// Admin dashboard code
const approveRequest = async (requestId) => {
  try {
    const response = await api.post(
      `/posts/filter/admin/requests/${requestId}/review/`,
      {
        action: 'approve',
        admin_notes: 'Request approved. Words added to filter.'
      }
    );
    
    console.log('Approved:', response.data);
    toast.success(response.data.message);
  } catch (error) {
    console.error('Error:', error);
    toast.error('Failed to approve request');
  }
};
```

### Example 3: Display Comment with Highlighting

```javascript
import { formatCommentText, getFilterWarning } from '../utils/commentFilterUtils';

const CommentDisplay = ({ comment }) => {
  const { html, isHighlighted } = formatCommentText(comment);
  const warning = getFilterWarning(comment);

  return (
    <div className="comment">
      {warning && warning.show && (
        <div className="warning">
          <span>⚠️</span>
          <span>{warning.message}</span>
        </div>
      )}
      
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

## Testing with cURL

### Submit Request
```bash
curl -X POST http://localhost:8000/api/posts/filter/requests/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "words": ["ugly", "fat"],
    "reason": "Personal preference"
  }'
```

### List Requests
```bash
curl -X GET http://localhost:8000/api/posts/filter/requests/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Admin Approve
```bash
curl -X POST http://localhost:8000/api/posts/filter/admin/requests/1/review/ \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "admin_notes": "Approved"
  }'
```

---

## Support

For issues or questions, please refer to:
- **Implementation Guide**: `SENSITIVE_WORD_FILTER_IMPLEMENTATION.md`
- **Summary**: `SENSITIVE_WORD_FILTER_SUMMARY.md`
