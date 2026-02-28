import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

// --- HELPER FUNCTIONS ---

const normalizeSummary = (raw, fallbackText, title) => {
    if (!raw || typeof raw !== 'object') return null;

    // New Schema: tldr, key_takeaways, impact, what_next, headline, reading_time
    // FallbackSchema: headline_in_one_line, quick_take, why_it_matters

    const tldr = raw.tldr || raw.headline_in_one_line || title;
    const key_takeaways = Array.isArray(raw.key_takeaways) ? raw.key_takeaways :
        Array.isArray(raw.quick_take) ? raw.quick_take :
            Array.isArray(raw.key_points) ? raw.key_points : [];

    const impact = raw.impact || raw.why_it_matters || raw.why || 'Significant impact on current events.';
    const what_next = raw.what_next || raw.what_to_watch_next || raw.one_question_to_think_about || '';

    // Reading time & Saved
    const originalTime = raw.reading_time || raw.time_to_read_original || '4 min read';

    // Calculate saved time approx
    const minutes = parseInt(originalTime) || 4;
    const saved = Math.max(1, minutes - 1) + ' min';

    return {
        headline: raw.headline || title,
        tldr,
        key_takeaways,
        impact,
        what_next,
        reading_time: originalTime,
        time_saved: saved
    };
};

const getClassificationBadge = (cls) => {
    switch (cls?.toLowerCase()) {
        case 'informative': return { label: '💡 Informative', color: 'bg-blue-100 text-blue-700 border-blue-200' };
        case 'opinion': return { label: '🗣️ Opinion', color: 'bg-gray-100 text-gray-700 border-gray-200' };
        case 'question': return { label: '❓ Question', color: 'bg-orange-100 text-orange-700 border-orange-200' };
        case 'low_value': return { label: '⚠️ Low Value', color: 'bg-red-50 text-red-500 border-red-100' };
        default: return { label: 'comment', color: 'bg-gray-50 text-gray-600' };
    }
};

// --- SUB-COMPONENT: COMMENT ITEM (RECURSIVE) ---

