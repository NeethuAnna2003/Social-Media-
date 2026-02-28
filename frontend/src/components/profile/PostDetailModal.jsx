import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
    HeartIcon,
    ChatBubbleOvalLeftIcon,
    PaperAirplaneIcon,
    BookmarkIcon,
    EllipsisHorizontalIcon,
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    TrashIcon,
    EyeSlashIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid';

const PostDetailModal = ({ post, isOpen, onClose, onNext, onPrev }) => {
    const { user: currentUser } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [likesCount, setLikesCount] = useState(post?.likes_count || 0);
    const [isLiked, setIsLiked] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const commentInputRef = useRef(null);
    const optionsRef = useRef(null);

    // Close options on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (optionsRef.current && !optionsRef.current.contains(event.target)) {
                setShowOptions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft' && onPrev) onPrev();
            if (e.key === 'ArrowRight' && onNext) onNext();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, onNext, onPrev]);

    useEffect(() => {
        if (isOpen && post) {
            fetchComments();
            setLikesCount(post.likes_count || 0);
            setIsLiked(post.has_liked || false); // In real app, fetch this status
        }
    }, [isOpen, post]);

    const fetchComments = async () => {
        setLoadingComments(true);
        try {
            const response = await api.get(`/posts/${post.id}/comments/`);
            setComments(response.data.results || (Array.isArray(response.data) ? response.data : []));
        } catch (error) {
            console.error("Failed to fetch comments", error);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleLike = async () => {
        const prev = isLiked;
        setIsLiked(!prev);
        setLikesCount(c => prev ? c - 1 : c + 1);
        try {
            await api.post(`/posts/${post.id}/${prev ? 'unlike' : 'like'}/`);
        } catch {
            setIsLiked(prev);
            setLikesCount(post.likes_count);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            const payload = { text: newComment, post: post.id };
            if (replyingTo) payload.parent = replyingTo.id;
            await api.post(`/posts/${post.id}/comments/`, payload);
            fetchComments();
            setNewComment('');
            setReplyingTo(null);
        } catch (error) {
            console.error("Comment failed", error);
        }
    };

    const handleReplyClick = (comment) => {
        setReplyingTo(comment);
        commentInputRef.current?.focus();
        setNewComment(`@${comment.user.username} `);
    };

    const handleDelete = async () => {
        if (!window.confirm("Delete post?")) return;
        try {
            await api.delete(`/posts/${post.id}/`);
            onClose();
            window.location.reload();
        } catch (error) { console.error(error); }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Delete this comment?")) return;
        try {
            await api.delete(`/posts/${post.id}/comments/${commentId}/`);
            setComments(comments.filter(c => c.id !== commentId));
        } catch (error) {
            console.error("Failed to delete comment", error);
        }
    };

    if (!isOpen || !post) return null;

    const isPostOwner = currentUser?.id === post.user?.id;
    // Determine media to show (first item or image field)
    const mediaItem = post.media && post.media.length > 0 ? post.media[0] : null;
    const mediaUrl = post.image || (mediaItem ? mediaItem.file : null);
    const isVideo = (mediaItem && mediaItem.media_type === 'video') || (typeof mediaUrl === 'string' && mediaUrl.match(/\.(mp4|mov|webm)$/i));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-200" onClick={onClose}>

            {/* Close Button (Mobile/Outside) */}
            <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-[110]">
                <XMarkIcon className="w-8 h-8 drop-shadow-md" />
            </button>

            {/* Modal Card */}
            <div
                className="bg-white w-full max-w-6xl h-[85vh] sm:h-[90vh] rounded-[24px] sm:rounded-[32px] flex overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 ring-1 ring-white/20"
                onClick={e => e.stopPropagation()}
            >

                {/* Left: Media Area */}
                <div className="hidden md:flex w-[60%] bg-gray-100 relative items-center justify-center overflow-hidden group/modal-media">

                    {/* Previous Arrow */}
                    {onPrev && (
                        <button onClick={onPrev} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-md hover:bg-white text-gray-800 shadow-lg opacity-0 group-hover/modal-media:opacity-100 transition-all z-20">
                            <ChevronLeftIcon className="w-6 h-6" />
                        </button>
                    )}

                    {/* Media Render */}
                    <div className="w-full h-full relative flex items-center justify-center p-4">
                        {mediaUrl ? (
                            isVideo ? (
                                <video src={mediaUrl} controls className="max-w-full max-h-full object-contain rounded-lg shadow-sm" />
                            ) : (
                                <img src={mediaUrl} alt="Post" className="max-w-full max-h-full object-contain rounded-lg shadow-sm" />
                            )
                        ) : (
                            <div className="text-gray-400 font-medium">No Media Available</div>
                        )}
                    </div>

                    {/* Next Arrow */}
                    {onNext && (
                        <button onClick={onNext} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-md hover:bg-white text-gray-800 shadow-lg opacity-0 group-hover/modal-media:opacity-100 transition-all z-20">
                            <ChevronRightIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>

                {/* Right: Content Area */}
                <div className="w-full md:w-[40%] flex flex-col h-full bg-white relative z-10">

                    {/* Header */}
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-0.5 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600">
                                <img
                                    src={post.user?.avatar || `https://ui-avatars.com/api/?name=${post.user?.username}`}
                                    alt={post.user?.username}
                                    className="w-9 h-9 rounded-full object-cover border-2 border-white"
                                />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-gray-900">{post.user?.username}</h3>
                                <p className="text-xs text-gray-500">{post.location || 'Original Audio'}</p>
                            </div>
                        </div>
                        <button onClick={() => setShowOptions(!showOptions)} className="text-gray-800 p-1 rounded-full hover:bg-gray-50">
                            <EllipsisHorizontalIcon className="w-6 h-6" />
                        </button>
                        {showOptions && isPostOwner && (
                            <div className="absolute top-14 right-4 bg-white shadow-xl border border-gray-100 rounded-xl py-2 z-50 w-40 text-sm font-medium animate-in fade-in zoom-in-95">
                                <button onClick={handleDelete} className="text-red-600 hover:bg-red-50 w-full text-left px-4 py-2">Delete</button>
                                <button onClick={() => setShowOptions(false)} className="text-gray-700 hover:bg-gray-50 w-full text-left px-4 py-2">Cancel</button>
                            </div>
                        )}
                    </div>

                    {/* Scrollable Comments */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 custom-scrollbar">
                        {/* Caption */}
                        {post.text && (
                            <div className="flex gap-3">
                                <img src={post.user?.avatar} className="w-8 h-8 rounded-full object-cover mt-1" />
                                <div className="text-sm">
                                    <span className="font-bold mr-2">{post.user?.username}</span>
                                    <span className="text-gray-800 leading-normal">{post.text}</span>
                                    <div className="text-xs text-gray-400 mt-1">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</div>
                                </div>
                            </div>
                        )}

                        {loadingComments ? (
                            <div className="flex justify-center p-4 text-gray-400 text-xs">Loading comments...</div>
                        ) : comments.map(comment => {
                            // 1. Definition of State
                            const isToxic = comment.toxicity === 'high' || comment.is_flagged;
                            const isRed = comment.sentiment === 'negative' || isToxic;
                            const isGreen = comment.sentiment === 'positive';
                            const isYellow = !isRed && !isGreen;
                            const isCommentOwner = currentUser?.id === comment.user?.id;
                            const isPostOwner = currentUser?.id === post.user?.id;

                            // 2. Safety Check (Redundant with backend but good for safety)
                            // "Not even Nivin" -> If backend somehow sends it to post owner, hide it here too.
                            if (isRed && !isCommentOwner) return null;

                            // 3. Render: Private / Flagged / Red Style
                            if (isRed) {
                                return (
                                    <div key={comment.id} className="group flex flex-col gap-2 p-4 rounded-xl bg-red-50/80 border border-red-100 transition-all">
                                        {/* Badge Header */}
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <EyeSlashIcon className="w-3 h-3 text-red-500" strokeWidth={2.5} />
                                            <span className="text-[10px] font-bold text-red-500 tracking-wider uppercase">Private • Flagged</span>
                                        </div>

                                        <div className="flex gap-3">
                                            {/* Avatar */}
                                            <img
                                                src={comment.user?.avatar}
                                                className="w-8 h-8 rounded-full object-cover border border-red-200 mt-0.5"
                                                alt={comment.user?.username}
                                            />

                                            <div className="flex-1">
                                                {/* Content Line */}
                                                <div className="text-sm">
                                                    <span className="font-bold text-gray-900 mr-2">{comment.user?.username}</span>
                                                    <span className="text-gray-800">{comment.text}</span>
                                                </div>

                                                {/* Hidden Warning Box */}
                                                <div className="mt-3 bg-white rounded-lg p-3 border border-red-100 flex items-center gap-2.5 shadow-sm">
                                                    <EyeSlashIcon className="w-4 h-4 text-red-400" />
                                                    <span className="text-xs font-semibold text-red-500">Hidden from public due to community safety</span>
                                                </div>

                                                {/* Footer Actions */}
                                                <div className="flex items-center justify-between mt-3 pl-1">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-[11px] text-gray-400 font-medium">
                                                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                                        </span>
                                                        <button
                                                            onClick={() => handleReplyClick(comment)}
                                                            className="text-[11px] font-bold text-gray-700 hover:text-purple-600 transition-colors"
                                                        >
                                                            Reply
                                                        </button>
                                                    </div>
                                                    <button className="text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors">
                                                        Appeal
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // 4. Render: Standard Style (Green / Yellow)
                            return (
                                <div key={comment.id} className={`group flex gap-3 p-3 rounded-xl transition-all ${isGreen ? 'bg-emerald-50/30' : ''}`}>
                                    <img src={comment.user?.avatar} className="w-8 h-8 rounded-full object-cover mt-1 border border-gray-200" />
                                    <div className="flex-1 text-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900">{comment.user?.username}</span>
                                                {isGreen && <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-bold">Positive</span>}
                                            </div>

                                            {/* Delete Button */}
                                            {(isCommentOwner || isPostOwner) && (
                                                <button
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-all"
                                                    title="Delete comment"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        <span className="text-gray-800 leading-relaxed block mt-0.5">
                                            {comment.text}
                                        </span>

                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-xs text-gray-400 font-medium">{formatDistanceToNow(new Date(comment.created_at))}</span>
                                            <button onClick={() => handleReplyClick(comment)} className="text-xs font-semibold text-gray-700 hover:text-purple-600 transition-colors">Reply</button>
                                        </div>
                                    </div>

                                    <button className="self-center opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-50 rounded text-gray-400">
                                        <HeartIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0 z-20">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-4">
                                <button onClick={handleLike} className="hover:opacity-60 transition-opacity">
                                    {isLiked ? <HeartIconSolid className="w-7 h-7 text-rose-500 animate-[heartbeat_0.2s_ease-in-out]" /> : <HeartIcon className="w-7 h-7 text-gray-900" />}
                                </button>
                                <button onClick={() => commentInputRef.current?.focus()} className="hover:opacity-60 transition-opacity">
                                    <ChatBubbleOvalLeftIcon className="w-7 h-7 text-gray-900" />
                                </button>
                                <button className="hover:opacity-60 transition-opacity">
                                    <PaperAirplaneIcon className="w-6 h-6 text-gray-900 -rotate-45 relative bottom-[2px]" />
                                </button>
                            </div>
                            <button onClick={() => setIsSaved(!isSaved)} className="hover:opacity-60 transition-opacity">
                                {isSaved ? <BookmarkIconSolid className="w-7 h-7 text-gray-900" /> : <BookmarkIcon className="w-7 h-7 text-gray-900" />}
                            </button>
                        </div>
                        <div className="font-bold text-sm text-gray-900 mb-1">{likesCount.toLocaleString()} likes</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-3">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </div>

                        {/* Input */}
                        <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 border-t border-gray-100 pt-3 relative">
                            {replyingTo && (
                                <div className="absolute -top-10 left-0 bg-gray-100 px-3 py-1 text-xs rounded-full flex items-center gap-2">
                                    Replying to @{replyingTo.user.username} <button type="button" onClick={() => setReplyingTo(null)}><XMarkIcon className="w-3 h-3" /></button>
                                </div>
                            )}
                            <div className="p-1">
                                <svg className="w-6 h-6 text-gray-400 hover:text-gray-600 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <input
                                ref={commentInputRef}
                                type="text"
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="flex-1 border-none focus:ring-0 text-sm bg-transparent p-0 placeholder-gray-400 text-gray-900"
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim()}
                                className="text-blue-500 font-semibold text-sm disabled:opacity-40 hover:text-blue-700 transition-colors"
                            >
                                Post
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostDetailModal;
