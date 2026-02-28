# Sensitive Word Filter - System Flow Diagram

## 1. Request Submission Flow

```
┌─────────────┐
│    User     │
│  (John)     │
└──────┬──────┘
       │
       │ 1. Submits request: ["ugly", "fat"]
       │    Reason: "These words hurt me"
       ▼
┌─────────────────────────────────────┐
│  POST /api/posts/filter/requests/   │
│                                     │
│  - Validates input                  │
│  - Creates ProhibitedWordRequest    │
│  - Status: "pending"                │
└──────┬──────────────────────────────┘
       │
       │ 2. Request saved
       ▼
┌─────────────────────────────────────┐
│         Database                    │
│                                     │
│  ProhibitedWordRequest:             │
│  - id: 1                            │
│  - user: John                       │
│  - requested_words: "ugly, fat"     │
│  - status: "pending"                │
│  - admin_notes: null                │
└─────────────────────────────────────┘
```

---

## 2. Admin Review Flow

```
┌─────────────┐
│    Admin    │
└──────┬──────┘
       │
       │ 1. Views pending requests
       ▼
┌─────────────────────────────────────────┐
│  GET /api/posts/filter/admin/requests/  │
│      ?status=pending                    │
│                                         │
│  Returns all pending requests           │
└──────┬──────────────────────────────────┘
       │
       │ 2. Reviews request #1
       │    Decision: APPROVE
       │    Notes: "Reasonable request"
       ▼
┌──────────────────────────────────────────────┐
│  POST /api/posts/filter/admin/requests/1/    │
│       review/                                │
│                                              │
│  Body: {                                     │
│    "action": "approve",                      │
│    "admin_notes": "Reasonable request"       │
│  }                                           │
└──────┬───────────────────────────────────────┘
       │
       │ 3. Creates ProhibitedWord entries
       ▼
┌─────────────────────────────────────────────┐
│         Database Updates                    │
│                                             │
│  ProhibitedWordRequest #1:                  │
│  - status: "approved" ✓                     │
│  - reviewed_by: Admin                       │
│  - admin_notes: "Reasonable request"        │
│                                             │
│  ProhibitedWord (new):                      │
│  - id: 1                                    │
│  - user: John                               │
│  - word: "ugly"                             │
│  - variations: ["uglies", "uglyy"]          │
│  - is_active: true                          │
│                                             │
│  ProhibitedWord (new):                      │
│  - id: 2                                    │
│  - user: John                               │
│  - word: "fat"                              │
│  - variations: ["fats", "fatt", "phatt"]    │
│  - is_active: true                          │
└─────────────────────────────────────────────┘
```

---

## 3. Comment Filtering Flow

```
┌─────────────┐
│    Jane     │
│ (Commenter) │
└──────┬──────┘
       │
       │ 1. Posts comment on John's post:
       │    "You look ugly today"
       ▼
┌──────────────────────────────────────────┐
│  POST /api/posts/{post_id}/comments/     │
│                                          │
│  1. Save comment                         │
│  2. Run AI sentiment analysis            │
│  3. Check word filters (if commenter     │
│     != post owner)                       │
└──────┬───────────────────────────────────┘
       │
       │ 2. Filter check
       ▼
┌──────────────────────────────────────────┐
│  CommentFilterService.check_comment()    │
│                                          │
│  - Get John's prohibited words           │
│  - Check if "ugly" matches               │
│  - Result: MATCH FOUND ✓                 │
│  - Matched words: ["ugly"]               │
└──────┬───────────────────────────────────┘
       │
       │ 3. Create FilteredComment record
       ▼
┌──────────────────────────────────────────┐
│         Database                         │
│                                          │
│  Comment:                                │
│  - id: 123                               │
│  - user: Jane                            │
│  - post: John's post                     │
│  - text: "You look ugly today"           │
│                                          │
│  FilteredComment:                        │
│  - comment: 123                          │
│  - post_owner: John                      │
│  - commenter: Jane                       │
│  - matched_words: ["ugly"]               │
│  - is_visible_to_owner: FALSE ✗          │
│  - is_visible_to_public: TRUE ✓          │
│  - is_visible_to_commenter: TRUE ✓       │
└──────────────────────────────────────────┘
```

---

## 4. Comment Visibility Flow

### Scenario A: John (Post Owner) Views Comments

