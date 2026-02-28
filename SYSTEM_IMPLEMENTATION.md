# SYSTEM IMPLEMENTATION - CONNECTIFY AI

## 1. TECHNOLOGY STACK

### 1.1 Frontend Technologies

**Core Framework**
- **React**: 18.2.0 - Modern UI library with hooks and context
- **Vite**: 5.0.12 - Fast build tool and dev server
- **React Router**: 6.22.0 - Client-side routing

**State Management & Data Fetching**
- **React Context API** - Global state management
- **@tanstack/react-query**: 5.0.0 - Server state management
- **Axios**: 1.6.7 - HTTP client

**UI & Styling**
- **Vanilla CSS** - Custom glassmorphic design
- **Framer Motion**: 12.26.1 - Animations
- **@heroicons/react**: 2.2.0 - Icon library

**Utilities**
- **react-hot-toast**: 2.6.0 - Toast notifications
- **react-error-boundary**: 4.0.13 - Error handling
- **date-fns**: 4.1.0 - Date formatting
- **react-dropzone**: 14.3.8 - File uploads
- **react-easy-crop**: 5.5.6 - Image cropping
- **canvas-confetti**: 1.9.4 - Celebration effects
- **recharts**: 3.5.1 - Charts for analytics

### 1.2 Backend Technologies

**Core Framework**
- **Django**: 5.1.0 - Web framework
- **Django REST Framework**: 3.14.0 - API framework
- **djangorestframework-simplejwt**: 5.3.1 - JWT authentication

**Database & ORM**
- **MySQL**: 8.0 - Relational database
- **mysqlclient**: 2.2.1 - MySQL driver
- **Django ORM** - Object-relational mapping

**Async Processing**
- **Celery**: 5.3.6 - Distributed task queue
- **Redis**: 5.0.3 - Message broker & cache
- **django-celery-beat**: 2.6.0 - Periodic tasks
- **django-celery-results**: 2.6.0 - Task results

**WebSockets**
- **Django Channels**: 4.0+ - WebSocket support
- **Daphne** - ASGI server

**Utilities**
- **Pillow**: 10.2.0 - Image processing
- **python-dotenv**: 1.0.1 - Environment variables
- **django-cors-headers**: 4.3.1 - CORS handling
- **python-dateutil**: 2.8.2 - Date utilities
- **pytz**: 2024.1 - Timezone support

### 1.3 AI Services & APIs

**AI Integration**
- **Google Gemini API** (google-genai: 0.3.0)
  - Text generation and summarization
  - Vision AI for image analysis
  - Location detection from images
  
- **AssemblyAI** (assemblyai: 0.48.4)
  - Speech-to-text transcription
  - Language detection
  - Real-time caption generation
  
- **OpenAI Whisper** (SpeechRecognition: 3.10.4)
  - Local speech recognition
  - Fallback transcription service
  
- **HuggingFace Transformers**
  - Sentiment analysis
  - Text classification
  - Toxicity detection
  
- **Pollinations.ai API**
  - AI image generation
  - Thumbnail creation
  
- **NewsAPI**
  - Real-time news fetching
  - Multi-category news

**Media Processing**
- **moviepy**: 1.0.3 - Video processing
- **opencv-python**: 4.9.0.80 - Computer vision
- **pydub**: 0.25.1 - Audio processing

---

## 2. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│   │ Browser  │    │  Mobile  │    │  Tablet  │            │
│   │ (React)  │    │ (React)  │    │ (React)  │            │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘            │
└────────┼───────────────┼───────────────┼──────────────────┘
         │               │               │
         └───────────────┴───────────────┘
                         │
         ┌───────────────▼───────────────┐
         │   Vite Dev Server (5173)      │
         │   Proxy: /api → :8000         │
         └───────────────┬───────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                  APPLICATION LAYER                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Django REST API (Port 8000)                           │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ │
