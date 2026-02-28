# 🚀 Connectify-AI - Full Stack Social Media Platform

A feature-rich social media platform with AI-powered capabilities including video processing, caption generation, sentiment analysis, and more.

## 📋 Table of Contents
- [Quick Start](#quick-start)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- MySQL 8.0+
- Redis (optional, for async tasks)

### 🎯 One-Click Start

**Option 1: PowerShell (Recommended)**
```powershell
.\START_ALL_SERVICES.ps1
```

**Option 2: Batch File**
```cmd
QUICK_START.bat
```

**Option 3: Manual Start**

1. **Start Backend**
   ```powershell
   cd backend
   .\venv\Scripts\activate
   python manage.py runserver 8000
   ```

2. **Start Frontend**
   ```powershell
   cd frontend
   npm run dev
   ```

3. **Start Celery Worker (Optional)**
   ```powershell
   cd backend
   .\venv\Scripts\activate
   celery -A config worker --loglevel=info --pool=solo
   ```

### 🌐 Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/api/
- **Admin Panel:** http://localhost:8000/admin/

---

## ✨ Features

### Core Features
- 👤 **User Authentication** - JWT-based auth with email/username login
- 📱 **Posts & Feed** - Create, like, comment on posts with sentiment analysis
- 📖 **Stories** - Instagram-style stories with 24-hour expiry
- 💬 **Real-time Chat** - WebSocket-based messaging
- 🔔 **Notifications** - Real-time push notifications
- 👥 **Social Features** - Follow/unfollow, user profiles, connections

### AI-Powered Features
- 🎥 **AI Video Processing**
  - Automatic caption generation (Whisper/AssemblyAI)
  - Language detection
  - Thumbnail generation with AI hooks
  - Video transcription

- 💭 **AI Sentiment Analysis**
  - Comment sentiment detection (positive/neutral/negative)
  - Color-coded comments
  - Private negative comments

- 📰 **AI News Platform**
  - Curated news feed
  - AI-generated summaries
  - Discussion questions
  - Time-saved widget

- 🎯 **AI Quest System**
  - Daily personalized quests
  - Interest-based recommendations
  - Progress tracking

- 🤖 **AI Media Assistant**
  - Image editing suggestions
  - Caption recommendations
  - Persistent chat history

### Advanced Features
- 📅 **Scheduled Posts** - Schedule posts for future publishing
- 🎨 **Image Editor** - Built-in image editing with filters
- 📊 **Analytics Dashboard** - Admin analytics and insights
- 🔍 **Discover Page** - Interest-based user discovery
- 🎤 **Voice Chat** - WebRTC-based voice connections

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 + Vite
- **Styling:** Vanilla CSS (modern, glassmorphic design)
- **State Management:** React Context API
- **HTTP Client:** Axios
- **WebSockets:** Native WebSocket API
- **Routing:** React Router v6

### Backend
- **Framework:** Django 5.1 + Django REST Framework
- **Database:** MySQL 8.0
- **Authentication:** JWT (Simple JWT)
- **Task Queue:** Celery + Redis
- **WebSockets:** Django Channels + Daphne
- **AI Services:**
  - Google Gemini (text generation)
  - AssemblyAI (speech-to-text)
  - Whisper (local transcription)
  - HuggingFace (sentiment analysis)

### DevOps
- **ASGI Server:** Daphne
- **Task Scheduler:** Celery Beat
- **Caching:** Redis
- **Media Storage:** Local filesystem

---

## 📁 Project Structure

```
connectify-ai/
├── backend/
│   ├── accounts/          # User authentication & profiles
│   ├── posts/             # Post creation & feed
│   ├── stories/           # Stories feature
│   ├── chat/              # Real-time messaging
│   ├── notifications/     # Push notifications
│   ├── videos/            # AI video processing
│   ├── news/              # AI news platform
│   ├── quests/            # Quest system
│   ├── social/            # Follow/connection features
│   ├── analytics/         # Admin analytics
│   ├── ai_service/        # AI integration services
│   ├── config/            # Django settings & URLs
│   ├── manage.py
│   ├── requirements.txt
│   └── venv/
│
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # Context providers
│   │   ├── utils/         # Utility functions
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── node_modules/
│
├── START_ALL_SERVICES.ps1  # Automated startup script
├── QUICK_START.bat         # Simple startup script
├── CHECK_SYSTEM.bat        # System verification
├── SETUP_DATABASE.bat      # Database setup
├── TROUBLESHOOTING.md      # Troubleshooting guide
└── README.md               # This file
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register/          # Register new user
POST   /api/auth/login/             # Login
POST   /api/auth/token/refresh/     # Refresh JWT token
GET    /api/auth/profile/           # Get user profile
PUT    /api/auth/profile/           # Update profile
```

### Posts
```
GET    /api/posts/feed/             # Get personalized feed
POST   /api/posts/                  # Create post
GET    /api/posts/{id}/             # Get post details
PUT    /api/posts/{id}/             # Update post
DELETE /api/posts/{id}/             # Delete post
POST   /api/posts/{id}/like/        # Like/unlike post
POST   /api/posts/{id}/comment/     # Add comment
```

### Stories
```
GET    /api/stories/                # Get active stories
POST   /api/stories/                # Create story
GET    /api/stories/{id}/           # Get story details
DELETE /api/stories/{id}/           # Delete story
POST   /api/stories/{id}/view/      # Mark as viewed
```

### Videos
```
POST   /api/videos/upload/          # Upload video
POST   /api/videos/{id}/captions/   # Generate captions
POST   /api/videos/{id}/thumbnail/  # Generate thumbnail
GET    /api/videos/{id}/status/     # Check processing status
```

### Chat
```
GET    /api/chat/conversations/     # List conversations
GET    /api/chat/{id}/messages/     # Get messages
POST   /api/chat/{id}/send/         # Send message
WS     /ws/chat/{id}/               # WebSocket connection
```

### Notifications
```
GET    /api/notifications/          # Get notifications
PUT    /api/notifications/{id}/read/ # Mark as read
WS     /ws/notifications/           # WebSocket connection
```

### News
```
GET    /api/news/                   # Get news feed
GET    /api/news/{id}/              # Get article details
POST   /api/news/{id}/summary/      # Generate AI summary
```

### Social
```
POST   /api/social/follow/{id}/     # Follow user
POST   /api/social/unfollow/{id}/   # Unfollow user
GET    /api/social/followers/       # Get followers
GET    /api/social/following/       # Get following
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. `ECONNREFUSED` Error
**Problem:** Frontend can't connect to backend

**Solution:**
```powershell
# Ensure backend is running
cd backend
.\venv\Scripts\activate
python manage.py runserver 8000
```

#### 2. Database Connection Error
**Problem:** Can't connect to MySQL

**Solution:**
```powershell
# Start MySQL service
net start MySQL

# Create database
.\SETUP_DATABASE.bat
```

#### 3. Port Already in Use
**Problem:** Port 8000 or 5173 is occupied

**Solution:**
```powershell
# Kill process on port 8000
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force

# Kill process on port 5173
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force
```

#### 4. Module Not Found
**Problem:** Missing Python/Node dependencies

**Solution:**
```powershell
# Backend
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Full Troubleshooting Guide
See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions.

---

## 🔧 Configuration

### Environment Variables

Create `backend/.env`:

```env
SECRET_KEY=your-django-secret-key
DEBUG=True
GEMINI_API_KEY=your-gemini-api-key
ASSEMBLYAI_API_KEY=your-assemblyai-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Database Settings

Edit `backend/config/settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'connectify_db',
        'USER': 'root',
        'PASSWORD': 'your-password',
        'HOST': 'localhost',
        'PORT': '3306',
    }
}
```

---

## 📦 Deployment

### Production Checklist

- [ ] Set `DEBUG=False` in settings
- [ ] Configure proper `SECRET_KEY`
- [ ] Set up production database
- [ ] Configure static file serving
- [ ] Set up Redis for production
- [ ] Configure CORS for production domain
- [ ] Set up SSL/HTTPS
- [ ] Configure media file storage (S3/CloudFront)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

### Build Frontend

```powershell
cd frontend
npm run build
```

### Collect Static Files

```powershell
cd backend
python manage.py collectstatic
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🆘 Support

For issues and questions:
1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Review error logs in terminal
3. Check browser console (F12)
4. Verify all services are running

---

## 🎯 Development Roadmap

- [ ] Mobile app (React Native)
- [ ] Video calling feature
- [ ] AI content moderation
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] Dark mode toggle
- [ ] Progressive Web App (PWA)
- [ ] Docker containerization

---

**Made with ❤️ by the Connectify-AI Team**
