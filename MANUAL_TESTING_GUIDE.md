# 🎯 MANUAL TESTING GUIDE - Verify Real AI Captions

## 📍 Open This URL
```
http://localhost:5173/studio
```

---

## ✅ Step-by-Step Testing

### Step 1: Upload a Video

1. Click **"Upload Video"** or **"+"** button
2. Select your 19-second video file
3. Add title and description
4. Click **"Upload"**
5. Wait for upload to complete

---

### Step 2: Open Caption Editor

1. Find your uploaded video in the list
2. Click on the video thumbnail or **"Edit Captions"** button
3. You should see the **Caption Editor** interface

---

### Step 3: Generate Captions

1. Look for **"Generate Captions"** button
2. Make sure **"Audio Language"** is set to **"Auto-detect"**
3. Click **"Generate Captions"**
4. **WAIT 10-30 seconds** (don't refresh!)
5. Watch the status indicator

---

### Step 4: Verify Results

#### ✅ GOOD SIGNS (Real Whisper AI):

**Caption Count:**
- You should see **5-8 captions** for a 19-second video
- NOT just 1 caption!

**Caption Text:**
- Captions should match **exact words spoken** in the video
- NOT generic templates like "Subscribe to the channel"

**Language Detection:**
- Should show **"Detected Language: English"** (or actual language)
- Green dot indicator

**Status:**
- Should show **"X lines parsed"** (where X = 5-8)

**Example of GOOD captions:**
```
[0.0-2.8] "Hello everyone, welcome to this tutorial."
[2.8-6.2] "Today we're going to explore AI."
[6.2-9.5] "Machine learning is transforming work."
[9.5-12.8] "Let's dive into the details."
[12.8-16.2] "Notice how it adapts automatically."
[16.2-19.0] "Thank you for watching!"
```

#### ❌ BAD SIGNS (Demo Generator - Fake):

**Caption Count:**
- Only **1 caption** for 19-second video

**Caption Text:**
- Generic template: "Subscribe to the channel."
- OR: "Welcome to our video tutorial."
- NOT matching actual audio!

**Example of BAD captions:**
```
[0.0-2.5] "Subscribe to the channel."
```

---

### Step 5: Test Video Overlay

1. **Play the video** in the caption editor
2. **Watch for captions** appearing ON the video
3. Captions should have:
   - Black semi-transparent background
   - White bold text
   - Positioned at bottom-center
   - Appear/disappear at correct times

---

## 🔍 Troubleshooting

### If You See Fake Captions:

**Problem:** Only 1 caption, generic text  
**Cause:** Whisper not loaded, using Demo fallback

**Solution:**
1. Stop backend server (Ctrl+C in terminal)
2. Restart: `cd backend && python manage.py runserver`
3. Wait for server to fully start
4. Delete old captions (see below)
5. Try generating again

---

### How to Delete Old Captions:

**Option 1: In the UI**
- Click the trash icon next to each caption
- Delete all captions
- Generate new ones

**Option 2: Via Django Shell**
```bash
cd backend
python manage.py shell
```
```python
from videos.models import Caption
Caption.objects.all().delete()
print("✓ All captions deleted!")
exit()
```

---

## 📊 Expected vs Actual

### For a 19-Second Video:

| Metric | Fake (Demo) | Real (Whisper) |
|--------|-------------|----------------|
| **Lines** | 1 | 5-8 |
| **Text** | "Subscribe to channel" | Exact spoken words |
| **Accuracy** | 0% | 90-95% |
| **Language** | Always "en" | Auto-detected |
| **Timing** | Fixed 0-2.5s | Word-level precise |

---

## 🎬 Video Overlay Test

### What to Look For:

1. **Play the video**
2. **Captions should appear ON the video** (not just below)
3. **Styling:**
   - Black background with 80% opacity
   - White text, bold, large font
   - Text shadow for readability
   - Centered at bottom
   - Above video controls

4. **Timing:**
   - Captions appear at correct time
   - Disappear when segment ends
   - Smooth fade-in animation

---

## 🛠️ Backend Verification

### Check Server Logs:

Look in the terminal where Django is running for:

**GOOD (Whisper working):**
```
Using Local Whisper for caption generation
Loading Whisper model: small
Whisper model loaded successfully on cpu
Transcribing /path/to/audio.wav...
Generated 6 captions via Whisper
```

**BAD (Demo fallback):**
```
Whisper not available. Using Demo generator.
Using Demo Generator
```

---

## ✅ Success Checklist

After generating captions, verify:

- [ ] Caption count is 5-8 (not 1)
- [ ] Caption text matches spoken words
- [ ] Language is auto-detected correctly
- [ ] Timing is accurate (word-level)
- [ ] Captions appear ON the video when playing
- [ ] Overlay has black background, white text
- [ ] Server logs show "Using Local Whisper"

---

## 📞 If Still Not Working

### Check 1: Whisper Installation
```bash
pip list | findstr whisper
```
Should show: `openai-whisper`

### Check 2: FFmpeg Installation
```bash
ffmpeg -version
```
Should show version info

### Check 3: Server Restart
```bash
# Stop server (Ctrl+C)
cd backend
python manage.py runserver
```

### Check 4: Clear Browser Cache
```
Ctrl+Shift+R (hard refresh)
```

---

## 🎯 Quick Test

**Fastest way to verify:**

1. Open http://localhost:5173/studio
2. Upload a short video (10-30 seconds)
3. Generate captions
4. Count the lines:
   - **1 line** = Fake (Demo)
   - **5+ lines** = Real (Whisper) ✓

---

## 📋 Report Back

After testing, note:

1. **Caption count:** ___ lines
2. **First caption text:** "___"
3. **Does it match audio?** Yes / No
4. **Language detected:** ___
5. **Video overlay working?** Yes / No
6. **Server log message:** "___"

This will help identify if Whisper is working or if we need to troubleshoot further.

---

## 🎉 Success Indicators

**You'll know it's working when:**

✅ Multiple caption lines (5-8 for 19s video)  
✅ Text matches exact spoken words  
✅ Auto language detection  
✅ Captions appear on video overlay  
✅ Server logs show "Using Local Whisper"  

**Then you have real AI captions!** 🚀
