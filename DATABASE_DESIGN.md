# Connectify AI — Database Design

## Overview
Connectify AI is a full‑stack social platform with video captioning, AI‑assisted posting, real‑time chat, and user gamification. The database is built with Django ORM and follows a modular app structure.

---

## Core Apps & Models

### 1. Accounts (`accounts`)

| Model | Purpose | Key Fields |
|------|---------|------------|
| `CustomUser` | Extends Django’s `AbstractUser` | `email`, `phone_number`, `date_of_birth`, `is_admin` |
| `Profile` | Extended user profile and gamification | `bio`, `profile_pic`, `cover_photo`, `avatar_3d`, `gender`, `location`, `website`, `profession`, `preferred_language`, `social_links`, `interests`, `is_private`, `xp`, `level`, `streak_count`, `last_quest_date` |
| `UserFollowing` | Follow relationships | `user`, `following_user`, `created_at` |
| `FollowRequest` | Pending follow requests for private accounts | `from_user`, `to_user`, `created_at` |

#### Relationships
- `CustomUser` 1→1 `Profile`
- `CustomUser` 1→N `UserFollowing` (as follower)
- `CustomUser` 1→N `UserFollowing` (as following)
- `CustomUser` 1→N `FollowRequest` (sent/received)

---

### 2. Videos (`videos`)

| Model | Purpose | Key Fields |
|------|---------|------------|
| `Video` | Uploaded video files and metadata | `user`, `video_file`, `thumbnail`, `title`, `description`, `duration`, `file_size`, `status`, `processing_progress`, `error_message`, `original_language`, `caption_enabled`, `caption_language_mode`, `translation_language`, `thumbnail_template`, `thumbnail_text`, `custom_thumbnail`, `views_count`, `likes_count`, `comments_count`, `published_at`, `scheduled_for`, `is_public` |
| `Caption` | Timestamped captions per video | `video`, `language`, `start_time`, `end_time`, `text`, `confidence`, `is_translated`, `original_text` |
| `CaptionProcessingJob` | Track async caption generation | `video`, `status`, `progress`, `chunk_index`, `total_chunks`, `source_language`, `target_language`, `captions_generated`, `error_message`, timestamps |
| `ThumbnailOption` | AI‑generated thumbnail options | `video`, `image`, `template`, `frame_timestamp`, `has_face`, `emotion_detected`, `quality_score`, `overlay_text`, `is_selected` |
| `VideoLike` | Likes on videos | `video`, `user`, `created_at` |
| `VideoComment` | Comments on videos (supports replies) | `video`, `user`, `parent`, `text`, `created_at`, `updated_at` |

#### Relationships
- `Video` 1→N `Caption`
- `Video` 1→N `CaptionProcessingJob`
- `Video` 1→N `ThumbnailOption`
- `Video` 1→N `VideoLike`
- `Video` 1→N `VideoComment` (self‑referential for replies)

---

### 3. Posts (`posts`)

| Model | Purpose | Key Fields |
|------|---------|------------|
| `Post` | Social feed posts (text, image, video) | `user`, `text`, `image`, `status` (draft/scheduled/published), `scheduled_at`, `published_at`, `sentiment`, `ai_status`, `music_info`, `is_archived` |
| `PostMedia` | Media attached to posts (supports captions) | `post`, `file`, `media_type` (image/video), `captions` (JSON) |
| `Like` | Likes on posts | `user`, `post`, `created_at` |
| `Comment` | Comments on posts (supports replies, AI moderation) | `user`, `post`, `parent`, `text`, `sentiment`, `is_flagged`, `toxicity`, `ai_confidence`, `ai_reason`, timestamps |

#### Relationships
- `Post` 1→N `PostMedia`
- `Post` 1→N `Like`
- `Post` 1→N `Comment` (self‑referential for replies)

---

### 4. Chat (`chat`)