const CommentItem = ({ comment, onReply, onVote, depth = 0 }) => {
    const [replying, setReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [expanded, setExpanded] = useState(true);
    const { user } = useAuth();

    const clsBadge = getClassificationBadge(comment.classification);
    const isOwner = user?.username === comment.user_name;

    const handleSubmitReply = (e) => {
        e.preventDefault();
        if (replyText.trim()) {
            onReply(comment.id, replyText);
            setReplying(false);
            setReplyText('');
        }
    };

    const handleVote = (val) => {
        onVote(comment.id, val);
    };

    return (
        <div className={`relative ${depth > 0 ? 'ml-6 md:ml-12 mt-4' : 'mt-6'}`}>
            {depth > 0 && (
                <div className="absolute -left-6 top-6 w-6 h-[1px] bg-gray-300"></div>
            )}

            <div className={`bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md ${comment.classification === 'informative' ? 'border-blue-200' : 'border-gray-100'}`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${isOwner ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gray-400'}`}>
                            {comment.user_avatar ? <img src={comment.user_avatar} className="w-full h-full rounded-full" /> : comment.user_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                            <span className="font-bold text-gray-900 text-sm">{comment.user_name}</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <span className={`text-xs px-2 py-1 rounded-md border font-medium ${clsBadge.color}`}>
                            {clsBadge.label}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <p className="text-gray-800 text-sm leading-relaxed mb-4">
                    {comment.content}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-4 border-t border-gray-50 pt-3">
                    {/* Votes */}
                    <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                        <button
                            onClick={() => handleVote(1)}
                            className={`p-1 rounded hover:bg-white transition-colors ${comment.is_voted === 1 ? 'text-orange-600' : 'text-gray-500'}`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <span className={`text-xs font-bold min-w-[16px] text-center ${comment.score > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                            {comment.score}
                        </span>
                        <button
                            onClick={() => handleVote(-1)}
                            className={`p-1 rounded hover:bg-white transition-colors ${comment.is_voted === -1 ? 'text-purple-600' : 'text-gray-500'}`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>

                    <button
                        onClick={() => setReplying(!replying)}
                        className="text-xs font-bold text-gray-500 hover:text-purple-600 flex items-center gap-1 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                        Reply
                    </button>
                </div>

                {/* Reply Form */}
                {replying && (
                    <form onSubmit={handleSubmitReply} className="mt-4 flex gap-3 animate-fade-in">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-xs text-gray-500">
                            You
                        </div>
                        <div className="flex-1">
                            <input
                                type="text"
                                className="w-full text-sm border-b-2 border-gray-200 focus:border-purple-500 outline-none py-1 bg-transparent transition-colors"
                                placeholder={`Reply to ${comment.user_name}...`}
                                autoFocus
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button type="button" onClick={() => setReplying(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                                <button type="submit" disabled={!replyText.trim()} className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg font-bold disabled:opacity-50">Reply</button>
                            </div>
                        </div>
                    </form>
                )}
            </div>

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="relative">
                    {depth < 3 && <div className="absolute left-[-1.5rem] md:left-[-3rem] top-0 bottom-0 width-[1px] border-l border-dashed border-gray-200"></div>}
                    {comment.replies.map(reply => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            onReply={onReply}
                            onVote={onVote}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---

const NewsDetail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Article Info
    const articleUrl = searchParams.get('url');
    const articleTitle = searchParams.get('title') || 'News Article';
    const articleImage = searchParams.get('image');
    const articleSource = searchParams.get('source');
    const articleTopic = searchParams.get('topic') || 'general';
    const articleDesc = searchParams.get('desc') || '';

    // State
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    // AI Summary State
    const [aiSummary, setAiSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [summaryExpanded, setSummaryExpanded] = useState(true);
    const [discussionQuestions, setDiscussionQuestions] = useState(null);
    const [summaryMode, setSummaryMode] = useState('detailed');

    // Derived Summary
    const summaryData = normalizeSummary(aiSummary, [articleTitle, articleDesc].join('. '), articleTitle);

    const handleAddToStory = async () => {
        if (!articleUrl || !articleTitle) {
            setToast({ message: "Missing article information!", type: "error" });
            return;
        }

        setToast({ message: "Creating story...", type: "info" });

        try {
            // Truncate title to fit database limit (200 chars)
            const truncatedTitle = articleTitle.length > 180
                ? articleTitle.substring(0, 180) + '...'
                : articleTitle;

            // Truncate description to reasonable length
            const truncatedDesc = articleDesc && articleDesc.length > 300
                ? articleDesc.substring(0, 300) + '...'
                : articleDesc || '';

            // Create link story directly without image upload
            const formData = new FormData();
            formData.append('story_type', 'link');
            formData.append('link_url', window.location.href); // Full page URL
            formData.append('link_title', truncatedTitle);

            // Only add optional fields if they have values
            if (truncatedDesc) {
                formData.append('link_description', truncatedDesc);
            }
            if (articleImage) {
                formData.append('link_thumbnail', articleImage);
            }
            if (articleSource) {
                formData.append('link_source', articleSource);
            }

            console.log('Creating link story:', {
                story_type: 'link',
                link_title: truncatedTitle,
                link_url: window.location.href,
                link_source: articleSource
            });

            const response = await api.post('/stories/create/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setToast({ message: "Story shared successfully!", type: "success" });
            console.log('Link story created:', response.data);
        } catch (error) {
            console.error("Failed to create story:", error);
            console.error("Error response:", error.response?.data);

            // Extract detailed error message
            let errorMsg = "Failed to share story. Please try again.";

            if (error.response?.data) {
                const errors = error.response.data;

                // Check for specific field errors
                if (errors.link_title) {
                    errorMsg = `Title error: ${errors.link_title[0]}`;
                } else if (errors.link_url) {
                    errorMsg = `URL error: ${errors.link_url[0]}`;
                } else if (errors.story_type) {
                    errorMsg = `Type error: ${errors.story_type[0]}`;
                } else if (errors.detail) {
                    errorMsg = errors.detail;
                } else if (errors.non_field_errors) {
                    errorMsg = errors.non_field_errors[0];
                } else {
                    // Show first error from any field
                    const firstError = Object.values(errors)[0];
                    if (Array.isArray(firstError)) {
                        errorMsg = firstError[0];
                    } else if (typeof firstError === 'string') {
                        errorMsg = firstError;
                    }
                }
            }

            setToast({ message: errorMsg, type: "error" });
        }
    };

    useEffect(() => {
        if (!articleUrl) {
            navigate('/news');
            return;
        }

        // Track View
        const trackView = async () => {
            try {
                await api.post('/news/track/', {
                    topic: articleTopic,
                    time_spent: 30
                });
            } catch (err) {
                console.error("Tracking error", err);
            }
        };
        trackView();
        fetchComments();

        // Initial fallback summary
        if (!aiSummary) {
            // Placeholder while loading
        }
        fetchAISummary();
    }, [articleUrl, articleTopic]);

    const fetchAISummary = async () => {
        if (!aiSummary) setLoadingSummary(true);
        try {
            const res = await api.post('/ai/summarize-news/', {
                article_url: articleUrl,
                title: articleTitle
            });
            setAiSummary(res.data); // Store raw data, normalize on render

            // Fetch Questions
            const questionsRes = await api.post('/ai/discussion-questions/', { article_url: articleUrl });
            setDiscussionQuestions(questionsRes.data);

        } catch (err) {
            console.error("Failed to load AI summary", err);
            // Fallback
            setAiSummary({ tldr: articleDesc, headline: articleTitle });
        } finally {
            setLoadingSummary(false);
        }
    };

    const fetchComments = async (sort = 'insightful') => {
        try {
            const res = await api.get(`/news/comments/?url=${encodeURIComponent(articleUrl)}&sort=${sort}`);
            setComments(res.data);
        } catch (err) {
            console.error("Failed to load comments", err);
        } finally {
            setLoadingComments(false);
        }
    };

    const handlePostComment = async (parentId = null, content = null) => {
        const textToPost = content || newComment;
        if (!textToPost?.trim()) return;

        if (!parentId) setSubmitting(true); // Only show global submitting for main comment

        try {
            const payload = {
                url: articleUrl,
                title: articleTitle,
                image_url: articleImage,
                source_name: articleSource,
                topic: articleTopic,
                content: textToPost,
                parent_id: parentId
            };

            const res = await api.post('/news/comments/', payload);

            // Optimistic update or refresh
            // Ideally we insert the new comment into the tree
            // For simplicity, just refetch for now to handle nesting correctly
            await fetchComments();

            if (!parentId) setNewComment('');
            setToast({ message: "Comment posted! AI analyzing...", type: 'success' });
        } catch (err) {
            console.error("Failed to post comment", err);
            setToast({ message: "Failed to post", type: 'error' });
        } finally {
            if (!parentId) setSubmitting(false);
        }
    };

    const handleWrapperReply = (parentId, text) => {
        handlePostComment(parentId, text);
    };

    const handleVote = async (commentId, value) => {
        // Optimistic update locally? 
        // Complex with tree. Just call API then update particular node would be best.
        // For MVP, just call API and refresh or try to map.

        try {
            const res = await api.post('/news/vote/', { comment_id: commentId, value });

            // Helper to update tree deeply
            const updateTree = (nodes) => {
                return nodes.map(node => {
                    if (node.id === commentId) {
                        return { ...node, score: res.data.score, upvotes: res.data.upvotes, downvotes: res.data.downvotes, is_voted: value };
                    }
                    if (node.replies) {
                        return { ...node, replies: updateTree(node.replies) };
                    }
                    return node;
                });
            };

            setComments(prev => updateTree(prev));

        } catch (err) {
            console.error("Vote failed", err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pt-20"> {/* Reduced pt */}
            <Navbar />
            {toast && <Toast message={toast.message} onClose={() => setToast(null)} />}

            <div className="max-w-6xl mx-auto px-4 pb-12">
                {/* Header Actions */}
                <div className="flex items-center justify-between mb-2"> {/* Reduced mb */}
                    <button
                        onClick={() => navigate('/news')}
                        className="flex items-center text-gray-500 hover:text-black font-semibold transition-colors group"
                    >
                        <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to News
                    </button>

                    <div className="relative group">
                        <button
                            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all hover:shadow-md border border-gray-100"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                            Share
                        </button>

                        {/* Share Dropdown */}
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden transform opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-50 origin-top-right">
                            {/* WhatsApp */}
                            <button
                                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(articleTitle + ' - ' + window.location.href)}`, '_blank')}
                                className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 flex items-center gap-3 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                WhatsApp
                            </button>

                            {/* Share to Story */}
                            <button
                                onClick={handleAddToStory}
                                className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-pink-50 hover:text-pink-600 flex items-center gap-3 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                Add to Story
                            </button>

                            {/* Copy Link */}
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    setToast({ message: 'Link copied!', type: 'success' });
                                }}
                                className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors border-t border-gray-50"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                Copy Link
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8">
                    {/* LEFT COLUMN: Article & Summary (8 cols) */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* 1. Article Header Card */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            {articleImage && (
                                <div className="relative h-64 md:h-80 w-full">
                                    <img src={articleImage} alt={articleTitle} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                                        <div className="p-8 w-full">
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                                                    {articleTopic}
                                                </span>
                                                <span className="text-white/80 text-sm font-medium backdrop-blur-md px-3 py-1 rounded-full bg-black/30">
                                                    {articleSource}
                                                </span>
                                            </div>
                                            <h1 className="text-2xl md:text-4xl font-black text-white leading-tight shadow-black drop-shadow-lg">
                                                {articleTitle}
                                            </h1>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="p-6 md:p-8 flex items-center justify-between bg-white">
                                <p className="text-gray-500 text-sm">Read full story at source for more details.</p>
                                <a href={articleUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-purple-600 font-bold hover:underline">
                                    Read Source <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                            </div>
                        </div>

                        {/* 2. AI Summary Section */}
                        <div className="bg-white rounded-3xl shadow-lg border border-purple-100 overflow-hidden relative">
                            {/* Decorative header bg */}
                            <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 p-1"></div>

                            <div className="p-6 md:p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-purple-500/30 text-white">
                                            ✨
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900">AI Intelligence</h2>
                                            <p className="text-gray-500 text-sm">Summarized in <span className="font-bold text-green-600">{summaryData?.reading_time || "4 min"}</span></p>
                                        </div>
                                    </div>

                                    <div className="flex bg-gray-100 p-1 rounded-xl">
                                        <button
                                            onClick={() => setSummaryMode('tldr')}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${summaryMode === 'tldr' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            TL;DR
                                        </button>
                                        <button
                                            onClick={() => setSummaryMode('detailed')}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${summaryMode === 'detailed' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Deep Dive
                                        </button>
                                    </div>
                                </div>

                                {loadingSummary && !summaryData?.tldr ? (
                                    <div className="space-y-4 animate-pulse">
                                        <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                                        <div className="h-4 bg-gray-100 rounded w-full"></div>
                                        <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-8 animate-fade-in-up">
                                        {/* TL;DR Block */}
                                        <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100">
                                            <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-3">THE GIST</h3>
                                            <p className="text-lg font-medium text-gray-800 leading-relaxed">
                                                {summaryData?.tldr}
                                            </p>
                                        </div>

                                        {/* Detailed Points */}
                                        {summaryMode === 'detailed' && (
                                            <>
                                                <div className="grid md:grid-cols-2 gap-6">
                                                    <div>
                                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">KEY TAKEAWAYS</h3>
                                                        <ul className="space-y-3">
                                                            {summaryData?.key_takeaways.map((pt, i) => (
                                                                <li key={i} className="flex items-start gap-3">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 flex-shrink-0"></span>
                                                                    <span className="text-gray-700 leading-relaxed">{pt}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div>
                                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">WHY IT MATTERS</h3>
                                                        <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                            {summaryData?.impact}
                                                        </p>
                                                    </div>
                                                </div>

                                                {summaryData?.what_next && (
                                                    <div className="border-t border-gray-100 pt-6">
                                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">WHAT TO WATCH</h3>
                                                        <div className="flex items-start gap-3 text-gray-600 italic">
                                                            <span className="text-xl">🔮</span>
                                                            <p>{summaryData?.what_next}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Discussion Section */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black text-gray-900">Discussion</h3>
                                <div className="flex gap-2 text-sm">
                                    <button onClick={() => fetchComments('top')} className="px-3 py-1 hover:bg-gray-100 rounded-lg text-gray-600 font-medium">Top</button>
                                    <button onClick={() => fetchComments('new')} className="px-3 py-1 hover:bg-gray-100 rounded-lg text-gray-600 font-medium">Newest</button>
                                    <button onClick={() => fetchComments('insightful')} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg font-bold">Insightful</button>
                                </div>
                            </div>

                            {/* Main Input */}
                            <form onSubmit={(e) => { e.preventDefault(); handlePostComment(); }} className="mb-10 relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                                <div className="relative bg-white rounded-2xl p-2 border border-purple-100 shadow-xl">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Add to the discussion... (AI will classify your contribution)"
                                        className="w-full p-4 outline-none text-gray-700 placeholder-gray-400 resize-none min-h-[100px] bg-transparent"
                                    />
                                    <div className="flex items-center justify-between px-4 pb-2">
                                        <div className="flex items-center gap-2 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                            AI Quality Check Active
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={submitting || !newComment.trim()}
                                            className="bg-gray-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-black transition-all disabled:opacity-50"
                                        >
                                            {submitting ? 'Analyzing...' : 'Post'}
                                        </button>
                                    </div>
                                </div>
                            </form>

                            {/* AI Discussion Starters */}
                            {discussionQuestions?.questions?.length > 0 && (
                                <div className="mb-10">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">SUGGESTED ANGLES</h4>
                                    <div className="grid gap-3">
                                        {discussionQuestions.questions.slice(0, 2).map((q, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setNewComment(q)}
                                                className="text-left p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all text-sm text-gray-600 font-medium flex items-center gap-3 group"
                                            >
                                                <span className="text-lg opacity-50 group-hover:opacity-100 transition-opacity">💡</span>
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Comment Tree */}
                            <div className="space-y-2">
                                {loadingComments ? (
                                    <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div></div>
                                ) : comments.length > 0 ? (
                                    comments.map(c => (
                                        <CommentItem
                                            key={c.id}
                                            comment={c}
                                            onReply={handleWrapperReply}
                                            onVote={handleVote}
                                        />
                                    ))
                                ) : (
                                    <div className="text-center py-16 text-gray-400">
                                        <div className="text-4xl mb-4 opacity-30">💬</div>
                                        No comments yet. Be the first to start the conversation.
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Sidebar (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Time Saved Widget */}
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl">
                            <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-6">PRODUCTIVITY BOOST</h3>
                            <div className="flex items-end gap-3 mb-2">
                                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                                    {summaryData?.time_saved || "~3 min"}
                                </span>
                            </div>
                            <p className="text-gray-400 text-sm">saved today by reading AI summaries.</p>

                            <div className="mt-8 pt-8 border-t border-white/10">
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-gray-400">Original Read</span>
                                    <span className="font-bold">{summaryData?.reading_time || "4 min"}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400">AI Summary</span>
                                    <span className="font-bold text-green-400">~1 min</span>
                                </div>
                            </div>
                        </div>

                        {/* Guide Widget */}
                        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6">DISCUSSION RULES</h3>
                            <ul className="space-y-4">
                                <li className="flex gap-3 text-sm text-gray-600">
                                    <span className="text-green-500 font-bold">✓</span>
                                    Focus on facts and insights
                                </li>
                                <li className="flex gap-3 text-sm text-gray-600">
                                    <span className="text-green-500 font-bold">✓</span>
                                    Respect diverse viewpoints
                                </li>
                                <li className="flex gap-3 text-sm text-gray-600">
                                    <span className="text-red-500 font-bold">✕</span>
                                    No hate speech or toxicity
                                </li>
                            </ul>

                            <div className="mt-6 bg-purple-50 rounded-xl p-4 text-xs text-purple-800 font-medium">
                                🤖 AI Moderator Active
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewsDetail;
