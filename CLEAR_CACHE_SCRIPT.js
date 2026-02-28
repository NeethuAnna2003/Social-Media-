// 🧹 CACHE CLEANER - Run this in Browser Console
// This will clear ALL old news cache and force fresh news

console.log('🧹 Starting Cache Cleanup...');

// 1. Clear all old news cache keys
let cleared = 0;
Object.keys(localStorage).forEach(key => {
    if (key.startsWith('news_feed_')) {
        localStorage.removeItem(key);
        cleared++;
        console.log('❌ Removed:', key);
    }
});

console.log(`✅ Cleared ${cleared} old cache entries`);

// 2. Clear any summary cache
Object.keys(localStorage).forEach(key => {
    if (key.startsWith('summary_')) {
        localStorage.removeItem(key);
        console.log('❌ Removed summary:', key);
    }
});

// 3. Force reload
console.log('🔄 Reloading page with fresh cache...');
setTimeout(() => {
    window.location.reload(true);
}, 1000);

console.log('✅ Cache cleanup complete! Page will reload in 1 second...');
