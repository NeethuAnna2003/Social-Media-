import React, { useState, useEffect } from 'react';
import {
    SparklesIcon,
    ArrowPathIcon,
    FunnelIcon,
    Squares2X2Icon
} from '@heroicons/react/24/outline';
import Layout from '../components/layout/Layout';
import NewsCard from '../components/NewsCard';
import ContextWidgets from '../components/ContextWidgets';
import { getNewsFeed } from '../utils/newsService';
import { CATEGORIES } from '../utils/newsClassifier';
import { useAuth } from '../context/AuthContext';

/**
 * Get time-based greeting
 */
function getGreeting() {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 22) return 'Good Evening';
    return 'Good Night';
}

/**
 * News Dashboard - Smart Feed UI
 */
const NewsDashboard = () => {
    const { user } = useAuth();
    const [newsData, setNewsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [refreshing, setRefreshing] = useState(false);

    // Fetch news on mount
    useEffect(() => {
        fetchNews();
    }, []);

    const fetchNews = async (forceRefresh = false) => {
        try {
            setLoading(!forceRefresh);
            setRefreshing(forceRefresh);
            setError(null);

            const data = await getNewsFeed({ forceRefresh });
            setNewsData(data);
        } catch (err) {
            console.error('News fetch error:', err);
            setError('Failed to load news feed. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        fetchNews(true);
    };

    const handleCategoryFilter = (category) => {
        setSelectedCategory(category);
    };

    // Get filtered articles
    const getFilteredArticles = () => {
        if (!newsData) return [];

        // Debug: Log categorized data
        console.log('📊 Categorized Data:', {
            all: newsData.all?.length,
            categorized: Object.keys(newsData.categorized || {}).map(cat => ({
                category: cat,
                count: newsData.categorized[cat]?.length || 0
            })),
            selectedCategory,
            filteredCount: selectedCategory === 'all'
                ? newsData.all?.length
                : newsData.categorized[selectedCategory]?.length || 0
        });

        if (selectedCategory === 'all') {
            return newsData.all;
        }

        return newsData.categorized[selectedCategory] || [];
    };

    const filteredArticles = getFilteredArticles();
    const greeting = getGreeting();
    const userName = user?.first_name || user?.username || 'User';

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
                <div className="max-w-[1600px] mx-auto px-6 py-8">
                    {/* Header Section */}
                    <div className="mb-8">
                        {/* Greeting */}
                        <div className="mb-6">
                            <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-2">
                                {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">{userName}</span>
                            </h1>
                            <p className="text-gray-500 text-lg font-medium">
                                Here's what's happening in the world today
                            </p>
                        </div>

                        {/* Context Widgets */}
                        <ContextWidgets userName={userName} />

                        {/* Category Filters & Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
                            {/* Category Pills */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={() => handleCategoryFilter('all')}
                                    className={`px-5 py-2.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-300 ${selectedCategory === 'all'
                                        ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:shadow-md'
                                        }`}
                                >
                                    <Squares2X2Icon className="w-4 h-4 inline mr-2" />
                                    All News
                                </button>

                                {Object.values(CATEGORIES).map((category) => {
                                    const count = newsData?.categorized[category]?.length || 0;

                                    return (
                                        <button
                                            key={category}
                                            onClick={() => handleCategoryFilter(category)}
                                            className={`px-4 py-2.5 rounded-2xl font-bold text-sm transition-all duration-300 ${selectedCategory === category
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                                : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-200 hover:shadow-md'
                                                }`}
                                        >
                                            {category}
                                            {count > 0 && (
                                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-black ${selectedCategory === category
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Refresh Button */}
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-2xl font-bold text-sm text-gray-700 hover:border-gray-300 hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                {refreshing ? 'Refreshing...' : 'Refresh Feed'}
                            </button>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="relative mb-6">
                                <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <SparklesIcon className="w-8 h-8 text-indigo-600 animate-pulse" />
                                </div>
                            </div>
                            <p className="text-gray-600 font-bold text-lg animate-pulse">
                                Curating your personalized feed...
                            </p>
                            <p className="text-gray-400 text-sm mt-2">
                                AI is analyzing and categorizing the latest news
                            </p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="p-6 bg-red-50 rounded-full mb-4">
                                <FunnelIcon className="w-12 h-12 text-red-500" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">
                                Oops! Something went wrong
                            </h3>
                            <p className="text-gray-600 mb-6">{error}</p>
                            <button
                                onClick={() => fetchNews(true)}
                                className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-black transition-all shadow-lg"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* News Feed */}
                    {!loading && !error && filteredArticles.length > 0 && (
                        <div className="space-y-8">
                            {/* Feed Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 rounded-xl">
                                        <SparklesIcon className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900">
                                            {selectedCategory === 'all' ? 'Your Smart Feed' : `${selectedCategory} News`}
                                        </h2>
                                        <p className="text-sm text-gray-500 font-medium">
                                            {filteredArticles.length} articles • Updated {new Date().toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Vertical Grid Layout (Downwards) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6 animate-fade-in-up">
                                {filteredArticles.map((article, index) => (
                                    <NewsCard
                                        key={article.id}
                                        article={article}
                                        index={index}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && !error && filteredArticles.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="p-6 bg-gray-100 rounded-full mb-4">
                                <FunnelIcon className="w-12 h-12 text-gray-400" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">
                                No articles found
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Try selecting a different category or refresh the feed
                            </p>
                            <button
                                onClick={() => handleCategoryFilter('all')}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-lg"
                            >
                                View All News
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Scrollbar Styles */}
            <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

            {/* Version Badge for Verification */}
            <div className="text-center py-6 text-gray-400 text-xs font-mono">
                System v5.0 • Live NewsAPI • AI Images Enabled
            </div>
        </Layout>
    );
};

export default NewsDashboard;
