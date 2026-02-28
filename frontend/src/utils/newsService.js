/**
 * 📰 News Data Pipeline (NewsAPI.org V2)
 * Features: 
 * - Real-time fetching
 * - Strict Classification (with Tech exclusions)
 * - AI Image Generation for missing images
 * - Pagination & Rate Limiting
 */

import { classifyNews } from './newsClassifier';

const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY;
const NEWS_API_BASE = 'https://newsapi.org/v2';
const CACHE_KEY_PREFIX = 'news_feed_live_v10_'; // v10 - Fresh news
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache

// FORCE RELOAD - This timestamp proves new code is loaded
console.log('🔥🔥🔥 NEWS SERVICE v10 - LOADED AT:', new Date().toLocaleTimeString());
console.log('🚀 FRESH NEWS (2 min cache)');
console.log('📊 100 articles per category');
console.log('🔄 Force refresh on page load');
console.log('⚡ Logo fix: Using Google Favicons (no ad-blocker issues)');

// Rate Limit Tracking
let requestCount = 0;
const MAX_REQUESTS_PER_SESSION = 50;

/**
 * Validates image URL availability
 */
function isValidImageUrl(url) {
    return url && url.startsWith('http') && !url.includes('null') && !url.includes('undefined');
}

/**
 * Generates an AI Image based on the news title
 * Uses Pollinations.ai for dynamic generation
 */
function generateRelevantImage(headline, category) {
    // Clean headline for prompt
    const cleanPrompt = headline
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .substring(0, 50) + ` ${category} news style high quality`;

    return `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=800&height=600&nologo=true&seed=${Math.random()}`;
}

/**
 * 2️⃣ Strict Entertainment Categorization Logic
 */
function enforceStrictCategory(article) {
    const text = `${article.title} ${article.description || ''}`.toLowerCase();

    // EXCLUSIONS: Tech Hardware/Software should NOT be entertainment even if it mentions gaming
    const techExclusions = [
        'cpu', 'processor', 'chip', 'intel', 'amd', 'nvidia', 'geforce', 'rtx',
        'laptop', 'desktop', 'macbook', 'windows', 'linux', 'server', 'enterprise',
        'software', 'cloud', 'ai', 'artificial intelligence', 'developer', 'coding',
        'handheld pc', 'steam deck', 'legion go', 'rog ally', 'razer'
    ];

    if (techExclusions.some(k => text.includes(k))) {
        return null; // Let it remain Technology
    }

    const entertainmentKeywords = [
        'movie', 'cinema', 'ott', 'netflix', 'disney+', 'hbo', 'marvel',
        'celebrity', 'actor', 'actress', 'star', 'kardashian',
        'music', 'song', 'concert', 'singer', 'rapper', 'album',
        'gaming', 'game', 'ps5', 'xbox', 'nintendo', 'esports',
        'trailer', 'review', 'spoiler'
    ];

    if (entertainmentKeywords.some(k => text.includes(k))) {
        return 'Entertainment';
    }
    return null;
}

/**
 * Normalize NewsAPI.org article format
 */
function normalizeArticle(article, index, apiCategory) {
    // 1. Determine Category
    let category = 'General';
    const catMap = {
        'technology': 'Technology',
        'business': 'Business',
        'sports': 'Sports',
        'entertainment': 'Entertainment',
        'general': 'Politics'
    };

    if (apiCategory) {
        // Apply strict logic immediately to fix mis-labeled "General" or "Tech" news
        // But respect the exclusions
        category = catMap[apiCategory] || 'General';
    }

    // 2. Strict Overrides
    const strictCategory = enforceStrictCategory(article);
    if (strictCategory) {
        // Log when strict categorization changes politics articles
        if (category === 'Politics' && strictCategory !== 'Politics') {
            console.log(`⚠️ Politics article recategorized: "${article.title}" -> ${strictCategory}`);
        }
        category = strictCategory;
    }

    // 3. Preserve Politics if it came from politics query
    if (apiCategory === 'general' && !strictCategory) {
        // If it's from general category and no strict override, keep as Politics
        category = 'Politics';
    }

    // 3. Image Logic: Real > AI Generated
    let image = article.urlToImage;
    if (!isValidImageUrl(image)) {
        image = generateRelevantImage(article.title, category);
    }

    // Get hostname for favicon
    let hostname = 'google.com';
    try {
        hostname = new URL(article.url || 'http://google.com').hostname;
    } catch (e) {
        console.warn('Invalid URL:', article.url);
    }

    return {
        id: article.url || `news-${index}-${Date.now()}`,
        title: article.title,
        description: article.description || '',
        content: article.content || article.description || '',
        url: article.url,
        image: image,
        source: {
            name: article.source?.name || 'Unknown',
            // Use Google's favicon service instead of Clearbit (not blocked by ad blockers)
            logo: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
        },
        publishedAt: article.publishedAt,
        timeAgo: getTimeAgo(article.publishedAt),
        category: category,
        author: article.author || 'Connectify News'
    };
}

