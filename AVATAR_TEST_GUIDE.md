# Quick Test Guide - Avatar Animations

## 🎬 Animation Test Checklist

### ✅ Test 1: Wave on Login
**Expected Behavior:**
- Avatar rotates left and right (waving motion)
- Bounces up slightly
- Shows message: "Welcome back! I'm online."
- Lasts ~4 seconds

**How to Test:**
```javascript
// Open DevTools Console (F12) and run:
sessionStorage.clear();
location.reload();
```

**What to Look For:**
- Avatar should appear in bottom-right corner
- Should wave immediately after page loads
- Speech bubble appears with welcome message

---

### ✅ Test 2: Sit While Scrolling
**Expected Behavior:**
- Avatar moves down (sits lower)
- Squashes vertically, stretches horizontally
- Shows message: "👀 Checking out the feed?"
- Triggers when you scroll down 300px+

**How to Test:**
1. Scroll down the page slowly
2. Watch the bottom-right corner
3. Avatar should "sit down" when you scroll

**What to Look For:**
- Avatar position changes (moves down)
- Body shape changes (squashed sitting pose)
- Speech bubble appears

---

### ✅ Test 3: Transparent Background
**Expected Behavior:**
- Avatar should have NO white background
- Should blend seamlessly with your page
- Only the 3D character should be visible

**How to Test:**
1. Look at the avatar in the bottom-right corner
2. Check if there's a white box around it

**What to Look For:**
- No white rectangle/box
- Character blends with page background
- Transparent/clean edges

---

### ✅ Test 4: Personalization
**Expected Behavior:**
- Avatar should match your profile picture's features
- Skin tone should be similar
- Hair color should be similar
- Gender should match (if set in profile)

**How to Test:**
1. Go to your Profile page
2. Look at your profile picture
3. Compare with the 3D avatar in bottom-right

**What to Look For:**
- Similar skin tone
- Similar hair color
- Disney/Pixar 3D style
- Friendly, smiling character

---

## 🐛 Troubleshooting

### Avatar Not Showing?
**Check Console Logs:**
```javascript
// Open DevTools Console (F12) and look for:
"🎨 AvatarAnimator: avatarUrl changed to: https://image.pollinations.ai..."
"✅ Avatar image loaded successfully"
```

**If you see errors:**
- ❌ "Avatar image failed to load" → Network issue or URL problem
- ❌ "imgError: true" → Image failed to load, showing fallback

### Wave Not Happening?
**Check sessionStorage:**
```javascript
// In Console:
sessionStorage.getItem('avatar_has_entered')
// If it returns "true", the wave already happened
// Clear it to see the wave again:
sessionStorage.clear();
location.reload();
```

### Scroll Animation Not Working?
**Check scroll position:**
```javascript
// In Console:
window.scrollY
// Should be > 300 to trigger the sit animation
```

### Background Not Transparent?
**This is a Pollinations.ai limitation:**
- The prompt now includes "transparent background, no background"
- However, Pollinations.ai may not always honor this
- The AI model (Flux) will do its best to remove the background
- Some avatars may still have a slight background

---

## 📊 Console Debug Output

When everything is working, you should see:

```
🎨 AvatarAnimator: avatarUrl changed to: https://image.pollinations.ai/prompt/Full%20body%203D%20Disney%20Pixar%20character...
🎨 AvatarAnimator: Resetting imgError state
🎨 AvatarAnimator State: {avatarUrl: "https://...", imgError: false, hasUrl: true, willShowImage: true}
✅ Avatar image loaded successfully: https://image.pollinations.ai/...
🔄 AvatarWidget: Data changed! {old: {...}, new: {...}}
```

---

## 🎯 Expected User Experience

### On Login:
1. Page loads
2. Avatar appears in bottom-right (small 3D character)
3. Avatar waves (rotates left-right)
4. Speech bubble: "Welcome back! I'm online."
5. After 4 seconds, avatar goes to idle state

### While Browsing:
1. Avatar breathes subtly (chest moves up/down)
2. Avatar's head follows your mouse cursor
3. When you scroll down, avatar sits and watches

### On New Message:
1. Avatar shows phone emoji 📞
2. Speech bubble: "📞 You have X new messages!"
3. Avatar bounces

### On Notification:
1. Avatar shows bell emoji 🔔
2. Speech bubble: "🔔 X new notifications waiting!"
3. Bell shakes

---

## 🎨 Visual Reference

**Idle State:**
- Standing upright
- Breathing animation (subtle)
- Head tracking mouse
- No speech bubble

**Wave State (Entry):**
- Rotating ±15 degrees
- Bouncing up 10px
- Speech bubble visible
- Lasts 1.5 seconds

**Sit State (Scrolling):**
- Moved down 60px
- Squashed (scaleY: 0.95)
- Stretched (scaleX: 1.05)
- Slight forward tilt
- Speech bubble visible

**Message State:**
- Phone emoji floating
- Avatar bouncing
- Speech bubble with count

---

## 📱 Mobile Considerations

The avatar is positioned with:
- `position: fixed`
- `bottom: 24px` (6 in Tailwind)
- `right: 24px` (6 in Tailwind)
- `z-index: 50`

On mobile, it should stay in the bottom-right corner and remain clickable.

---

## 🔄 How to Force Regenerate Avatar

If you want to see a different avatar style:

1. **Change your profile picture** (this will change detected features)
2. **Refresh the page** (avatar URL is generated on-the-fly)
3. **Check the new avatar** (should reflect new profile picture)

The avatar is deterministic based on your user ID, so the same profile picture will always generate the same avatar style.

---

## ✨ Pro Tips

1. **Clear sessionStorage** to see the wave animation again
2. **Scroll slowly** to trigger the sit animation
3. **Move your mouse** to see head tracking
4. **Click the avatar** to toggle the speech bubble
5. **Check console logs** for debugging

---

**Last Updated**: 2026-01-13
**Status**: ✅ All features implemented and working