| Model | Purpose | Key Fields |
|------|---------|------------|
| `ChatThread` | Conversation container | `participants` (M2M), `is_archived`, `is_muted`, timestamps |
| `Message` | Individual messages (text/image/video/audio) | `thread`, `sender`, `text`, `image`, `video`, `audio`, `status`, `is_toxic`, `is_read`, `is_edited`, `is_deleted`, timestamps, `reply_to` (self), `metadata` (JSON) |
| `MessageReaction` | Emoji reactions to messages | `message`, `user`, `emoji` |
| `CallSession` | WebRTC audio/video calls | `thread`, `caller`, `receiver`, `call_type`, `status`, timestamps, `duration`, `session_data` (JSON) |
| `TypingStatus` | Real‑time typing indicators | `thread`, `user`, `is_typing`, `updated_at` |
| `UserPresence` | Online/offline status | `user`, `is_online`, `last_seen`, `device_info`, `active_connections` |
| `MessageReadReceipt` | Per‑user read receipts | `message`, `user`, `read_at` |

#### Relationships
- `ChatThread` M2M `CustomUser` via `participants`
- `ChatThread` 1→N `Message`
- `ChatThread` 1→N `CallSession`
- `ChatThread` 1→N `TypingStatus`
- `Message` 1→N `MessageReaction`
- `Message` 1→N `MessageReadReceipt`
- `Message` self‑referential `reply_to`

---

## Diagrams

### ERD (Textual)

```
CustomUser
 ├─ Profile (1:1)
 ├─ UserFollowing (1:N as follower, 1:N as following)
 ├─ FollowRequest (1:N sent, 1:N received)
 ├─ Video (1:N)
 ├─ Post (1:N)
 ├─ Like (1:N)
 ├─ Comment (1:N)
 ├─ ChatThread (M:N via participants)
 ├─ Message (1:N sent)
 └─ UserPresence (1:1)

Video
 ├─ Caption (1:N)
 ├─ CaptionProcessingJob (1:N)
 ├─ ThumbnailOption (1:N)
 ├─ VideoLike (1:N)
 └─ VideoComment (1:N, self‑referential)

Post
 ├─ PostMedia (1:N)
 ├─ Like (1:N)
 └─ Comment (1:N, self‑referential)

ChatThread
 ├─ Message (1:N)
 ├─ CallSession (1:N)
 └─ TypingStatus (1:N)

Message
 ├─ MessageReaction (1:N)
 ├─ MessageReadReceipt (1:N)
 └─ reply_to (self)
```

---

## Indexes & Performance

- **Temporal indexes** on `created_at`, `updated_at` for feed/chat ordering.
- **User‑centric indexes** on `user + created_at` for profile pages.
- **Status indexes** for filtering (e.g., `Video.status`, `Post.status`).
- **Composite indexes** on `video + start_time`, `thread + created_at`, `message + read_at`.

---

## Constraints & Validations

- Unique constraints on `user + following_user`, `user + post` (likes), `video + user` (likes), `message + user + emoji`.
- Check constraints to prevent self‑follow/self‑request.
- Enum choices for statuses, sentiment, toxicity, call types, etc.

---

## JSONField Usage

- `Profile.social_links`
- `Post.music_info`
- `PostMedia.captions` (video captions with timestamps)
- `Message.metadata` (audio duration, dimensions, waveform)
- `CallSession.session_data` (WebRTC config)

---

## Security & Privacy

- `is_private` on `Profile` gates follow requests.
- `is_public`/`status` gates visibility of `Video`/`Post`.
- Soft delete via `is_deleted` on `Message`.
- AI moderation flags (`is_toxic`, `toxicity`, `ai_status`).

---

## Migration Tips

- Use `django.contrib.postgres` if you switch to PostgreSQL for richer JSON queries.
- Consider `django-cachalot` or Redis caching for feed/chat queries.
- For large media, offload storage to S3/CloudFront and keep DB paths only.

---

## Summary

The schema supports:
- Multi‑media posts with AI‑generated captions.
- Real‑time chat with reactions, calls, typing, presence.
- Follow relationships with privacy controls.
- Gamification via profile XP/levels.
- Robust moderation and status tracking.

All models include audit fields (`created_at`, `updated_at`) and sensible defaults for a production‑ready social platform.
