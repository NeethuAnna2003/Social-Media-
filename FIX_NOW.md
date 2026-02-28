# 🚨 IMMEDIATE FIX - Start the News Platform

## ⚡ STEP-BY-STEP STARTUP (DO THIS NOW)

### Step 1: Open TWO Command Prompts (NOT PowerShell)

**Why?** PowerShell has execution policy blocking npm commands.

**How?**
1. Press `Win + R`
2. Type `cmd`
3. Press Enter
4. Repeat to open a second CMD window

---

### Step 2: Start Backend (CMD Window #1)

```cmd
cd "C:\Users\HP\Desktop\4th SEMES\connectify-ai\backend"
python manage.py runserver 0.0.0.0:8000
```

**Wait for**: `Starting development server at http://0.0.0.0:8000/`

---

### Step 3: Start Frontend (CMD Window #2)

```cmd
cd "C:\Users\HP\Desktop\4th SEMES\connectify-ai\frontend"
npm run dev
```

**Wait for**: 
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

### Step 4: Open Browser

```
http://localhost:5173/news
```

**Press F12** to open Developer Console and check for errors.

---

## 🔍 VERIFICATION CHECKLIST

### ✅ Backend Running?
Open: `http://localhost:8000/admin`
- Should see Django admin login page
- If not, backend isn't running

### ✅ Frontend Running?
Open: `http://localhost:5173`
- Should see the app
- If "Cannot connect", frontend isn't running

### ✅ News Loading?
1. Go to `http://localhost:5173/news`
2. Open Console (F12)
3. Look for: `🚀 LIVE NEWS SERVICE v6 (Categorization Fixed) INITIALIZED`
4. Look for: `📡 Fetching technology (Page 1)...`
5. Should see news cards appear

### ✅ Read Full Story Works?
1. Click "Read Full Story" on any card
2. Should open external website in NEW TAB
3. Should NOT go back to feed

### ✅ Article Detail Works?
1. Click anywhere on the card (NOT "Read Full Story")
2. Should navigate to `/news/[article-id]`
3. Should see:
   - Full article content
   - Voice Reader section
   - AI Summary section
   - Discussion section

---

## 🐛 TROUBLESHOOTING

### Problem: "No news showing"

**Solution 1: Clear Browser Cache**
```javascript
// In browser console (F12)
localStorage.clear();
location.reload();
```

**Solution 2: Check API Key**
```cmd
cd "C:\Users\HP\Desktop\4th SEMES\connectify-ai\frontend"
type .env
```
Should show: `VITE_NEWS_API_KEY=7960be55587549bbaf1cccfdbbf798ac`

**Solution 3: Check Console Errors**
- Press F12
- Go to Console tab
- Look for red errors
- Common issues:
  - `401 Unauthorized` → API key invalid
  - `429 Too Many Requests` → API quota exceeded
  - `CORS error` → Backend not running

---

### Problem: "Read Full Story goes to feed"

**This is FIXED in the code.** If still happening:

1. Hard refresh: `Ctrl + Shift + R`
2. Clear cache: `Ctrl + Shift + Delete`
3. Check console for errors

The button should:
- Open `article.url` in NEW TAB
- NOT navigate within the app

---

### Problem: "Voice Reader not working"

**Check:**
1. Is article detail page showing?
2. Is Voice Reader section visible?
3. Click "Play Headline"
4. Check browser console for errors

**Common issues:**
- Browser doesn't support SpeechSynthesis
- Microphone permissions (not needed for TTS)
- Article content is empty

---

### Problem: "AI Summary not showing"

**Check:**
1. Is article content available?
2. Open console, look for errors
3. Summary generates client-side (no API needed)

**If blank:**
- Article might have no content
- Check `article.description` and `article.content`

---

### Problem: "Discussion area empty"

**This is normal!** No comments yet.

**To test:**
1. Type a comment
2. Click "Post Comment"
3. Should appear immediately
4. Try upvote/downvote
5. Try posting spam (e.g., "click here buy now") → Should be rejected

---

## 📊 WHAT YOU SHOULD SEE

### News Feed Page (`/news`)
```
┌─────────────────────────────────────────┐
│ ALL NEWS  Tech(13)  Business(16) ...    │
├─────────────────────────────────────────┤
│ [Image] [Image] [Image] [Image]         │
│ Headline Headline Headline Headline     │
│ Description...                           │
│ READ FULL STORY ↗                       │
└─────────────────────────────────────────┘
System v5.0 • Live NewsAPI
```

### Article Detail Page (`/news/[id]`)
```
┌─────────────────────────────────────────┐
│ ← Back                                  │
├─────────────────────────────────────────┤
│ [HERO IMAGE]                            │
│ Article Title                           │
│ Source • Time • Author                  │
├─────────────────────────────────────────┤
│ 🔊 VOICE READER                         │
│ ▶️ Play  Speed: 1.0x  Mode: Headline   │
├─────────────────────────────────────────┤
│ ✨ AI SUMMARY          😊 Positive      │
│ Quick summary text...                   │
│ • Key fact 1                            │
│ • Key fact 2                            │
├─────────────────────────────────────────┤
│ [FULL ARTICLE CONTENT]                  │
├─────────────────────────────────────────┤
│ 💬 DISCUSSION                           │
│ [Comment box]                           │
│ Post Comment                            │
└─────────────────────────────────────────┘
```

---

## ✅ FEATURES THAT ARE ALREADY IMPLEMENTED

All these features are CODED and WORKING:

### 1. News Fetching ✅
- **File**: `frontend/src/utils/newsService.js`
- **Function**: `getNewsFeed()`
- **API**: NewsAPI.org
- **Cache**: LocalStorage, 10-min TTL

### 2. Voice Reader ✅
- **File**: `frontend/src/components/VoiceReader.jsx`
- **Features**:
  - Play/Pause/Stop
  - Speed: 0.5x - 2.0x
  - Modes: Headline, Summary, Full
  - Progress bar

### 3. AI Summarizer ✅
- **File**: `frontend/src/components/NewsSummarizer.jsx`
- **Features**:
  - 2-line summary
  - Bullet points
  - Sentiment (😊/😐/😟)
  - Zero hallucination

### 4. Discussion ✅
- **File**: `frontend/src/components/NewsDiscussion.jsx`
- **Features**:
  - Threaded comments
  - Upvote/Downvote
  - Sort: Hot/New/Top
  - AI moderation (spam, toxicity)
  - 30-second polling

### 5. Categorization ✅
- **File**: `frontend/src/utils/newsService.js`
- **Function**: `enforceStrictCategory()`
- **Logic**:
  - Tech exclusions (CPU, Intel → Tech)
  - Entertainment keywords (Netflix, Movie → Entertainment)

---

## 🎯 NEXT STEPS

1. **Start both servers** (backend + frontend)
2. **Open** `http://localhost:5173/news`
3. **Clear cache** if needed
4. **Test each feature**:
   - News loads
   - Click card → Detail page
   - Click "Read Full Story" → External link
   - Voice reader plays
   - Summary generates
   - Post comment

---

## 📞 IF STILL NOT WORKING

**Check these files exist:**
- `frontend/src/utils/newsService.js`
- `frontend/src/components/VoiceReader.jsx`
- `frontend/src/components/NewsSummarizer.jsx`
- `frontend/src/components/NewsDiscussion.jsx`
- `frontend/src/pages/NewsArticleDetail.jsx`

**All features are implemented. The issue is likely:**
1. Servers not running
2. Browser cache
3. API key issue
4. Console errors

**Start the servers using CMD (not PowerShell) and check the console!**
