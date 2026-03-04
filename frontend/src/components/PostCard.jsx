import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import ConfirmationModal from './ConfirmationModal';
import PostLocation from './PostLocation';
import CaptionOverlay from './video/CaptionOverlay';

const PostCard = ({ post, onLike, onDelete, onEdit, currentUserId }) => {
    const navigate = useNavigate();
    const [isLiked, setIsLiked] = useState(post.is_liked || false);
    const [likesCount, setLikesCount] = useState(post.likes || 0);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editCommentText, setEditCommentText] = useState('');
    const [isHovered, setIsHovered] = useState(false);

    // Captions support for video posts
    const [preparedCaptions, setPreparedCaptions] = useState({}); // index -> filtered caption list
    const videoRefs = useRef({});
    const [activeCaptions, setActiveCaptions] = useState({}); // index -> text

    useEffect(() => {
        // Prepare captions (filter by primary language)
        try {
            const media = Array.isArray(post.media) ? post.media : [];
            media.forEach((m, idx) => {
                if (m.media_type === 'video' && Array.isArray(m.captions) && m.captions.length > 0) {
                    // Pick primary language (most frequent)
                    const counts = m.captions.reduce((acc, c) => {
                        const lang = c.language || 'und';
                        acc[lang] = (acc[lang] || 0) + 1;
                        return acc;
                    }, {});
                    const primaryLang = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || 'und';
                    const filtered = m.captions.filter(c => (c.language || 'und') === primaryLang);
                    setPreparedCaptions(prev => ({ ...prev, [idx]: filtered }));
                }
            });
        } catch (e) {
            console.error('Failed to prepare captions:', e);
        }
    }, [post.media]);

    const handleTimeUpdate = (idx) => (e) => {
        const t = e.currentTarget.currentTime || 0;
        const captions = (preparedCaptions[idx]) || (Array.isArray(post.media) && post.media[idx] ? (post.media[idx].captions || []) : []);
        const match = captions.find(c => t >= (Number(c.start_time) || 0) && t <= (Number(c.end_time) || 0));
        setActiveCaptions(prev => ({ ...prev, [idx]: match ? match.text : '' }));
    };

    const isOwnPost = currentUserId && (String(post.user?.id) === String(currentUserId) || String(post.user?._id) === String(currentUserId));

    // Get all media items
    const allMedia = [];
    if (post.image) {
        allMedia.push({ file: post.image, media_type: 'image' });
    }
    if (post.media && post.media.length > 0) {
        allMedia.push(...post.media);
    }
    if (post.video && !post.media?.length) {
        allMedia.push({ file: post.video, media_type: 'video' });
    }

    const hasMultipleImages = allMedia.length > 1;

    const handlePrevMedia = (e) => {
        e?.stopPropagation();
        setCurrentMediaIndex((prev) => (prev === 0 ? allMedia.length - 1 : prev - 1));
    };

    const handleNextMedia = (e) => {
        e?.stopPropagation();
        setCurrentMediaIndex((prev) => (prev === allMedia.length - 1 ? 0 : prev + 1));
    };

    const handleLike = async () => {
        try {
            const postId = post._id || post.id;
            setIsLiked(!isLiked);
            setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

            if (isLiked) {
                await api.delete(`/posts/${postId}/like/`);
            } else {
                await api.post(`/posts/${postId}/like/`);
            }

            if (onLike) onLike(postId);
        } catch (error) {
            setIsLiked(!isLiked);
            setLikesCount(isLiked ? likesCount + 1 : likesCount - 1);
            console.error('Failed to toggle like:', error);
        }
    };

    const handleDelete = async () => {
        if (!selectedPostId) return;
        try {
            setDeleting(true);
            await api.delete(`/posts/${selectedPostId}/`);
            onDelete?.(selectedPostId);
            setShowDeleteConfirm(false);
            setSelectedPostId(null);
            if (toast) toast.success('Post deleted successfully');
            else alert('Post deleted successfully');
        } catch (error) {
            console.error('Failed to delete post:', error);
            if (toast) {
                if (error?.response?.status === 403) {
                    toast.error('You can only delete your own post.');
                } else {
                    toast.error(error.response?.data?.error || 'Failed to delete post');
                }
            }
            else alert('Failed to delete post. Please try again.');
        } finally {
            setDeleting(false);
        }
    };

    const handleEdit = () => {
        if (onEdit) onEdit(post);
    };

    const fetchComments = async () => {
        if (comments.length > 0) {
            setShowComments(!showComments);
            return;
        }

        try {
            const postId = post._id || post.id;
            const response = await api.get(`/posts/${postId}/comments/`);
            const commentsData = response.data.results || response.data;
            setComments(Array.isArray(commentsData) ? commentsData : []);
            setShowComments(true);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
            setComments([]);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmitting) return;

        try {
            setIsSubmitting(true);
            const postId = post._id || post.id;
            const response = await api.post(`/posts/${postId}/comments/`, {
                text: newComment
            });

            const currentComments = Array.isArray(comments) ? comments : [];
            setComments([response.data, ...currentComments]);
            setNewComment('');
        } catch (error) {
            console.error('Failed to post comment:', error);
            const errorMessage = error.response?.data?.detail
                || error.response?.data?.text?.[0]
                || error.response?.data?.error
                || 'Failed to post comment. Please try again.';
            alert(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCommentEdit = async (commentId) => {
        if (!editCommentText.trim()) return;

        try {
            const postId = post._id || post.id;
            const response = await api.patch(`/posts/${postId}/comments/${commentId}/`, {
                text: editCommentText
            });

            setComments(comments.map(c => c.id === commentId ? response.data : c));
            setEditingCommentId(null);
            setEditCommentText('');
        } catch (error) {
            console.error('Failed to edit comment:', error);
            alert('Failed to edit comment. Please try again.');
        }
    };

    const handleCommentDelete = async (commentId) => {
        if (!window.confirm('Delete this comment?')) return;

        try {
            const postId = post._id || post.id;
            await api.delete(`/posts/${postId}/comments/${commentId}/`);
            setComments(comments.filter(c => c.id !== commentId));
        } catch (error) {
            console.error('Failed to delete comment:', error);
            alert('Failed to delete comment. Please try again.');
        }
    };

    const handleShare = async () => {
        const postUrl = `${window.location.origin}/post/${post._id || post.id}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Post by ${post.user?.username || 'User'}`,
                    text: post.content || post.text,
                    url: postUrl
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    navigator.clipboard.writeText(postUrl);
                }
            }
        } else {
            navigator.clipboard.writeText(postUrl);
        }
    };

    const formatTimestamp = (timestamp) => {
        try {
            return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
        } catch {
            return 'Recently';
        }
    };

    const navigateToProfile = () => {
        if (post.user?.username) {
            navigate(`/user/${post.user.username}`);
        }
    };

    // Smart Comment Visibility Count
    const getVisibleCommentsCount = () => {
        if (!comments.length) return 0;
        return comments.filter(comment => {
            const isCommentAuthor = currentUserId && (comment.user?.id === currentUserId || comment.user?._id === currentUserId);
            const isHateComment = comment.sentiment === 'negative' || comment.toxicity === 'high' || comment.is_filtered;
            return !isHateComment || isCommentAuthor;
        }).length;
    };

    const visibleCount = getVisibleCommentsCount();
    const totalCount = comments.length || post.comments_count || 0;

    return (
        <div
            className="w-full mx-auto mb-8 relative group max-w-[900px]"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Safe Ambient Glow - Contained & Low Z-Index */}
            <div
                className={`absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20 rounded-3xl blur-xl -z-10 transition-opacity duration-500 will-change-transform ${isHovered ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
                    }`}
            />

            {/* Main Card Container */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-xl shadow-black/5 border border-gray-100 dark:border-gray-800 transition-all duration-300 hover:shadow-2xl hover:shadow-black/10 motion-safe:hover:scale-[1.005] motion-reduce:transition-none motion-reduce:hover:scale-100">
                {/* Header */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={navigateToProfile}>
                        <div className="relative">
                            <img
                                src={post.user?.avatar || post.user?.profile_picture || '/default-avatar.png'}
                                alt={post.user?.username || 'User'}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800"
                            />
                            {/* Verified Badge or Status dot could go here */}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm hover:text-purple-600 transition-colors">
                                {post.user?.username || 'Anonymous'}
                            </h3>
                            <p className="text-[11px] text-gray-400 font-medium">
                                {formatTimestamp(post.timestamp || post.created_at)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-1">
                        {isOwnPost && (
                            <button
                                onClick={handleEdit}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-purple-600 transition-all"
                                title="Edit Post"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                        )}
                        {isOwnPost && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedPostId(post._id || post.id); setShowDeleteConfirm(true); }}
                                className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-all"
                                title="Delete Post"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Location Display */}
                {post.location_data && (
                    <div className="px-5 pt-3">
                        <PostLocation locationData={post.location_data} />
                    </div>
                )}

                {/* Image/Video Display */}
                {allMedia.length > 0 && (
                    <div className="relative w-full">
                        {/* Single Item: Natural Aspect Ratio (No Black Bars) */}
                        {allMedia.length === 1 ? (
                            <div className="w-full max-h-[80vh] sm:max-h-[70vh] overflow-hidden">
                                {allMedia[0].media_type === 'image' ? (
                                    <img
                                        src={allMedia[0].file}
                                        alt="Post content"
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-auto object-contain block"
                                        style={{ maxHeight: '80vh' }}
                                    />
                                ) : (
                                    <video
                                        ref={(el) => { videoRefs.current[0] = el; }}
                                        src={allMedia[0].file}
                                        controls

                                        onTimeUpdate={handleTimeUpdate(0)}
                                        preload="metadata"
                                        className="w-full h-auto object-contain block bg-black"
                                        style={{ maxHeight: '80vh' }}
                                    >

                                    </video>
                                )}
                                {/* YouTube-style caption overlay */}
                                <CaptionOverlay text={activeCaptions[0]} />
                            </div>
                        ) : (
                            /* Multiple Items: Slider container with natural heights */
                            <div className="relative w-full max-h-[80vh] sm:max-h-[70vh] overflow-hidden">
                                <div
                                    className="flex transition-transform duration-500 ease-out"
                                    style={{ transform: `translateX(-${currentMediaIndex * 100}%)` }}
                                >
                                    {allMedia.map((media, index) => (
                                        <div key={index} className="min-w-full flex-shrink-0">
                                            {media.media_type === 'image' ? (
                                                <img
                                                    src={media.file}
                                                    alt={`Media ${index + 1}`}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-full h-auto object-contain block"
                                                    style={{ maxHeight: '80vh' }}
                                                />
                                            ) : (
                                                <video
                                                    ref={(el) => { videoRefs.current[index] = el; }}
                                                    src={media.file}
                                                    controls

                                                    onTimeUpdate={handleTimeUpdate(index)}
                                                    preload="metadata"
                                                    className="w-full h-auto object-contain block bg-black"
                                                    style={{ maxHeight: '80vh' }}
                                                >

                                                </video>
                                            )}
                                            <CaptionOverlay text={activeCaptions[index]} />
                                        </div>
                                    ))}
                                </div>

                                {/* Smart Navigation */}
                                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <button
                                        onClick={handlePrevMedia}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 hover:scale-110 transition-all pointer-events-auto"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>

                                    <button
                                        onClick={handleNextMedia}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 hover:scale-110 transition-all pointer-events-auto"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Progress Bar */}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md hover:bg-black/30 transition-colors">
                                    {allMedia.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCurrentMediaIndex(index);
                                            }}
                                            className="h-1 rounded-full transition-all duration-300"
                                            style={{ width: index === currentMediaIndex ? '20px' : '6px', opacity: index === currentMediaIndex ? 1 : 0.5 }}
                                        >
                                            <div className="h-full w-full bg-white rounded-full shadow-sm" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions Bar */}
                <div className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={handleLike}
                            className="group/btn flex items-center space-x-1.5 py-1"
                        >
                            <div className={`p-1.5 rounded-full transition-all duration-200 ${isLiked ? 'bg-red-50 text-red-500' : 'text-gray-500 group-hover/btn:bg-gray-100'}`}>
                                <svg className={`w-5 h-5 transition-transform ${isLiked ? 'fill-current scale-110' : 'scale-100 group-hover/btn:scale-110'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isLiked ? 0 : 2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </div>
                            <span className={`text-sm font-semibold transition-colors ${isLiked ? 'text-red-500' : 'text-gray-600'}`}>
                                {likesCount}
                            </span>
                        </button>

                        <button
                            onClick={fetchComments}
                            className="group/btn flex items-center space-x-1.5 py-1"
                        >
                            <div className="p-1.5 rounded-full text-gray-500 group-hover/btn:bg-gray-100 group-hover/btn:text-purple-600 transition-all duration-200">
                                <svg className="w-5 h-5 group-hover/btn:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <span className="text-sm font-semibold text-gray-600 group-hover/btn:text-purple-600 transition-colors">
                                {/* Smart Count Display: Show 'X of Y' if mismatch, otherwise just total */}
                                {showComments && comments.length > 0 && visibleCount !== comments.length
                                    ? `${visibleCount}/${comments.length}`
                                    : (post.comments_count || comments.length || 0)
                                }
                            </span>
                        </button>

                        <button onClick={handleShare} className="group/btn p-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-green-600 transition-all">
                            <svg className="w-5 h-5 group-hover/btn:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Caption Section - Standard Instagram Style */}
                {(post.content || post.text) && (
                    <div className="px-5 pb-3">
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                            <span className="font-semibold mr-2 text-gray-900 dark:text-white hover:underline cursor-pointer" onClick={navigateToProfile}>
                                {post.user?.username || 'Anonymous'}
                            </span>
                            {post.content || post.text}
                        </p>
                    </div>
                )}

                {/* Comments Section */}
                {showComments && (
                    <div className="bg-gray-50/80 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
                        {/* Status Bar for Mismatch */}
                        {comments.length > visibleCount && (
                            <div className="px-5 py-2 bg-purple-50/50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/20 text-[11px] text-purple-700 dark:text-purple-300 flex items-center justify-between">
                                <span>Showing {visibleCount} visible comments</span>
                                <span className="opacity-60">{comments.length - visibleCount} hidden</span>
                            </div>
                        )}

                        <div className="p-5 space-y-4">
                            {/* Input Area */}
                            <form onSubmit={handleCommentSubmit} className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 text-sm rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="submit"
                                    disabled={!newComment.trim() || isSubmitting}
                                    className="px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-semibold disabled:opacity-50 hover:shadow-lg transition-all"
                                >
                                    Post
                                </button>
                            </form>

                            {/* Comment List */}
                            {comments.length > 0 && (
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                                    {comments.map((comment) => {
                                        const isCommentAuthor = currentUserId && (
                                            String(comment.user?.id) === String(currentUserId) ||
                                            String(comment.user?._id) === String(currentUserId)
                                        );

                                        const isHateComment = comment.sentiment === 'negative' || comment.toxicity === 'high' || comment.is_filtered;

                                        // VISIBILITY LOGIC REMAINS STRICT
                                        const canSeeComment = !isHateComment || isCommentAuthor;
                                        if (!canSeeComment) return null;

                                        const showHateWarning = isHateComment && isCommentAuthor;
                                        const isEditing = editingCommentId === comment.id;

                                        return (
                                            <div
                                                key={comment.id}
                                                className={`group/comment relative flex space-x-3 p-3 rounded-2xl transition-colors ${showHateWarning ? 'bg-red-50/50 border border-red-100' :
                                                    comment.sentiment === 'positive' ? 'bg-white border border-green-100/50' :
                                                        'bg-white border border-transparent hover:border-gray-100'
                                                    }`}
                                            >
                                                <img
                                                    src={comment.user?.avatar || comment.user?.profile_picture || '/default-avatar.png'}
                                                    alt={comment.user?.username || 'User'}
                                                    className="w-8 h-8 rounded-full object-cover ring-2 ring-white"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-baseline space-x-2">
                                                            <span className={`text-xs font-bold ${showHateWarning ? 'text-red-700' :
                                                                comment.sentiment === 'positive' ? 'text-green-700' : 'text-gray-900'
                                                                }`}>
                                                                {comment.user?.username || 'Anonymous'}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">
                                                                {formatTimestamp(comment.created_at)}
                                                            </span>
                                                        </div>

                                                        {isCommentAuthor && !isEditing && (
                                                            <div className="flex space-x-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                                                <button onClick={() => { setEditingCommentId(comment.id); setEditCommentText(comment.text); }} className="text-[10px] text-gray-400 hover:text-blue-500">Edit</button>
                                                                <button onClick={() => handleCommentDelete(comment.id)} className="text-[10px] text-gray-400 hover:text-red-500">Delete</button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {isEditing ? (
                                                        <div className="mt-2 flex items-center space-x-2">
                                                            <input
                                                                value={editCommentText}
                                                                onChange={(e) => setEditCommentText(e.target.value)}
                                                                className="flex-1 text-xs p-1 border rounded"
                                                            />
                                                            <button onClick={() => handleCommentEdit(comment.id)} className="text-xs text-blue-600 font-medium">Save</button>
                                                            <button onClick={() => setEditingCommentId(null)} className="text-xs text-gray-500">Cancel</button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p className={`text-xs mt-0.5 leading-relaxed ${showHateWarning ? 'text-red-800' :
                                                                comment.sentiment === 'positive' ? 'text-green-800' :
                                                                    comment.is_filtered ? 'text-red-600' : 'text-gray-600'
                                                                }`}>
                                                                {comment.text}
                                                            </p>
                                                            {showHateWarning && (
                                                                <div className="mt-1.5 flex items-center space-x-1.5 text-[10px] text-red-600 font-medium px-2 py-0.5 bg-red-100/50 rounded-full w-fit">
                                                                    <span className="flex items-center">🔒 Private to you</span>
                                                                </div>
                                                            )}
                                                            {comment.is_filtered && comment.filter_warning?.show && (
                                                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                                                    <div className="flex items-start gap-2">
                                                                        <span className="text-sm">⚠️</span>
                                                                        <div className="flex-1">
                                                                            <p className="text-[10px] text-red-700 font-semibold">
                                                                                {comment.filter_warning.message}
                                                                            </p>
                                                                            {comment.filter_warning.matched_words && comment.filter_warning.matched_words.length > 0 && (
                                                                                <p className="text-[9px] text-red-600 mt-1">
                                                                                    Matched: {comment.filter_warning.matched_words.join(', ')}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                title="Are you sure you want to delete this post?"
                message="This action cannot be undone."
                confirmText={deleting ? 'Deleting…' : 'Yes'}
                cancelText="Cancel"
                onConfirm={handleDelete}
                onCancel={() => { if (!deleting) { setShowDeleteConfirm(false); setSelectedPostId(null); } }}
                confirmLoading={deleting}
            />
        </div>
    );
};

export default PostCard;
