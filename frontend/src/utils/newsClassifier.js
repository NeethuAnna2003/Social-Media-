/**
 * AI News Categorization Engine
 * Uses NLP intent detection + keyword matching + confidence scoring
 */

const CATEGORIES = {
    TECHNOLOGY: 'Technology',
    BUSINESS: 'Business',
    SPORTS: 'Sports',
    ENTERTAINMENT: 'Entertainment',
    POLITICS: 'Politics'
};

// Category keyword patterns with weighted scoring
const CATEGORY_PATTERNS = {
    [CATEGORIES.ENTERTAINMENT]: {
        primary: ['movie', 'film', 'celebrity', 'music', 'concert', 'album', 'actor', 'actress',
            'netflix', 'disney', 'hbo', 'streaming', 'ott', 'gaming', 'game', 'viral',
            'meme', 'tiktok', 'youtube', 'influencer', 'award', 'oscar', 'grammy',
            'billboard', 'box office', 'premiere', 'trailer', 'series', 'episode'],
        secondary: ['entertainment', 'show', 'performance', 'star', 'fame', 'hollywood',
            'bollywood', 'tv', 'television', 'radio', 'podcast'],
        weight: 1.5 // Higher weight for entertainment to prevent misclassification
    },
    [CATEGORIES.TECHNOLOGY]: {
        primary: ['ai', 'artificial intelligence', 'machine learning', 'tech', 'software',
            'hardware', 'app', 'startup', 'silicon valley', 'coding', 'programming',
            'cyber', 'data', 'cloud', 'blockchain', 'crypto', 'bitcoin', 'smartphone',
            'apple', 'google', 'microsoft', 'meta', 'tesla', 'spacex'],
        secondary: ['innovation', 'digital', 'internet', 'web', 'platform', 'algorithm',
            'robot', 'automation', 'chip', 'processor'],
        weight: 1.0
    },
    [CATEGORIES.BUSINESS]: {
        primary: ['stock', 'market', 'economy', 'finance', 'investment', 'trading', 'wall street',
            'nasdaq', 'dow jones', 'earnings', 'revenue', 'profit', 'loss', 'merger',
            'acquisition', 'ipo', 'ceo', 'cfo', 'corporate', 'business'],
        secondary: ['company', 'industry', 'sector', 'shares', 'dividend', 'fiscal',
            'quarterly', 'annual', 'growth', 'decline'],
        weight: 1.0
    },
    [CATEGORIES.SPORTS]: {
        primary: ['football', 'basketball', 'cricket', 'tennis', 'soccer', 'nfl', 'nba',
            'mlb', 'nhl', 'ipl', 'fifa', 'olympics', 'championship', 'tournament',
            'match', 'game', 'player', 'team', 'coach', 'score', 'goal', 'win', 'loss'],
        secondary: ['sport', 'athletic', 'league', 'season', 'playoff', 'final',
            'stadium', 'arena', 'athlete'],
        weight: 1.0
    },
    [CATEGORIES.POLITICS]: {
        primary: ['election', 'vote', 'president', 'minister', 'congress', 'parliament',
            'senate', 'government', 'policy', 'law', 'legislation', 'democrat',
            'republican', 'party', 'campaign', 'political', 'politician'],
        secondary: ['white house', 'capitol', 'supreme court', 'governor', 'mayor',
            'diplomatic', 'treaty', 'sanction'],
        weight: 1.0
    },

};

/**
 * Calculate confidence score for a category
 */
function calculateCategoryScore(text, patterns, weight = 1.0) {
    const lowerText = text.toLowerCase();
    let score = 0;

    // Primary keywords (higher weight)
    patterns.primary.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = lowerText.match(regex);
        if (matches) {
            score += matches.length * 3; // 3 points per primary match
        }
    });

    // Secondary keywords (lower weight)
    patterns.secondary.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = lowerText.match(regex);
        if (matches) {
            score += matches.length * 1; // 1 point per secondary match
        }
    });

    return score * weight;
}

/**
 * Classify news article into exactly one category
 * @param {Object} article - Article object with title, description, content
 * @returns {string} - Category name
 */
export function classifyNews(article) {
    const { title = '', description = '', content = '' } = article;
    const fullText = `${title} ${description} ${content}`;

    // Calculate scores for each category
    const scores = {};
    Object.entries(CATEGORY_PATTERNS).forEach(([category, patterns]) => {
        scores[category] = calculateCategoryScore(fullText, patterns, patterns.weight);
    });

    // Find category with highest score
    let maxScore = 0;
    let bestCategory = CATEGORIES.ENTERTAINMENT; // Default fallback

    Object.entries(scores).forEach(([category, score]) => {
        if (score > maxScore) {
            maxScore = score;
            bestCategory = category;
        }
    });

    // If no clear winner, use heuristic rules
    if (maxScore === 0) {
        // Check for entertainment indicators in title
        const entertainmentIndicators = ['watch', 'listen', 'stream', 'release', 'debut'];
        if (entertainmentIndicators.some(ind => title.toLowerCase().includes(ind))) {
            return CATEGORIES.ENTERTAINMENT;
        }

        // Default to Entertainment if no matches
        return CATEGORIES.ENTERTAINMENT;
    }

    return bestCategory;
}

/**
 * Get category color scheme
 */
export function getCategoryColor(category) {
    const colorMap = {
        [CATEGORIES.TECHNOLOGY]: {
            bg: 'bg-blue-500',
            text: 'text-blue-600',
            border: 'border-blue-200',
            gradient: 'from-blue-500 to-cyan-500'
        },
        [CATEGORIES.BUSINESS]: {
            bg: 'bg-emerald-500',
            text: 'text-emerald-600',
            border: 'border-emerald-200',
            gradient: 'from-emerald-500 to-teal-500'
        },
        [CATEGORIES.SPORTS]: {
            bg: 'bg-orange-500',
            text: 'text-orange-600',
            border: 'border-orange-200',
            gradient: 'from-orange-500 to-red-500'
        },
        [CATEGORIES.ENTERTAINMENT]: {
            bg: 'bg-purple-500',
            text: 'text-purple-600',
            border: 'border-purple-200',
            gradient: 'from-purple-500 to-pink-500'
        },
        [CATEGORIES.POLITICS]: {
            bg: 'bg-red-500',
            text: 'text-red-600',
            border: 'border-red-200',
            gradient: 'from-red-500 to-rose-500'
        },

    };

    return colorMap[category] || colorMap[CATEGORIES.ENTERTAINMENT];
}

/**
 * Get category icon
 */
export function getCategoryIcon(category) {
    const iconMap = {
        [CATEGORIES.TECHNOLOGY]: '💻',
        [CATEGORIES.BUSINESS]: '💼',
        [CATEGORIES.SPORTS]: '⚽',
        [CATEGORIES.ENTERTAINMENT]: '🎬',
        [CATEGORIES.POLITICS]: '🏛️'
    };

    return iconMap[category] || '📰';
}

export { CATEGORIES };
