import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    ShareIcon,
    BookmarkIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import Layout from '../components/layout/Layout';
import VoiceReader from '../components/VoiceReader';
import NewsSummarizer from '../components/NewsSummarizer';
import NewsDiscussion from '../components/NewsDiscussion';
import { API_URL } from '../config/env';

/**
 * News Article Detail Page
 * Shows full article with Voice Reader, AI Summary, and Discussion
 */
const NewsArticleDetail = () => {
    const { articleId } = useParams();
    const navigate = useNavigate();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadArticle();
    }, [articleId]);

    const loadArticle = () => {
        // Decode the article ID (it's URL-encoded to handle slashes)
        const decodedId = decodeURIComponent(articleId);
        console.log('🔍 Loading article with ID:', decodedId);

        // Get article from cache or URL params
        const cached = localStorage.getItem('news_feed_live_v10_p1'); // v10

        if (!cached) {
            console.warn('⚠️ No cached news found. Cache key: news_feed_live_v10_p1');
            setLoading(false);
            return;
        }

        try {
            const { data } = JSON.parse(cached);
            console.log('📦 Cache loaded. Total articles:', data.all?.length);

            // Match by decoded ID or title
            const found = data.all.find(a =>
                a.id === decodedId ||
                a.id === articleId ||
                a.title === decodeURIComponent(articleId)
            );

            if (found) {
                console.log('✅ Article found:', found.title);
                setArticle(found);
                // If content is short/missing, try to fetch full content from backend
                if ((!found.content || found.content.length < 500) && found.url) {
                    fetchFullContent(found.url);
                }
            } else {
                console.error('❌ Article not found in cache. Looking for ID:', decodedId);
                console.log('Available article IDs:', data.all?.map(a => a.id).slice(0, 5));
            }
        } catch (e) {
            console.error('❌ Failed to load article:', e);
        }

        setLoading(false);
    };

    const fetchFullContent = async (url) => {
        try {
            // Fetch full article content from backend scraper
            // No auth required - endpoint is public
            const res = await fetch(`${API_URL}/news/fetch-content/?url=${encodeURIComponent(url)}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.content) {
                    setArticle(prev => ({ ...prev, content: data.content }));
                }
            } else {
                console.warn('Failed to fetch content:', res.status, res.statusText);
            }
        } catch (e) {
            console.warn('Failed to fetch full content:', e);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: article.title,
                    text: article.description,
                    url: article.url
                });
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(article.url);
            alert('Link copied to clipboard!');
        }
    };

    const handleBookmark = () => {
        const bookmarks = JSON.parse(localStorage.getItem('bookmarked_articles') || '[]');
        const exists = bookmarks.find(b => b.id === article.id);

        if (exists) {
            const updated = bookmarks.filter(b => b.id !== article.id);
            localStorage.setItem('bookmarked_articles', JSON.stringify(updated));
            alert('Removed from bookmarks');
        } else {
            bookmarks.push(article);
            localStorage.setItem('bookmarked_articles', JSON.stringify(bookmarks));
            alert('Added to bookmarks');
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-600 font-bold">Loading article...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!article) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Article not found</h2>
                        <p className="text-gray-600 mb-6">The article you're looking for doesn't exist.</p>
                        <button
                            onClick={() => navigate('/news-dashboard')}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                        >
                            Back to News Dashboard
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
                <div className="max-w-5xl mx-auto px-6 py-8">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate('/news-dashboard')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold mb-6 transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        Back to News Dashboard
                    </button>

                    {/* Article Header */}
                    <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 mb-6">
                        {/* Featured Image */}
                        {article.image && (
                            <div className="relative h-96 overflow-hidden">
                                <img
                                    src={article.image}
                                    alt={article.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                                {/* Category Badge */}
                                <div className="absolute top-6 left-6">
                                    <span className="px-4 py-2 bg-white/90 backdrop-blur-xl rounded-full text-sm font-black text-indigo-600 shadow-lg">
                                        {article.category}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Article Info */}
                        <div className="p-8">
                            <h1 className="text-4xl font-black text-gray-900 leading-tight mb-4">
                                {article.title}
                            </h1>

                            <div className="flex items-center gap-6 text-sm text-gray-600 mb-6">
                                <div className="flex items-center gap-2">
                                    <img
                                        src={article.source.logo}
                                        alt={article.source.name}
                                        className="w-6 h-6 rounded-full"
                                        onError={(e) => e.target.style.display = 'none'}
                                    />
                                    <span className="font-bold">{article.source.name}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <ClockIcon className="w-4 h-4" />
                                    <span>{article.timeAgo}</span>
                                </div>

                                {article.author && (
                                    <span>By {article.author}</span>
                                )}
                            </div>

                            {/* Description */}
                            <p className="text-lg text-gray-700 leading-relaxed mb-6 font-medium border-b border-gray-100 pb-6">
                                {article.description}
                            </p>


                            {/* Extended content removed - users can click "Read Full Article" button below */}


                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleShare}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700 transition-all"
                                >
                                    <ShareIcon className="w-5 h-5" />
                                    Share
                                </button>

                                <button
                                    onClick={handleBookmark}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700 transition-all"
                                >
                                    <BookmarkIcon className="w-5 h-5" />
                                    Bookmark
                                </button>

                                <a
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg"
                                >
                                    Read Full Article
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Voice Reader */}
                    <div className="mb-6">
                        <VoiceReader article={article} />
                    </div>

                    {/* AI Summary */}
                    <div className="mb-6">
                        <NewsSummarizer article={article} />
                    </div>

                    {/* Discussion */}
                    <div>
                        <NewsDiscussion
                            articleId={article.id}
                            articleUrl={article.url}
                        />
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default NewsArticleDetail;
