import React, { useState, useEffect } from 'react';
import {
    ChatBubbleLeftIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    FlagIcon,
    TrashIcon,
    PencilIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

/**
 * Reddit-Style Discussion Component
 * 
 * Features:
 * - Threaded comments with nesting
 * - Upvote/Downvote system
 * - Reply functionality
 * - Sort by Hot/New/Top
 * - AI moderation (spam, toxicity detection)
 * - Real-time updates
 */
const NewsDiscussion = ({ articleId, articleUrl }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('hot');
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadComments();

        // Auto-refresh every 30 seconds
        const interval = setInterval(loadComments, 30000);
        return () => clearInterval(interval);
    }, [articleId, sortBy]);

    // Load comments
    const loadComments = async () => {
        try {
            setLoading(true);

            // Try backend API first
            try {
                const response = await api.get(`/news/comments/`, {
                    params: {
                        url: articleUrl,
                        sort: sortBy
                    }
                });
                setComments(response.data);
            } catch (apiError) {
                // Fallback to localStorage for demo
                const cached = localStorage.getItem(`comments_${articleUrl}`);
                if (cached) {
                    setComments(JSON.parse(cached));
                } else {
                    setComments([]);
                }
            }
        } catch (error) {
            console.error('Failed to load comments:', error);
        } finally {
            setLoading(false);
        }
    };

    // AI Moderation check
    const moderateComment = (text) => {
        const lowerText = text.toLowerCase();

        // Spam detection
        const spamPatterns = [
            /click here/i,
            /buy now/i,
            /limited offer/i,
            /http[s]?:\/\//,  // URLs
            /(.)\1{4,}/  // Repeated characters
        ];

        const isSpam = spamPatterns.some(pattern => pattern.test(text));

        // Toxicity detection
        const toxicWords = [
            'hate', 'stupid', 'idiot', 'dumb', 'kill', 'die',
            // Add more as needed
        ];

        const isToxic = toxicWords.some(word => lowerText.includes(word));

        // Duplicate detection (check against recent comments)
        const isDuplicate = comments.some(c =>
            c.content.toLowerCase() === lowerText
        );

        return {
            isValid: !isSpam && !isToxic && !isDuplicate,
            reason: isSpam ? 'spam' : isToxic ? 'toxic' : isDuplicate ? 'duplicate' : null
        };
    };

    // Submit comment
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!newComment.trim()) return;

        // AI Moderation
        const moderation = moderateComment(newComment);
        if (!moderation.isValid) {
            alert(`Comment rejected: ${moderation.reason}`);
            return;
        }

        setSubmitting(true);

        try {
            const commentData = {
                content: newComment,
                parent_id: replyingTo,
                article_url: articleUrl,
                user: {
                    id: user?.id || 1,
                    username: user?.username || 'Anonymous',
                    avatar: user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'User'}`
                },
                upvotes: 0,
                downvotes: 0,
                score: 0,
                created_at: new Date().toISOString(),
                replies: []
            };

            // Try backend API
            try {
                const response = await api.post(`/news/comments/`, commentData);
                setComments([response.data, ...comments]);
            } catch (apiError) {
                // Fallback to localStorage
                const newCommentWithId = {
                    ...commentData,
                    id: Date.now()
                };

                const updated = [newCommentWithId, ...comments];
                setComments(updated);
                localStorage.setItem(`comments_${articleUrl}`, JSON.stringify(updated));
            }

            setNewComment('');
            setReplyingTo(null);
        } catch (error) {
            console.error('Failed to post comment:', error);
            alert('Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };

    // Vote on comment
    const handleVote = async (commentId, value) => {
        try {
            // Try backend API
            try {
                await api.post(`/news/vote/`, { comment_id: commentId, value });
            } catch (apiError) {
                // Fallback to local update
                const updated = comments.map(comment => {
                    if (comment.id === commentId) {
                        return {
                            ...comment,
                            upvotes: value === 1 ? comment.upvotes + 1 : comment.upvotes,
                            downvotes: value === -1 ? comment.downvotes + 1 : comment.downvotes,
                            score: comment.score + value
                        };
                    }
                    return comment;
                });

                setComments(updated);
                localStorage.setItem(`comments_${articleUrl}`, JSON.stringify(updated));
            }

            loadComments();
        } catch (error) {
            console.error('Failed to vote:', error);
        }
    };

    // Delete comment
    const handleDelete = async (commentId) => {
        if (!confirm('Delete this comment?')) return;

        try {
            // Backend delete not implemented yet, use local delete
            const updated = comments.filter(c => c.id !== commentId);
            setComments(updated);
            localStorage.setItem(`comments_${articleUrl}`, JSON.stringify(updated));
        } catch (error) {
            console.error('Failed to delete comment:', error);
        }
    };

    // Sort comments
    const getSortedComments = () => {
        const sorted = [...comments];

        switch (sortBy) {
            case 'hot':
                // Hot = high score + recent
                return sorted.sort((a, b) => {
                    const aHot = a.score / (Math.pow((Date.now() - new Date(a.created_at)) / 3600000, 1.5) + 1);
                    const bHot = b.score / (Math.pow((Date.now() - new Date(b.created_at)) / 3600000, 1.5) + 1);
                    return bHot - aHot;
                });

            case 'new':
                return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            case 'top':
                return sorted.sort((a, b) => b.score - a.score);

            default:
                return sorted;
        }
    };

    // Render single comment
    const CommentItem = ({ comment, depth = 0 }) => {
        const [showReply, setShowReply] = useState(false);
        const [replyText, setReplyText] = useState('');

        const timeAgo = (date) => {
            const seconds = Math.floor((new Date() - new Date(date)) / 1000);
            if (seconds < 60) return `${seconds}s ago`;
            if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
            if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
            return `${Math.floor(seconds / 86400)}d ago`;
        };

        return (
            <div className={`comment-item ${depth > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
                <div className="bg-white rounded-xl p-4 mb-3 border border-gray-100 hover:border-gray-200 transition-all">
                    {/* Comment Header */}
                    <div className="flex items-center gap-3 mb-3">
                        <img
                            src={comment.user?.avatar || `https://ui-avatars.com/api/?name=${comment.user?.username}`}
                            className="w-8 h-8 rounded-full"
                            alt={comment.user?.username}
                        />
                        <div className="flex-1">
                            <span className="font-bold text-sm text-gray-900">
                                {comment.user?.username || 'Anonymous'}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                                {timeAgo(comment.created_at)}
                            </span>
                        </div>
                    </div>

                    {/* Comment Content */}
                    <p className="text-sm text-gray-700 leading-relaxed mb-3">
                        {comment.content}
                    </p>

                    {/* Comment Actions */}
                    <div className="flex items-center gap-4">
                        {/* Voting */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleVote(comment.id, 1)}
                                className="p-1 hover:bg-green-50 rounded transition-colors"
                            >
                                <ArrowUpIcon className="w-4 h-4 text-gray-600 hover:text-green-600" />
                            </button>
                            <span className={`text-sm font-bold ${comment.score > 0 ? 'text-green-600' :
                                comment.score < 0 ? 'text-red-600' :
                                    'text-gray-600'
                                }`}>
                                {comment.score}
                            </span>
                            <button
                                onClick={() => handleVote(comment.id, -1)}
                                className="p-1 hover:bg-red-50 rounded transition-colors"
                            >
                                <ArrowDownIcon className="w-4 h-4 text-gray-600 hover:text-red-600" />
                            </button>
                        </div>

                        {/* Reply */}
                        <button
                            onClick={() => setShowReply(!showReply)}
                            className="flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-indigo-600 transition-colors"
                        >
                            <ChatBubbleLeftIcon className="w-4 h-4" />
                            Reply
                        </button>

                        {/* Delete (if own comment) */}
                        {comment.user?.id === user?.id && (
                            <button
                                onClick={() => handleDelete(comment.id)}
                                className="flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-red-600 transition-colors"
                            >
                                <TrashIcon className="w-4 h-4" />
                                Delete
                            </button>
                        )}
                    </div>

                    {/* Reply Form */}
                    {showReply && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write a reply..."
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                rows="2"
                            />
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => {
                                        setReplyingTo(comment.id);
                                        setNewComment(replyText);
                                        handleSubmit({ preventDefault: () => { } });
                                        setReplyText('');
                                        setShowReply(false);
                                    }}
                                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                                >
                                    Reply
                                </button>
                                <button
                                    onClick={() => {
                                        setShowReply(false);
                                        setReplyText('');
                                    }}
                                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                    <div className="replies">
                        {comment.replies.map(reply => (
                            <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="news-discussion bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-xl">
                        <ChatBubbleLeftIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900">Discussion</h3>
                        <p className="text-xs text-gray-500">{comments.length} comments</p>
                    </div>
                </div>

                {/* Sort Controls */}
                <div className="flex gap-2">
                    {['hot', 'new', 'top'].map(sort => (
                        <button
                            key={sort}
                            onClick={() => setSortBy(sort)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${sortBy === sort
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-200'
                                }`}
                        >
                            {sort}
                        </button>
                    ))}
                </div>
            </div>

            {/* New Comment Form */}
            <form onSubmit={handleSubmit} className="mb-6">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    rows="3"
                />
                <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">
                        AI moderation enabled • Spam and toxic comments will be rejected
                    </p>
                    <button
                        type="submit"
                        disabled={submitting || !newComment.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                    >
                        {submitting ? 'Posting...' : 'Post Comment'}
                    </button>
                </div>
            </form>

            {/* Comments List */}
            {loading ? (
                <div className="text-center py-8">
                    <p className="text-sm font-bold text-gray-500">Loading comments...</p>
                </div>
            ) : comments.length === 0 ? (
                <div className="text-center py-8">
                    <ChatBubbleLeftIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-gray-500">No comments yet</p>
                    <p className="text-xs text-gray-400 mt-1">Be the first to share your thoughts!</p>
                </div>
            ) : (
                <div className="comments-list space-y-3">
                    {getSortedComments().map(comment => (
                        <CommentItem key={comment.id} comment={comment} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default NewsDiscussion;