/**
 * Fetch helper with Rate Limiting and Pagination
 */
async function fetchCategory(category, page = 1) {
    if (requestCount > MAX_REQUESTS_PER_SESSION) {
        console.warn('⚠️ Client-side rate limit reached to protect API quota.');
        return [];
    }

    let apiCat = category;
    let query = '';

    if (category === 'politics') {
        apiCat = 'general';
        query = 'politics OR election OR government OR congress OR senate OR president OR policy OR legislation OR campaign';
    }

    try {
        const params = new URLSearchParams({
            apiKey: NEWS_API_KEY,
            country: 'us',
            category: apiCat,
            page: page.toString(),
            pageSize: '100',  // Increased from 20 to 100 for more articles
            sortBy: 'publishedAt'  // Get freshest articles first
        });

        if (query) params.append('q', query);

        const url = `${NEWS_API_BASE}/top-headlines?${params.toString()}`;
        requestCount++;

        console.log(`📡 Fetching ${category} (Page ${page})...`);
        const response = await fetch(url);

        if (response.status === 429) {
            console.error('❌ Rate Limited by NewsAPI');
            return [];
        }

        if (!response.ok) {
            console.error(`❌ NewsAPI error: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json();

        // Log freshness info
        if (data.articles && data.articles.length > 0) {
            const newest = data.articles[0];
            const publishTime = new Date(newest.publishedAt);
            const ageMinutes = Math.floor((Date.now() - publishTime.getTime()) / 60000);
            console.log(`✅ ${category}: ${data.articles.length} articles, newest is ${ageMinutes} min old`);
        }

        return (data.articles || []).map(a => ({ ...a, apiCategory: category }));
    } catch (e) {
        console.error(`Fetch failed for ${category}`, e);
        return [];
    }
}

/**
 * Main Data Pipeline
 */
export async function getNewsFeed(options = {}) {
    const { forceRefresh = true, page = 1 } = options;  // Default to forceRefresh = true for fresh news
    const cacheKey = `${CACHE_KEY_PREFIX}p${page}`;

    // Only use cache if explicitly requested AND cache is fresh
    if (!forceRefresh && page === 1) {
        const cached = getCachedFeed(cacheKey);
        if (cached) {
            console.log('📦 Serving cached feed (10s old max)');
            return cached;
        }
    }

    console.log(`🔄 Fetching Live News (Page ${page})...`);

    // Fetch major categories
    const categories = ['technology', 'business', 'sports', 'entertainment', 'politics'];

    // Execute Parallel Requests
    const results = await Promise.all(categories.map(cat => fetchCategory(cat, page)));

    // Flatten
    const rawArticles = results.flat();

    if (rawArticles.length === 0 && page === 1) {
        // Fallback or throw
        throw new Error('NewsAPI returned no articles. Check API Key or Quota.');
    }

    // Deduplicate
    const seen = new Set();
    const uniqueArticles = [];
    rawArticles.forEach(a => {
        if (!seen.has(a.url) && a.title !== '[Removed]') {
            seen.add(a.url);
            uniqueArticles.push(a);
        }
    });

    // Normalize
    const processedArticles = uniqueArticles.map((article, index) =>
        normalizeArticle(article, index, article.apiCategory)
    );

    // Group
    const categorized = processedArticles.reduce((acc, article) => {
        const cat = article.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(article);
        return acc;
    }, {});

    const feedData = {
        all: processedArticles,
        categorized,
        timestamp: Date.now()
    };

    if (page === 1) {
        cacheFeed(cacheKey, feedData);
    }

    return feedData;
}

// --- Helpers ---

function getTimeAgo(timestamp) {
    if (!timestamp) return 'Recently';
    const diff = Date.now() - new Date(timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function getCachedFeed(key) {
    try {
        const json = localStorage.getItem(key);
        if (!json) return null;
        const { data, timestamp } = JSON.parse(json);
        if (Date.now() - timestamp < CACHE_DURATION) return data;
        localStorage.removeItem(key);
    } catch (e) { return null; }
    return null;
}

function cacheFeed(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) { console.error(e); }
}

export function clearNewsCache() {
    // Clear all news keys
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('news_feed_')) localStorage.removeItem(key);
    });
}