│  │  │ Accounts │ │  Posts   │ │  Videos  │ │   Chat   │ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ │
│  │  │  Stories │ │   News   │ │  Quests  │ │  Social  │ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  WebSocket Server (Daphne - ASGI)                      │ │
│  │  ┌──────────┐ ┌──────────┐                            │ │
│  │  │ Chat WS  │ │ Notif WS │                            │ │
│  │  └──────────┘ └──────────┘                            │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│              BACKGROUND PROCESSING                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Celery Workers (Redis Broker)                         │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐              │ │
│  │  │  Video   │ │ Caption  │ │Thumbnail │              │ │
│  │  │Processing│ │   Gen    │ │   Gen    │              │ │
│  │  └──────────┘ └──────────┘ └──────────┘              │ │
│  │  ┌──────────┐ ┌──────────┐                           │ │
│  │  │Sentiment │ │  Quest   │                           │ │
│  │  │ Analysis │ │ Refresh  │                           │ │
│  │  └──────────┘ └──────────┘                           │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                    DATA LAYER                                │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │   MySQL 8.0      │    │   Redis 7.0      │              │
│  │  (Primary DB)    │    │ (Cache/Broker)   │              │
│  │  - Users         │    │ - Sessions       │              │
│  │  - Posts         │    │ - Task Queue     │              │
│  │  - Videos        │    │ - Cache          │              │
│  │  - Messages      │    │ - Pub/Sub        │              │
│  └──────────────────┘    └──────────────────┘              │
└──────────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│              EXTERNAL SERVICES                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Gemini  │ │Assembly  │ │HuggingF. │ │ NewsAPI  │      │
│  │   API    │ │   AI     │ │   API    │ │          │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐                                               │
│  │Pollinat. │                                               │
│  │   AI     │                                               │
│  └──────────┘                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. DATABASE SCHEMA

### 3.1 Core Tables

**accounts_customuser**
- id, username, email, password, first_name, last_name
- phone_number, date_of_birth, is_admin
- date_joined, last_login

**accounts_profile**
- user_id (FK), bio, profile_pic, cover_photo
- gender, location, website, profession
- preferred_language, social_links (JSON)
- interests (JSON), is_private
- xp, level, streak_count, last_quest_date

**accounts_userfollowing**
- user_id (FK), following_user_id (FK)
- created_at

**posts_post**
- id, user_id (FK), text, image
- status (draft/scheduled/published)
- scheduled_at, published_at
- sentiment, ai_status, music_info (JSON)
- created_at, updated_at

**posts_comment**
- id, user_id (FK), post_id (FK), parent_id (FK)
- text, sentiment, is_flagged
- toxicity, ai_confidence, ai_reason
- created_at, updated_at

**videos_video**
- id, user_id (FK), video_file, thumbnail
- title, description, duration, file_size
- status, processing_progress, error_message
- original_language, caption_enabled
- views_count, likes_count, comments_count
- published_at, scheduled_for

**videos_caption**
- id, video_id (FK), language
- start_time, end_time, text
- confidence, is_translated, original_text

**chat_chatthread**
- id, participants (M2M)
- is_archived, is_muted
- created_at, updated_at

**chat_message**
- id, thread_id (FK), sender_id (FK)
- text, image, video, audio
- status, is_toxic, is_read
- reply_to_id (FK), metadata (JSON)
- created_at, updated_at

**news_newsarticle**
- id, title, description, content
- source, author, url, image_url
- category, published_at, fetched_at

**quests_quest**
- id, user_id (FK), quest_type
- title, description, xp_reward
- status, completed_at, created_at

### 3.2 Relationships

```
CustomUser (1) ──→ (1) Profile
CustomUser (1) ──→ (N) Post
CustomUser (1) ──→ (N) Video
CustomUser (1) ──→ (N) Comment
CustomUser (M) ──→ (M) ChatThread
Post (1) ──→ (N) Comment
Post (1) ──→ (N) Like
Video (1) ──→ (N) Caption
Video (1) ──→ (N) VideoComment
ChatThread (1) ──→ (N) Message
```

---

## 4. API ENDPOINTS

