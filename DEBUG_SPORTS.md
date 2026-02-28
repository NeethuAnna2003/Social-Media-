# 🏀 Sports News Debugging Guide

## 🎯 The Issue

Sports tab shows "10" articles but displays "No articles found" when clicked.

## 🔍 Diagnosis Steps

### Step 1: Restart Frontend
```cmd
# Press Ctrl+C in terminal
cd frontend
npm run dev
```

### Step 2: Open Browser Console
1. Go to: `http://localhost:5173/news-dashboard`
2. Press F12
3. Go to Console tab

### Step 3: Check Debug Output

**When page loads, look for:**
```
📊 Categorized Data: {
  all: 73,
  categorized: [
    {category: "Technology", count: 15},
    {category: "Business", count: 19},
    {category: "Sports", count: 10},  ← Should see this
    {category: "Entertainment", count: 23},
    {category: "Politics", count: 12},
    {category: "Local", count: 0}
  ],
  selectedCategory: "all",
  filteredCount: 73
}
```

### Step 4: Click Sports Tab

**After clicking Sports, look for:**
```
📊 Categorized Data: {
  ...
  selectedCategory: "Sports",
  filteredCount: 10  ← Should be 10, not 0
}
```

---

## 🐛 Possible Issues

### Issue 1: Category Name Mismatch
**Symptom:** `filteredCount: 0` when clicking Sports

**Cause:** Category key doesn't match
- Frontend expects: `"Sports"`
- Backend returns: `"sports"` (lowercase)

**Fix:** Check console output - if category is lowercase, we need to fix the mapping

### Issue 2: Articles Not Categorized
**Symptom:** Sports count is 0 in categorized data

**Cause:** NewsAPI didn't return sports articles OR categorization failed

**Fix:** Check if `newsData.all` contains sports articles

### Issue 3: Ad Blocker Blocking Content
**Symptom:** Console shows `ERR_BLOCKED_BY_CLIENT`

**Cause:** Ad blocker is blocking clearbit.com (team logos)

**Fix:** This doesn't affect article display, only logos

---

## 📊 What to Send Me

After restarting and opening the console:

1. **Screenshot of console showing:**
   - The `📊 Categorized Data` log when page loads
   - The `📊 Categorized Data` log after clicking Sports

2. **Tell me:**
   - What is `filteredCount` when you click Sports?
   - What categories appear in the `categorized` array?
   - Are the category names capitalized (e.g., "Sports") or lowercase (e.g., "sports")?

---

## 🔧 Quick Test

**In browser console, run:**
```javascript
// Check what's in localStorage
const cache = localStorage.getItem('news_feed_live_v6_correct_cats_p1');
const data = JSON.parse(cache);

// Show all categories
console.log('Categories:', Object.keys(data.data.categorized));

// Show Sports articles
console.log('Sports articles:', data.data.categorized.Sports || data.data.categorized.sports);
```

**This will show:**
- If Sports category exists
- If it's capitalized or lowercase
- How many articles are in it

---

## ✅ Expected Result

**Console should show:**
```
Categories: ["Technology", "Business", "Sports", "Entertainment", "Politics", "Local"]
Sports articles: Array(10) [...]
```

**If you see:**
```
Sports articles: undefined
```

Then the category key is wrong or sports articles aren't being categorized.

---

**Restart frontend, check console, and send me the debug output!**