```
┌─────────────┐
│    John     │
│ (Post Owner)│
└──────┬──────┘
       │
       │ 1. Fetches comments on his post
       ▼
┌──────────────────────────────────────────┐
│  GET /api/posts/{post_id}/comments/      │
│                                          │
│  CommentListCreateView.get_queryset():   │
│  - Get all comments                      │
│  - Get filtered comments where           │
│    post_owner = John                     │
│  - EXCLUDE those comments                │
└──────┬───────────────────────────────────┘
       │
       │ 2. Returns visible comments
       ▼
┌──────────────────────────────────────────┐
│         Response                         │
│                                          │
│  Comments: [                             │
│    {                                     │
│      id: 121,                            │
│      text: "Great post!",                │
│      user: "Bob"                         │
│    },                                    │
│    {                                     │
│      id: 122,                            │
│      text: "Love it!",                   │
│      user: "Alice"                       │
│    }                                     │
│    // Comment 123 is HIDDEN ✗            │
│  ]                                       │
└──────────────────────────────────────────┘

John sees: ✓ Comment 121
           ✓ Comment 122
           ✗ Comment 123 (HIDDEN - contains "ugly")
```

---

### Scenario B: Jane (Commenter) Views Comments

```
┌─────────────┐
│    Jane     │
│ (Commenter) │
└──────┬──────┘
       │
       │ 1. Fetches comments on John's post
       ▼
┌──────────────────────────────────────────┐
│  GET /api/posts/{post_id}/comments/      │
│                                          │
│  CommentListCreateView.get_queryset():   │
│  - Get all comments                      │
│  - Get filtered comments where           │
│    post_owner = John                     │
│  - Jane is NOT the post owner            │
│  - Comments are NOT excluded             │
└──────┬───────────────────────────────────┘
       │
       │ 2. Returns all comments
       │    (including Jane's filtered one)
       ▼
┌──────────────────────────────────────────┐
│         Response                         │
│                                          │
│  Comments: [                             │
│    { id: 121, text: "Great post!" },     │
│    { id: 122, text: "Love it!" },        │
│    {                                     │
│      id: 123,                            │
│      text: "You look ugly today",        │
│      user: "Jane",                       │
│      is_filtered: true,                  │
│      filter_warning: {                   │
│        show: true,                       │
│        message: "⚠️ This comment...",    │
│        matched_words: ["ugly"]           │
│      }                                   │
│    }                                     │
│  ]                                       │
└──────────────────────────────────────────┘

Jane sees: ✓ Comment 121
           ✓ Comment 122
           ✓ Comment 123 with WARNING and RED "ugly"
```

---

### Scenario C: Bob (Other User) Views Comments

```
┌─────────────┐
│     Bob     │
│ (Other User)│
└──────┬──────┘
       │
       │ 1. Fetches comments on John's post
       ▼
┌──────────────────────────────────────────┐
│  GET /api/posts/{post_id}/comments/      │
│                                          │
│  CommentListCreateView.get_queryset():   │
│  - Get all comments                      │
│  - Get filtered comments where           │
│    post_owner = John                     │
│  - Bob is NOT the post owner             │
│  - Comments are NOT excluded             │
└──────┬───────────────────────────────────┘
       │
       │ 2. Returns all comments
       │    (Bob sees everything normally)
       ▼
┌──────────────────────────────────────────┐
│         Response                         │
│                                          │
│  Comments: [                             │
│    { id: 121, text: "Great post!" },     │
│    { id: 122, text: "Love it!" },        │
│    {                                     │
│      id: 123,                            │
│      text: "You look ugly today",        │
│      user: "Jane",                       │
│      is_filtered: false,  ← NO INDICATION│
│      filter_warning: null                │
│    }                                     │
│  ]                                       │
└──────────────────────────────────────────┘

Bob sees: ✓ Comment 121
          ✓ Comment 122
          ✓ Comment 123 NORMALLY (no warning, no highlighting)
```

---

## 5. Frontend Rendering Flow

### For Jane (Commenter)

```
┌────────────────────────────────────────┐
│  Comment Data from API                 │
│                                        │
│  {                                     │
│    id: 123,                            │
│    text: "You look ugly today",        │
│    is_filtered: true,                  │
│    filter_warning: {                   │
│      show: true,                       │
│      matched_words: ["ugly"]           │
│    }                                   │
│  }                                     │
└──────┬─────────────────────────────────┘
       │
       │ 1. formatCommentText(comment)
       ▼
┌────────────────────────────────────────┐
│  commentFilterUtils.js                 │
│                                        │
│  highlightSensitiveWords(              │
│    "You look ugly today",              │
│    ["ugly"]                            │
│  )                                     │
│                                        │
│  Returns:                              │
│  "You look <span style='color: red;    │
│   font-weight: 600;'>ugly</span> today"│
└──────┬─────────────────────────────────┘
       │
       │ 2. Render in React
       ▼
┌────────────────────────────────────────┐
│  Rendered UI (Jane sees)               │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ ⚠️ This comment contains words   │  │
│  │ restricted by the user and is    │  │
│  │ only visible to you.             │  │
│  └──────────────────────────────────┘  │
│                                        │
│  You look ugly today                   │
│           ^^^^                         │
│         (in RED)                       │
└────────────────────────────────────────┘
```

