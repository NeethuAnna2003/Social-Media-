import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
    XMarkIcon,
    PaperAirplaneIcon,
    TrashIcon,
    HeartIcon,

    ShareIcon,
    EllipsisHorizontalIcon,
    NewspaperIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

const STORY_DURATION = 5000;

const formatTime = (dateString) => {
    try {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
};

const StoryViewer = ({ initialUserIndex, storyUsers, onClose }) => {
    const navigate = useNavigate();

    // Portal Mounting State
    const [mounted, setMounted] = useState(false);

    // Story Logic State
    const [userIndex, setUserIndex] = useState(initialUserIndex);
    const [storyIndex, setStoryIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const isPaused = useRef(false);



    // Local State
    const [likedState, setLikedState] = useState({});
    const [localViewed, setLocalViewed] = useState(new Set());
    const [deletedIds, setDeletedIds] = useState(new Set());

    // Share Modal
    const [showShare, setShowShare] = useState(false);

    // UI State
    const [controlsVisible, setControlsVisible] = useState(true);
    const controlsTimeoutRef = useRef(null);

    const showControls = useCallback(() => {
        setControlsVisible(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (!isPaused.current && !showShare) setControlsVisible(false);
        }, 3000);
    }, [showShare]);

    useEffect(() => {
        showControls();
        const handleActivity = () => showControls();
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('touchstart', handleActivity);
        window.addEventListener('click', handleActivity);
        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('click', handleActivity);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [showControls]);

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; }
    }, []);

    const currentUserGroup = storyUsers[userIndex];

    const handleSafeClose = useCallback(() => {
        onClose();
    }, [onClose]);

    if (!currentUserGroup) {
        handleSafeClose();
        return null;
    }

    const stories = (currentUserGroup.stories || []).filter(s => !deletedIds.has(s.id));

    useEffect(() => {
        if (stories.length === 0 && currentUserGroup && deletedIds.size > 0) {
            handleSafeClose();
        }
    }, [stories.length, currentUserGroup, deletedIds.size, handleSafeClose]);

    const currentStory = stories[storyIndex];



    // Determine Start Index
    useEffect(() => {
        if (!currentUserGroup) return;
        const firstUnviewed = currentUserGroup.stories.findIndex(s => !s.is_viewed && !localViewed.has(s.id));
        setStoryIndex(firstUnviewed !== -1 ? firstUnviewed : 0);
        setProgress(0);
    }, [userIndex, currentUserGroup]);

    // View Tracking
    useEffect(() => {
        if (!currentStory) return;
        if (!currentStory.is_viewed && !localViewed.has(currentStory.id)) {
            api.post(`/stories/${currentStory.id}/view/`).catch(console.error);
            setLocalViewed(prev => new Set(prev).add(currentStory.id));
        }
    }, [currentStory]);



    // Navigation
    const handleNext = useCallback(() => {
        if (storyIndex < stories.length - 1) {
            setStoryIndex(prev => prev + 1);
            setProgress(0);
        } else {
            if (userIndex < storyUsers.length - 1) {
                setUserIndex(prev => prev + 1);
            } else {
                handleSafeClose();
            }
        }
    }, [storyIndex, stories.length, userIndex, storyUsers.length, handleSafeClose]);

    const handlePrev = useCallback(() => {
        if (storyIndex > 0) {
            setStoryIndex(prev => prev - 1);
            setProgress(0);
        } else {
            if (userIndex > 0) {
                setUserIndex(prev => prev - 1);
            } else {
                handleSafeClose();
            }
        }
    }, [storyIndex, userIndex, handleSafeClose]);

    // Keyboard
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') handleSafeClose();

        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev, handleSafeClose]);

    // Timer
    useEffect(() => {
        if (showShare) return;
        let startTime = Date.now();
        const interval = setInterval(() => {
            if (isPaused.current) {
                startTime = Date.now() - (progress / 100 * STORY_DURATION);
                return;
            }
            const elapsed = Date.now() - startTime;
            const newProgress = (elapsed / STORY_DURATION) * 100;
            if (newProgress >= 100) {
                handleNext();
                startTime = Date.now();
            } else {
                setProgress(newProgress);
            }
        }, 50);
        return () => clearInterval(interval);
    }, [storyIndex, userIndex, showShare, handleNext]);

    // Actions
    const handleLike = async (e) => {
        e.stopPropagation();
        if (!currentStory) return;
        const sId = currentStory.id;
        const currentLiked = likedState[sId]?.liked ?? currentStory.is_liked;
        const currentCount = likedState[sId]?.count ?? currentStory.likes_count;
        setLikedState(prev => ({ ...prev, [sId]: { liked: !currentLiked, count: currentLiked ? currentCount - 1 : currentCount + 1 } }));
        try { await api.post(`/stories/${sId}/like/`); } catch (err) { }
    };

    const handleDelete = async (id) => {
        isPaused.current = true;
        if (window.confirm("Delete story?")) {
            try {
                await api.delete(`/stories/${id}/`);
                setDeletedIds(prev => new Set(prev).add(id));
                if (stories.length <= 1) handleSafeClose();
                else handleNext();
            } catch (err) { console.error(err); }
        }
        isPaused.current = false;
    };

    // Gestures
    const touchStart = useRef({ x: 0, y: 0 });
    const onTouchStart = (e) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        isPaused.current = true;
        showControls();
    };
    const onTouchEnd = (e) => {
        isPaused.current = false;
        const deltaY = e.changedTouches[0].clientY - touchStart.current.y;
        if (deltaY > 100) handleSafeClose();
    };

    if (!mounted || !currentStory) return null;

    const isLiked = likedState[currentStory.id]?.liked ?? currentStory.is_liked;
    const likesCount = likedState[currentStory.id]?.count ?? currentStory.likes_count;



    // Handle link story click
    const handleLinkClick = () => {
        if (currentStory.story_type === 'link' && currentStory.link_url) {
            window.open(currentStory.link_url, '_blank');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center animate-in fade-in duration-300">
            {/* Main Container */}
            <div
                className="relative w-full h-full md:w-[420px] md:h-[840px] md:max-h-[95vh] bg-black md:rounded-[32px] overflow-hidden shadow-2xl flex flex-col group/viewer ring-1 ring-white/10"
                onClick={(e) => { showControls(); }}
                onMouseMove={showControls}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                {/* Background Layer */}
                {currentStory.story_type === 'link' ? (
                    <div className="absolute inset-0 z-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900" />
                        {currentStory.link_thumbnail && (
                            <>
                                <img
                                    src={currentStory.link_thumbnail}
                                    className="w-full h-full object-cover blur-3xl opacity-20 scale-125"
                                    alt=""
                                />
                                <div className="absolute inset-0 bg-black/60" />
                            </>
                        )}
                    </div>
                ) : (
                    <div className="absolute inset-0 z-0 select-none pointer-events-none">
                        <img
                            src={currentStory.media}
                            className="w-full h-full object-cover blur-3xl opacity-40 scale-125"
                            alt=""
                        />
                        <div className="absolute inset-0 bg-black/60" />
                    </div>
                )}

                {/* Content Layer */}
                <div className="relative z-10 w-full h-full flex items-center justify-center bg-transparent p-0">
                    {currentStory.story_type === 'link' ? (
                        // Link Story Card
                        <div className="w-full h-full flex items-center justify-center p-6">
                            <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
                                {/* Thumbnail */}
                                {currentStory.link_thumbnail && (
                                    <div className="relative h-64 overflow-hidden">
                                        <img
                                            src={currentStory.link_thumbnail}
                                            alt={currentStory.link_title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                    </div>
                                )}

                                {/* Content */}
                                <div className="p-6 space-y-4">
                                    {/* Source Badge */}
                                    {currentStory.link_source && (
                                        <div className="flex items-center gap-2">
                                            <NewspaperIcon className="w-4 h-4 text-white/60" />
                                            <span className="text-white/60 text-xs font-bold uppercase tracking-wider">
                                                {currentStory.link_source}
                                            </span>
                                        </div>
                                    )}

                                    {/* Title */}
                                    <h2 className="text-white text-2xl font-black leading-tight line-clamp-3">
                                        {currentStory.link_title}
                                    </h2>

                                    {/* Description */}
                                    {currentStory.link_description && (
                                        <p className="text-white/80 text-sm leading-relaxed line-clamp-3">
                                            {currentStory.link_description}
                                        </p>
                                    )}

                                    {/* CTA Button */}
                                    <button
                                        onClick={handleLinkClick}
                                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <NewspaperIcon className="w-5 h-5" />
                                        Read Full Article
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : currentStory.media_type === 'video' ? (
                        <video
                            src={currentStory.media}
                            autoPlay
                            muted={!isMuted}
                            playsInline
                            className="w-full h-full object-contain max-h-full"
                            onEnded={handleNext}
                        />
                    ) : (
                        <img
                            src={currentStory.media}
                            alt="Story"
                            className="w-full h-full object-contain max-h-full select-none"
                            draggable={false}
                        />
                    )}

                    {/* Gradients */}
                    <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                </div>



                {/* Top Interface */}
                <div className={`absolute top-0 inset-x-0 z-50 flex flex-col transition-opacity duration-300 px-3 pt-3 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}>
                    {/* Progress Bars */}
                    <div className="flex gap-1 h-1 cursor-pointer mb-3">
                        {stories.map((s, idx) => (
                            <div key={s.id} className="flex-1 bg-white/20 rounded-full overflow-hidden h-full backdrop-blur-sm">
                                <div
                                    className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-100 ease-linear rounded-full"
                                    style={{ width: idx < storyIndex ? '100%' : idx === storyIndex ? `${progress}%` : '0%' }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                        {/* User Info */}
                        <div className="flex items-center gap-3 px-2 py-1.5 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 cursor-pointer hover:bg-black/60 transition-colors pr-4">
                            <div className="w-8 h-8 rounded-full p-[1px] bg-gradient-to-tr from-yellow-400 to-purple-600">
                                <img
                                    src={currentUserGroup.avatar || `https://ui-avatars.com/api/?name=${currentUserGroup.username}`}
                                    className="w-full h-full rounded-full border border-black object-cover"
                                    alt=""
                                />
                            </div>
                            <div className="flex flex-col justify-center gap-0.5">
                                <span className="text-white font-bold text-xs drop-shadow-md truncate max-w-[100px] leading-none">{currentUserGroup.username}</span>
                                <span className="text-white/60 text-[10px] font-medium leading-none">{formatTime(currentStory.created_at)}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">

                            <button
                                onClick={(e) => { e.stopPropagation(); handleSafeClose(); }}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-black/45 backdrop-blur-xl border border-white/10 hover:bg-black/60 text-white transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Navigation Zones */}
                <div className="absolute inset-y-0 left-0 w-1/4 z-20 cursor-w-resize" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
                <div className="absolute inset-y-0 right-0 w-1/4 z-20 cursor-e-resize" onClick={(e) => { e.stopPropagation(); handleNext(); }} />

                {/* Right Side Actions */}
                <div className={`absolute right-3 bottom-24 z-[60] flex flex-col gap-4 items-center transition-all duration-300 pointer-events-auto ${controlsVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
                    <button onClick={handleLike} className="group relative flex flex-col items-center gap-1">
                        <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-xl border border-white/15 flex items-center justify-center transition-transform active:scale-90 group-hover:bg-black/60 hover:border-white/30">
                            {isLiked ? <HeartIconSolid className="w-5 h-5 text-red-500 animate-[heartbeat_0.3s_ease-in-out]" /> : <HeartIcon className="w-5 h-5 text-white" strokeWidth={2} />}
                        </div>
                        {likesCount > 0 && <span className="text-[10px] font-bold text-white drop-shadow-md">{likesCount}</span>}
                    </button>

                    <button onClick={(e) => { e.stopPropagation(); setShowShare(true); isPaused.current = true; }} className="group flex flex-col items-center gap-1">
                        <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-xl border border-white/15 flex items-center justify-center transition-transform active:scale-90 group-hover:bg-black/60 hover:border-white/30">
                            <ShareIcon className="w-5 h-5 text-white" strokeWidth={2} />
                        </div>
                    </button>

                    <button className="group flex flex-col items-center gap-1" onClick={(e) => {
                        e.stopPropagation();
                        if (currentUserGroup.is_own) handleDelete(currentStory.id);
                    }}>
                        <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-xl border border-white/15 flex items-center justify-center transition-transform active:scale-90 group-hover:bg-black/60 hover:border-white/30">
                            {currentUserGroup.is_own ? <TrashIcon className="w-5 h-5 text-white hover:text-red-400" strokeWidth={2} /> : <EllipsisHorizontalIcon className="w-6 h-6 text-white" strokeWidth={2} />}
                        </div>
                    </button>
                </div>

                {/* Bottom Components */}
                <div className={`absolute bottom-0 inset-x-0 z-50 p-3 pb-6 flex flex-col gap-3 transition-all duration-300 ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                    {/* Caption */}
                    {currentStory.caption && (
                        <div className="px-1 max-w-[85%]">
                            <p className="text-white text-sm font-medium leading-normal drop-shadow-md line-clamp-2">
                                <span className="font-bold mr-2">{currentUserGroup.username}</span>
                                {currentStory.caption}
                            </p>
                        </div>
                    )}

                    {/* Reply Bar */}
                    <div className="relative pointer-events-auto mr-14">
                        <div className="flex items-center gap-3 p-1 pl-1.5 bg-black/45 backdrop-blur-xl border border-white/15 rounded-full shadow-lg hover:bg-black/60 transition-colors group cursor-text">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/15 shrink-0 bg-neutral-800">
                                <img
                                    src={currentUserGroup.is_own ? (currentUserGroup.avatar || `https://ui-avatars.com/api/?name=${currentUserGroup.username}`) : "https://ui-avatars.com/api/?name=Me"}
                                    className="w-full h-full object-cover"
                                    alt="Me"
                                />
                            </div>
                            <input
                                type="text"
                                placeholder={`Reply to ${currentUserGroup.username}...`}
                                className="flex-1 bg-transparent text-white placeholder-white/40 text-sm font-medium outline-none px-2 h-full py-2"
                                onFocus={() => isPaused.current = true}
                                onBlur={() => isPaused.current = false}
                            />
                            <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center transition-transform active:scale-90 text-white mr-1 hover:bg-white/20">
                                <PaperAirplaneIcon className="w-4 h-4 -rotate-45 mb-px ml-px" strokeWidth={2} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Share Modal */}
                {showShare && (
                    <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
                        <div className="bg-[#121212] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-white font-bold text-xl">Share Story</h3>
                                <button onClick={() => { setShowShare(false); isPaused.current = false; }} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="h-40 flex flex-col items-center justify-center text-neutral-500 gap-2 border border-dashed border-white/10 rounded-2xl bg-black/20">
                                <ShareIcon className="w-10 h-10 opacity-20" />
                                <span className="text-sm font-medium">Share options coming soon</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default StoryViewer;