### 4.1 Authentication
```
POST   /api/token/                    # Get JWT token
POST   /api/token/refresh/            # Refresh token
POST   /api/token/verify/             # Verify token
POST   /api/accounts/register/        # Register user
POST   /api/accounts/login/           # Login user
GET    /api/accounts/profile/         # Get profile
PUT    /api/accounts/profile/         # Update profile
```

### 4.2 Posts
```
GET    /api/posts/feed/               # Get feed
POST   /api/posts/                    # Create post
GET    /api/posts/{id}/               # Get post
PUT    /api/posts/{id}/               # Update post
DELETE /api/posts/{id}/               # Delete post
POST   /api/posts/{id}/like/          # Like post
POST   /api/posts/{id}/comment/       # Comment on post
```

### 4.3 Videos
```
POST   /api/videos/upload/            # Upload video
POST   /api/videos/{id}/captions/     # Generate captions
POST   /api/videos/{id}/thumbnail/    # Generate thumbnail
GET    /api/videos/{id}/status/       # Processing status
```

### 4.4 Chat
```
GET    /api/chat/conversations/       # List chats
POST   /api/chat/send/                # Send message
GET    /api/chat/{id}/messages/       # Get messages
WS     /ws/chat/{id}/                 # WebSocket
```

### 4.5 News
```
GET    /api/news/                     # Get news feed
GET    /api/news/{id}/                # Article details
POST   /api/news/{id}/summary/        # AI summary
POST   /api/news/comments/            # Add comment
```

### 4.6 Social
```
POST   /api/social/follow/            # Follow user
POST   /api/social/unfollow/          # Unfollow user
GET    /api/social/followers/         # Get followers
GET    /api/social/following/         # Get following
GET    /api/social/suggestions/       # User suggestions
```

---

## 5. DEPLOYMENT CONFIGURATION

### 5.1 Environment Variables (.env)

```env
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=connectify_db
DB_USER=root
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=3306

# AI Services
GEMINI_API_KEY=your-gemini-key
ASSEMBLYAI_API_KEY=your-assemblyai-key
HUGGINGFACE_API_KEY=your-huggingface-key

# Celery & Redis
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Email (SMTP)
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### 5.2 Server Configuration

**Backend (Django)**
```bash
# Development
python manage.py runserver 8000

# Production (Gunicorn)
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

**Frontend (Vite)**
```bash
# Development
npm run dev  # Port 5173

# Production Build
npm run build
```

**Celery Worker**
```bash
celery -A config worker --loglevel=info --pool=solo
```

**WebSocket (Daphne)**
```bash
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### 5.3 Production Checklist

- ✅ Set DEBUG=False
- ✅ Configure SECRET_KEY (random, secure)
- ✅ Set ALLOWED_HOSTS
- ✅ Use PostgreSQL (recommended over MySQL)
- ✅ Configure static file serving (Nginx)
- ✅ Set up Redis for production
- ✅ Configure CORS for production domain
- ✅ Enable HTTPS/SSL
- ✅ Use CDN for media files
- ✅ Set up monitoring (Sentry)
- ✅ Configure automated backups
- ✅ Use environment variables for secrets

---

## 6. SYSTEM REQUIREMENTS

### 6.1 Development Environment

**Software Requirements**
- Python 3.8+
- Node.js 16+
- MySQL 8.0+
- Redis 7.0+
- Git

**Hardware Requirements**
- RAM: 8GB minimum, 16GB recommended
- Storage: 10GB free space
- CPU: Multi-core processor

### 6.2 Production Environment

**Server Specifications**
- RAM: 16GB minimum
- Storage: 100GB SSD
- CPU: 4+ cores
- Bandwidth: 100Mbps+

**Services**
- Application Server (Gunicorn/Daphne)
- Database Server (MySQL/PostgreSQL)
- Cache Server (Redis)
- Web Server (Nginx)
- Task Queue (Celery)

---

**Document Version**: 1.0  
**Last Updated**: February 17, 2026  
**Status**: Production Ready