### For Bob (Other User)

```
┌────────────────────────────────────────┐
│  Comment Data from API                 │
│                                        │
│  {                                     │
│    id: 123,                            │
│    text: "You look ugly today",        │
│    is_filtered: false,                 │
│    filter_warning: null                │
│  }                                     │
└──────┬─────────────────────────────────┘
       │
       │ 1. formatCommentText(comment)
       ▼
┌────────────────────────────────────────┐
│  commentFilterUtils.js                 │
│                                        │
│  No highlighting needed                │
│                                        │
│  Returns:                              │
│  {                                     │
│    html: "You look ugly today",        │
│    isHighlighted: false                │
│  }                                     │
└──────┬─────────────────────────────────┘
       │
       │ 2. Render in React
       ▼
┌────────────────────────────────────────┐
│  Rendered UI (Bob sees)                │
│                                        │
│  You look ugly today                   │
│  (normal text, no warning)             │
└────────────────────────────────────────┘
```

---

## 6. Complete System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│                                                             │
│  ┌─────────────────────┐  ┌──────────────────────────────┐ │
│  │ User Components     │  │ Admin Components             │ │
│  │                     │  │                              │ │
│  │ - FilterManager     │  │ - AdminWordFilterReview      │ │
│  │ - FilteredComment   │  │   - Pending requests         │ │
│  │ - CommentDisplay    │  │   - Approve/Reject           │ │
│  └─────────────────────┘  │   - Analytics                │ │
│                           └──────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Utilities                                            │  │
│  │ - commentFilterUtils.js                              │  │
│  │   - highlightSensitiveWords()                        │  │
│  │   - formatCommentText()                              │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ API Calls
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                         Backend                             │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Views (feature_views.py)                             │  │
│  │                                                      │  │
│  │ User:                      Admin:                   │  │
│  │ - Submit request           - List requests          │  │
│  │ - List requests            - Approve/Reject         │  │
│  │ - List words               - View analytics         │  │
│  │ - Toggle/Delete            - Filtered comments      │  │
│  └──────────────────────────────────────────────────────┘  │
│                       │                                     │
│                       ▼                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Service (filter_service.py)                          │  │
│  │                                                      │  │
│  │ - check_comment()                                    │  │
│  │ - create_filter_request()                            │  │
│  │ - approve_request()                                  │  │
│  │ - reject_request()                                   │  │
│  │ - get_comment_visibility()                           │  │
│  │ - get_visible_comments()                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                       │                                     │
│                       ▼                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Models (filter_models.py)                            │  │
│  │                                                      │  │
│  │ - ProhibitedWordRequest                              │  │
│  │ - ProhibitedWord                                     │  │
│  │ - FilteredComment                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                       │                                     │
│                       ▼                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Database (PostgreSQL/SQLite)                         │  │
│  │                                                      │  │
│  │ Tables:                                              │  │
│  │ - prohibited_word_requests                           │  │
│  │ - prohibited_words                                   │  │
│  │ - filtered_comments                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Privacy & Visibility Matrix

| Viewer Role    | Can See Comment? | Shows Warning? | Shows Highlighting? | Knows It's Filtered? |
|----------------|------------------|----------------|---------------------|----------------------|
| Post Owner     | ❌ NO            | ❌ NO          | ❌ NO               | ❌ NO                |
| Commenter      | ✅ YES           | ✅ YES         | ✅ YES (RED)        | ✅ YES               |
| Other Users    | ✅ YES           | ❌ NO          | ❌ NO               | ❌ NO                |
| Admin          | ✅ YES           | ❌ NO          | ❌ NO               | ✅ YES (in dashboard)|

---

## 8. Word Matching Logic

```
Input: "You look fat today"
Prohibited Word: "fat"
Variations: ["fats", "fatt", "phatt"]

┌────────────────────────────────────┐
│  Word Boundary Matching            │
│                                    │
│  Pattern: \b(fat)\b                │
│  Flags: Case-insensitive           │
│                                    │
│  "You look fat today"              │
│            ^^^                     │
│          MATCH ✓                   │
│                                    │
│  "That's a fatal mistake"          │
│            ^^^                     │
│          NO MATCH ✗                │
│          (word boundary prevents)  │
└────────────────────────────────────┘
```

---

## Summary

This system provides:
- ✅ User privacy (only post owner and admin know)
- ✅ Transparent experience for commenters (they see their comment)
- ✅ No disruption for other users (they see everything normally)
- ✅ Admin oversight (full control and analytics)
- ✅ Smart filtering (word boundaries prevent false positives)
- ✅ Visual feedback (red highlighting for commenter only)
