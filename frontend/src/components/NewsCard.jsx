import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategoryColor, getCategoryIcon } from '../utils/newsClassifier';
import { ClockIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

const NewsCard = ({ article, index }) => {
    const navigate = useNavigate();
    const colors = getCategoryColor(article.category);
    const icon = getCategoryIcon(article.category);

    // Version marker - verify latest code is loaded
    React.useEffect(() => {
        if (index === 0) {
            console.log('✅ NewsCard v7.0 LOADED - /news-dashboard routing active');
        }
    }, [index]);

    // Stagger animation delay
    const animationDelay = `${index * 100}ms`;

    // Intelligent Image Resolution
    const getInitialImage = (url, headline, category) => {
        // Trust the Service provided URL (could be original or AI)
        if (url && url.startsWith('http')) return url;

        // Fallback: Generate AI Image
        const cleanPrompt = (headline || '').substring(0, 50);
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}%20${category}%20news?width=800&height=600&nologo=true`;
    };

    const [imageSrc, setImageSrc] = useState(getInitialImage(article.image, article.title, article.category));
    const [imageError, setImageError] = useState(false);

    const handleImageError = () => {
        if (!imageError) {
            // First Fallback: Try AI Image if original failed
            const cleanPrompt = (article.title || '').substring(0, 50);
            const fallback = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=800&height=600&nologo=true&seed=${Math.random()}`;
            setImageSrc(fallback);
            setImageError(true);
        } else {
            // Final Fallback: Reliable Picsum (Nature/Abstract)
            const randomId = Math.floor(Math.random() * 100);
            setImageSrc(`https://picsum.photos/id/${randomId}/800/600`);
        }
    };


    const handleCardClick = () => {
        // Validate article has required data
        if (!article || !article.id) {
            console.error('❌ Cannot navigate: Article or article.id is missing', article);
            return;
        }

        // Encode the article ID to handle URLs with slashes
        const encodedId = encodeURIComponent(article.id);

        console.log('🔵 Card clicked - Navigating to article:', {
            id: article.id,
            encodedId: encodedId,
            url: `/news-dashboard/${encodedId}`
        });

        // Navigate to article detail page with encoded ID
        navigate(`/news-dashboard/${encodedId}`);
    };

    return (
        <div
            className="news-card group relative w-full h-[420px] bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer border border-gray-100 hover:border-indigo-200 hover:-translate-y-2"
            style={{ animationDelay }}
            onClick={handleCardClick}
        >
            {/* Image Section */}
            <div className="relative h-[200px] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                <img
                    src={imageSrc}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                    onError={handleImageError}
                />

                {/* Category Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className={`px-3 py-1.5 rounded-full backdrop-blur-xl bg-white/90 border ${colors.border} shadow-lg flex items-center gap-2`}>
                        <span className="text-base">{icon}</span>
                        <span className={`text-xs font-black uppercase tracking-wider ${colors.text}`}>
                            {article.category}
                        </span>
                    </div>
                </div>

                {/* Source Logo */}
                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-xl shadow-lg p-2 border border-gray-100">
                    <img
                        src={article.source.logo}
                        alt={article.source.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                            e.target.onerror = null; // Prevent infinite loop
                            e.target.src = 'https://cdn-icons-png.flaticon.com/512/2537/2537926.png'; // Generic News Icon
                            e.target.style.opacity = '0.5';
                        }}
                    />
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Content Section */}
            <div className="p-6 flex flex-col h-[220px]">
                {/* Source & Time */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                            {article.source.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                        <ClockIcon className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{article.timeAgo}</span>
                    </div>
                </div>

                {/* Headline */}
                <h3 className="text-base font-black text-gray-900 leading-tight mb-3 line-clamp-3 group-hover:text-indigo-600 transition-colors">
                    {article.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-4 flex-1">
                    {article.description}
                </p>

                {/* Read More Button - EXTERNAL LINK FIX */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                            e.stopPropagation(); // 🛑 STOP propagation to parent card
                            console.log('✅ EXTERNAL LINK FIX ACTIVE - Opening:', article.url);
                        }}
                        className="text-xs font-black text-indigo-600 uppercase tracking-wider group-hover:text-indigo-700 flex items-center gap-1 hover:underline cursor-pointer z-10 relative"
                    >
                        Read Full Story
                        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </a>

                    {/* Author */}
                    {article.author && (
                        <span className="text-xs text-gray-400 italic">
                            by {article.author.split(',')[0]}
                        </span>
                    )}
                </div>
            </div>

            {/* Hover Effect Accent */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
        </div>
    );
};

export default NewsCard;
