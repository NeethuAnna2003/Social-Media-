import React, { useState, useEffect, useCallback } from 'react';
import AvatarAnimator from './AvatarAnimator';
import AvatarBubble from './AvatarBubble';
import api from '../../api/axios';
import { useLocation } from 'react-router-dom';

const AvatarWidget = () => {
    const [data, setData] = useState({
        message: '',
        mood: 'idle',
        priority: 'low',
        avatar_url: null,
        animation: 'idle'
    });
    const [isVisible, setIsVisible] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [animationState, setAnimationState] = useState('idle'); // idle, entry, notification, message, thinking, milestone

    const location = useLocation();

    // 1. ENTRY ANIMATION (One-time per session)
    useEffect(() => {
        const hasEntered = sessionStorage.getItem('avatar_has_entered');
        if (!hasEntered) {
            // Slight delay to allow page load
            setTimeout(() => {
                setAnimationState('entry');
                setIsVisible(true);
                setData(prev => ({ ...prev, message: "Welcome back! I'm online." }));

                // Clear state
                setTimeout(() => {
                    setAnimationState('idle');
                    setIsVisible(false);
                }, 4000);

                sessionStorage.setItem('avatar_has_entered', 'true');
            }, 1000);
        }
    }, []);

    const fetchInsights = useCallback(async () => {
        try {
            // Show thinking state occasionally before fetch? 
            // Maybe not every time as it triggers poll often.

            const response = await api.get('/avatar/insights/');
            const newData = response.data;

            // Compare message content
            // Compare relevant content
            const hasChanged =
                newData.message !== data.message ||
                newData.avatar_url !== data.avatar_url ||
                newData.animation !== data.animation;

            if (hasChanged) {
                console.log('🔄 AvatarWidget: Data changed!', {
                    old: { avatar_url: data.avatar_url, animation: data.animation },
                    new: { avatar_url: newData.avatar_url, animation: newData.animation }
                });
                setData(newData);

                // --- TRIGGER VISIBILITY ---
                // Only show bubble if the message specifically changed and is not just idle
                if (newData.message !== data.message && newData.mood !== 'idle') {
                    setIsVisible(true);
                }

                // --- DETERMINE ANIMATION STATE ---
                // Only trigger animation interrupts if animation changed
                if (newData.animation !== data.animation) {
                    let nextState = 'idle';
                    let duration = 5000;

                    const animMap = {
                        'call': 'message',
                        'notify': 'notification',
                        'celebrate': 'celebrate',
                        'thinking': 'thinking',
                        'idle': 'idle'
                    };

                    if (newData.animation && animMap[newData.animation]) {
                        nextState = animMap[newData.animation];
                        if (nextState === 'celebrate') duration = 8000;
                    }

                    if (nextState !== 'idle') {
                        setAnimationState(nextState);
                        setTimeout(() => setAnimationState('idle'), duration);
                    }

                    // Visual Speaking trigger
                    if (newData.animation === 'call') {
                        setIsSpeaking(true);
                        setTimeout(() => setIsSpeaking(false), 3000);
                    }
                }
            }
        } catch (error) {
            console.log("Avatar Insights Error", error);
        }
    }, [data.message]);

    // Initial fetch and polling
    useEffect(() => {
        const timeout = setTimeout(fetchInsights, 2000);
        const interval = setInterval(fetchInsights, 30000); // 30s poll

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [fetchInsights]);

    // SCROLL LISTENER (Phase 3: Sit & Observe)
    useEffect(() => {
        let scrollTimeout;
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            if (scrollTop > 300) {
                // If user scrolls down significantly, trigger observe state
                // Only if currently idle to avoid interrupting high priority events
                setAnimationState(prev => {
                    if (prev === 'idle') {
                        setIsVisible(true);
                        setData(d => ({ ...d, message: "👀 Checking out the feed?" }));
                        // Clear message after 3s
                        clearTimeout(scrollTimeout);
                        scrollTimeout = setTimeout(() => {
                            setAnimationState('idle');
                            setIsVisible(false);
                        }, 3000);
                        return 'scroll';
                    }
                    return prev;
                });
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleAvatarClick = () => {
        setIsVisible(!isVisible);
        if (!isVisible) {
            // Visual bounce when manually clicked
            setIsSpeaking(true);
            setTimeout(() => setIsSpeaking(false), 1500);

            // Random cute animation on click
            const randomStates = ['thinking', 'message', 'notification'];
            const randomState = randomStates[Math.floor(Math.random() * randomStates.length)];
            setAnimationState(randomState);
            setTimeout(() => setAnimationState('idle'), 2000);
        }
    };

    // Ensure it only renders on appropriate pages
    const hiddenPaths = ['/login', '/register', '/forgot-password', '/landing'];
    if (hiddenPaths.some(p => location.pathname.startsWith(p))) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            {/* Pointer events auto for children */}
            <div className="pointer-events-auto relative flex flex-col items-end">
                <div className="relative mt-2 flex flex-col items-end">
                    <div className="mb-4">
                        <AvatarBubble
                            message={data.message}
                            isVisible={isVisible}
                            onClose={() => setIsVisible(false)}
                        />
                    </div>

                    <AvatarAnimator
                        mood={data.mood}
                        isSpeaking={isSpeaking}
                        avatarUrl={data.avatar_url}
                        animationState={animationState}
                        onClick={handleAvatarClick}
                    />
                </div>
            </div>
        </div>
    );
};

export default AvatarWidget;
