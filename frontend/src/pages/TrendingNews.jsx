import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const TrendingNews = () => {
    const navigate = useNavigate();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [recommendationMode, setRecommendationMode] = useState('trending');
    const [customTopic, setCustomTopic] = useState('');
    const [scrollY, setScrollY] = useState(0);
    const [searchFocused, setSearchFocused] = useState(false);
    const [error, setError] = useState(null);
    const contentRef = useRef(null);

    const categories = [
        {
            id: 'all',
            name: 'All News',
            icon: '🌐',
            color: 'from-indigo-500 via-purple-500 to-pink-500',
            glowColor: 'rgba(139, 92, 246, 0.5)',
            fallbackImage: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=450&fit=crop'
        },
        {
            id: 'technology',
            name: 'Technology',
            icon: '💻',
            color: 'from-blue-500 via-cyan-500 to-teal-500',
            glowColor: 'rgba(59, 130, 246, 0.5)',
            fallbackImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=450&fit=crop'
        },
        {
            id: 'business',
            name: 'Business',
            icon: '📊',
            color: 'from-green-500 via-emerald-500 to-teal-500',
            glowColor: 'rgba(16, 185, 129, 0.5)',
            fallbackImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop'
        },
        {
            id: 'health',
            name: 'Health',
            icon: '🏥',
            color: 'from-red-500 via-pink-500 to-rose-500',
            glowColor: 'rgba(239, 68, 68, 0.5)',
            fallbackImage: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=450&fit=crop'
        },
        {
            id: 'science',
            name: 'Science',
            icon: '🧪',
            color: 'from-purple-500 via-violet-500 to-indigo-500',
            glowColor: 'rgba(139, 92, 246, 0.5)',
            fallbackImage: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=450&fit=crop'
        },
        {
            id: 'entertainment',
            name: 'Entertainment',
            icon: '🎬',
            color: 'from-pink-500 via-rose-500 to-red-500',
            glowColor: 'rgba(236, 72, 153, 0.5)',
            fallbackImage: 'https://images.unsplash.com/photo-1574267432644-f610a4b6a4c5?w=800&h=450&fit=crop'
        },
        {
            id: 'sports',
            name: 'Sports',
            icon: '⚽',
            color: 'from-orange-500 via-amber-500 to-yellow-500',
            glowColor: 'rgba(249, 115, 22, 0.5)',
            fallbackImage: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=450&fit=crop'
        },
    ];

    const modes = [
        { id: 'trending', name: 'Trending', icon: '🔥', description: 'Most popular globally' },
        { id: 'for-you', name: 'For You', icon: '🎯', description: 'AI-personalized' },
    ];

    useEffect(() => {
        const handleScroll = () => {
            setScrollY(window.scrollY);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const removeDuplicates = (articlesArray) => {
        const seen = new Set();
        return articlesArray.filter(article => {
            const duplicate = seen.has(article.url);
            seen.add(article.url);
            return !duplicate;
        });
    };

    const getFallbackImage = (categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        return category?.fallbackImage || categories[0].fallbackImage;
    };

    const fetchNews = async () => {
        setLoading(true);
        setError(null);

        if (contentRef.current) {
            contentRef.current.style.opacity = '0';
            contentRef.current.style.transform = 'translateY(20px)';
        }

        try {
            let allArticles = [];
            const endpoint = recommendationMode === 'for-you'
                ? `/ai/trending-news/?type=for_you&topic=${selectedCategory}`
                : `/ai/trending-news/?topic=${selectedCategory}`;

            console.log(`Fetching news: ${endpoint}`);
            const response = await api.get(endpoint);
            allArticles = response.data.results || [];

            console.log(`Received ${allArticles.length} articles from API`);

            // Add fallback images and normalize data
            const articlesWithImages = allArticles.map(article => ({
                ...article,
                image: article.image || getFallbackImage(selectedCategory),
                category: article.category || article.topic || selectedCategory,
                source: article.source || 'News',
                description: article.description || article.body?.substring(0, 200) || 'Read more to discover insights on this trending topic.'
            }));

            const uniqueArticles = removeDuplicates(articlesWithImages);

            setTimeout(() => {
                setArticles(uniqueArticles);
                if (contentRef.current) {
                    contentRef.current.style.opacity = '1';
                    contentRef.current.style.transform = 'translateY(0)';
                }
            }, 300);

            // Cache the results
            localStorage.setItem(`news_${selectedCategory}_${recommendationMode}`, JSON.stringify(uniqueArticles));
            localStorage.setItem('lastNewsCategory', selectedCategory);
        } catch (error) {
            console.error('Failed to fetch news:', error);
            setError(error.message);

            // Try to load from cache
            const cached = localStorage.getItem(`news_${selectedCategory}_${recommendationMode}`);
            if (cached) {
                const cachedArticles = JSON.parse(cached);
                setArticles(cachedArticles);
                console.log(`Loaded ${cachedArticles.length} articles from cache`);
            } else {
                setArticles([]);
            }
        } finally {
            setTimeout(() => setLoading(false), 400);
        }
    };

    useEffect(() => {
        fetchNews();
    }, [selectedCategory, recommendationMode]);

    useEffect(() => {
        const lastCategory = localStorage.getItem('lastNewsCategory');
        if (lastCategory && categories.find(c => c.id === lastCategory)) {
            setSelectedCategory(lastCategory);
        }
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (customTopic.trim()) {
            setSelectedCategory(customTopic.toLowerCase());
        }
    };

    const handleArticleClick = (article) => {
        const params = new URLSearchParams();
        params.append('url', article.url);
        params.append('title', article.title);
        params.append('image', article.image || '');
        params.append('source', article.source || '');
        params.append('topic', article.category || selectedCategory);
        if (article.description) {
            params.append('desc', article.description);
        }
        navigate(`/news/view?${params.toString()}`);
    };

    const currentCategory = categories.find(c => c.id === selectedCategory) || categories[0];
    const currentMode = modes.find(m => m.id === recommendationMode) || modes[0];
    const parallaxOffset = scrollY * 0.3;

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
            {/* Dynamic Animated Background */}
            <div className="fixed inset-0 z-0">
                <div
                    className="absolute inset-0 opacity-30 transition-transform duration-1000 ease-out"
                    style={{
                        background: `
              radial-gradient(ellipse at ${20 + parallaxOffset * 0.05}% ${30 + parallaxOffset * 0.03}%, rgba(237, 233, 254, 0.4) 0%, transparent 50%),
              radial-gradient(ellipse at ${80 - parallaxOffset * 0.04}% ${70 - parallaxOffset * 0.02}%, rgba(224, 242, 254, 0.3) 0%, transparent 50%),
              linear-gradient(135deg, rgba(243, 232, 255, 0.2) 0%, rgba(219, 234, 254, 0.2) 100%)
            `,
                        transform: `translateY(${parallaxOffset * 0.5}px)`
                    }}
                />
            </div>

            <Navbar />

            <div className="max-w-7xl mx-auto px-4 pt-24 pb-8 relative z-10">
                {/* Hero Header */}
                <div className="text-center mb-16 animate-fade-in-up">
                    <div className="inline-flex items-center gap-4 mb-6">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
                            <div className="relative w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-500">
                                <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 tracking-tight">
                            News & Discussions
                        </h1>
                    </div>
                    <p className="text-gray-500 text-lg font-medium tracking-widest uppercase" style={{ letterSpacing: '0.2em' }}>
                        Curated. Intentional. Premium.
                    </p>
                </div>

                {/* Recommendation Mode */}
                <div className="mb-12 max-w-2xl mx-auto">
                    <div className="relative bg-white/60 backdrop-blur-2xl rounded-3xl border border-white/20 p-2 shadow-2xl shadow-purple-500/10">
                        <div className="grid grid-cols-2 gap-2 relative">
                            {modes.map(mode => (
                                <button
                                    key={mode.id}
                                    onClick={() => setRecommendationMode(mode.id)}
                                    className={`relative px-8 py-5 rounded-2xl text-base font-bold transition-all duration-500 overflow-hidden group ${recommendationMode === mode.id
                                        ? 'text-white'
                                        : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    {recommendationMode === mode.id && (
                                        <>
                                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 animate-gradient" />
                                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 blur-xl opacity-50" />
                                        </>
                                    )}
                                    <span className="relative flex items-center justify-center gap-3">
                                        <span className={`text-2xl ${mode.id === 'trending' && recommendationMode === mode.id ? 'animate-flicker' : ''} ${mode.id === 'for-you' && recommendationMode === mode.id ? 'animate-pulse' : ''}`}>
                                            {mode.icon}
                                        </span>
                                        {mode.name}
                                    </span>
                                    {recommendationMode !== mode.id && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="mt-3 text-center">
                            <span className="text-xs text-gray-500 font-semibold bg-gray-100/80 px-4 py-2 rounded-full backdrop-blur-sm">
                                {currentMode.description}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Category Cards */}
                <div className="mb-12">
                    <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                        <span className="w-2 h-8 bg-gradient-to-b from-purple-600 to-indigo-600 rounded-full shadow-lg" />
                        Explore Categories
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {categories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => setSelectedCategory(category.id)}
                                className={`relative group p-6 rounded-3xl transition-all duration-500 transform ${selectedCategory === category.id
                                    ? 'scale-105'
                                    : 'hover:scale-105 bg-white/60 backdrop-blur-xl border border-white/20 shadow-lg hover:shadow-2xl'
                                    }`}
                                style={{
                                    background: selectedCategory === category.id
                                        ? `linear-gradient(135deg, var(--tw-gradient-stops))`
                                        : undefined,
                                    '--tw-gradient-from': selectedCategory === category.id ? category.color.split(' ')[0].replace('from-', '') : undefined,
                                    '--tw-gradient-to': selectedCategory === category.id ? category.color.split(' ')[2].replace('to-', '') : undefined,
                                }}
                            >
                                {selectedCategory === category.id && (
                                    <>
                                        <div className="absolute inset-0 rounded-3xl" style={{ boxShadow: `0 0 40px ${category.glowColor}` }} />
                                        <div className={`absolute inset-0 bg-gradient-to-br ${category.color} rounded-3xl`} />
                                    </>
                                )}
                                <div className="relative flex flex-col items-center gap-3">
                                    <span className={`text-4xl transform transition-transform duration-500 ${selectedCategory === category.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                                        {category.icon}
                                    </span>
                                    <span className={`text-sm font-bold transition-colors duration-300 ${selectedCategory === category.id ? 'text-white' : 'text-gray-700 group-hover:text-gray-900'}`}>
                                        {category.name}
                                    </span>
                                </div>
                                {selectedCategory === category.id && (
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full animate-pulse" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Premium Search Bar */}
                <form onSubmit={handleSearch} className="max-w-4xl mx-auto mb-16">
                    <div className="relative group">
                        <div className={`absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 ${searchFocused ? 'opacity-30' : ''}`} />
                        <div className="relative flex gap-4 bg-white/70 backdrop-blur-2xl rounded-3xl border border-white/20 p-3 shadow-2xl">
                            <div className="flex-1 relative">
                                <svg className={`absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 transition-all duration-300 ${searchFocused ? 'scale-110 text-purple-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder={searchFocused ? "What are you curious about?" : "Search any topic..."}
                                    value={customTopic}
                                    onChange={(e) => setCustomTopic(e.target.value)}
                                    onFocus={() => setSearchFocused(true)}
                                    onBlur={() => setSearchFocused(false)}
                                    className="w-full pl-16 pr-6 py-5 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-lg font-medium transition-all duration-300"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-10 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 active:scale-95 transform hover:scale-105"
                            >
                                Search
                            </button>
                        </div>
                    </div>
                </form>

                {/* Category Title Header */}
                {!loading && articles.length > 0 && (
                    <div className="mb-12 text-center">
                        <div className="inline-flex items-center gap-5 bg-white/70 backdrop-blur-2xl px-10 py-6 rounded-3xl shadow-2xl border border-white/20">
                            <span className="text-6xl animate-bounce-slow">{currentCategory.icon}</span>
                            <div className="text-left">
                                <h2 className="text-4xl font-black text-gray-900 tracking-tight">{currentCategory.name}</h2>
                                <p className="text-gray-500 font-semibold mt-2 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    {articles.length} {articles.length === 1 ? 'article' : 'articles'} curated for you
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                <div
                    ref={contentRef}
                    className="transition-all duration-700 ease-out"
                    style={{ opacity: 1, transform: 'translateY(0)' }}
                >
                    {loading ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="group">
                                    <div className="bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/20 shadow-xl">
                                        <div className="aspect-video bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse-slow relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
                                        </div>
                                        <div className="p-7 space-y-4">
                                            <div className="h-7 bg-gray-200 rounded-xl animate-pulse-slow w-3/4" />
                                            <div className="h-5 bg-gray-200 rounded-lg animate-pulse-slow w-full" />
                                            <div className="h-5 bg-gray-200 rounded-lg animate-pulse-slow w-5/6" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : articles.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {articles.map((article, idx) => {
                                const articleCategory = categories.find(
                                    c => c.id === (article.category?.toLowerCase() || selectedCategory)
                                ) || currentCategory;

                                return (
                                    <div
                                        key={`${article.url}-${idx}`}
                                        className="group cursor-pointer"
                                        onClick={() => handleArticleClick(article)}
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <div className="relative bg-white/60 backdrop-blur-2xl rounded-3xl overflow-hidden border border-white/20 shadow-xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-[1.02]">
                                            {/* Glow Effect */}
                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ boxShadow: `0 0 60px ${articleCategory.glowColor}` }} />

                                            {/* Image */}
                                            <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-700 overflow-hidden relative">
                                                <img
                                                    src={article.image}
                                                    alt={article.title}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                    crossOrigin="anonymous"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = getFallbackImage(articleCategory.id);
                                                    }}
                                                />

                                                {/* Gradient Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

                                                {/* Category Badge */}
                                                <div className={`absolute top-5 left-5 px-4 py-2.5 rounded-2xl text-xs font-black text-white bg-gradient-to-r ${articleCategory.color} shadow-2xl backdrop-blur-sm z-10 transform group-hover:scale-110 transition-all duration-500`}>
                                                    <span className="mr-1.5">{articleCategory.icon}</span>
                                                    {articleCategory.name}
                                                </div>

                                                {/* Source Badge */}
                                                <div className="absolute top-5 right-5 bg-black/80 backdrop-blur-xl text-white text-xs px-4 py-2.5 rounded-2xl font-bold z-10 border border-white/10 shadow-xl">
                                                    {article.source}
                                                </div>

                                                {/* AI Relevance Indicator */}
                                                <div className="absolute bottom-5 right-5 flex items-center gap-2 bg-white/20 backdrop-blur-xl px-3 py-2 rounded-full border border-white/20">
                                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                                    <span className="text-white text-xs font-bold">AI Curated</span>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-7 bg-gradient-to-b from-white/80 to-white/60">
                                                <h3 className="font-black text-gray-900 text-xl mb-4 line-clamp-2 group-hover:text-purple-600 transition-colors duration-300 leading-tight">
                                                    {article.title}
                                                </h3>
                                                <p className="text-gray-600 text-sm line-clamp-2 mb-5 leading-relaxed">
                                                    {article.description}
                                                </p>

                                                {/* AI Summary Hint */}
                                                <div className="mb-5 p-3 bg-purple-50/50 rounded-xl border border-purple-100/50">
                                                    <p className="text-xs text-purple-700 font-semibold flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                        </svg>
                                                        Why this matters: Trending in {articleCategory.name.toLowerCase()}
                                                    </p>
                                                </div>

                                                {/* Footer */}
                                                <div className="flex items-center justify-between pt-5 border-t-2 border-gray-100/50">
                                                    <span className="text-purple-600 font-black text-sm flex items-center gap-2 group-hover:gap-3 transition-all duration-300">
                                                        Read & Discuss
                                                        <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                                        </svg>
                                                    </span>
                                                    {article.published_at && (
                                                        <span className="text-xs text-gray-400 font-bold bg-gray-100/80 px-4 py-2 rounded-full backdrop-blur-sm">
                                                            {new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-24">
                            <div className="max-w-2xl mx-auto bg-white/70 backdrop-blur-2xl rounded-3xl border border-white/20 p-20 shadow-3xl">
                                <div className="relative inline-block mb-10">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl blur-2xl opacity-30" />
                                    <div className="relative w-32 h-32 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-3xl flex items-center justify-center shadow-2xl">
                                        <span className="text-7xl">{currentCategory.icon}</span>
                                    </div>
                                </div>
                                <h3 className="text-4xl font-black text-gray-900 mb-5">Loading Fresh Content...</h3>
                                <p className="text-gray-500 mb-10 text-lg leading-relaxed">
                                    {error ? `Error: ${error}. ` : ''}We're fetching the latest {currentCategory.name.toLowerCase()} news for you.
                                </p>

                                <div className="space-y-5">
                                    <p className="text-sm font-bold text-gray-700 uppercase tracking-widest">Try These Categories</p>
                                    <div className="flex flex-wrap gap-4 justify-center">
                                        {categories
                                            .filter(c => c.id !== selectedCategory)
                                            .slice(0, 3)
                                            .map(category => (
                                                <button
                                                    key={category.id}
                                                    onClick={() => setSelectedCategory(category.id)}
                                                    className="px-8 py-4 bg-white/80 hover:bg-white rounded-2xl text-sm font-bold text-gray-700 transition-all border-2 border-gray-200 hover:border-gray-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl backdrop-blur-sm"
                                                >
                                                    {category.icon} {category.name}
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-flicker {
          animation: flicker 1.5s ease-in-out infinite;
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .shadow-3xl {
          box-shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.3);
        }
      `}</style>
        </div>
    );
};

export default TrendingNews;
