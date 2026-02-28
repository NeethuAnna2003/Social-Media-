import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const AvatarAnimator = ({ mood, isSpeaking, avatarUrl, onClick, animationState }) => {

    // Trigger confetti on milestone
    useEffect(() => {
        if (animationState === 'milestone') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { x: 0.8, y: 0.8 }, // Bottom right
                colors: ['#a855f7', '#ec4899', '#f3f46f']
            });
        }
    }, [animationState]);

    // Track Mouse for Head Effect
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    useEffect(() => {
        const handleMouseMove = (e) => {
            // Normalize to -1...1
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = (e.clientY / window.innerHeight) * 2 - 1;
            setMousePos({ x, y });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Mood configs
    const getMoodConfig = () => {
        switch (mood) {
            case 'happy': return { gradient: 'from-pink-500 to-rose-500', emoji: '😊' };
            case 'warning': return { gradient: 'from-amber-400 to-orange-500', emoji: '⚠️' };
            case 'sleeping': return { gradient: 'from-indigo-400 to-blue-500', emoji: '😴' };
            case 'speaking': return { gradient: 'from-purple-500 to-indigo-600', emoji: '🗣️' };
            case 'idle':
            default: return { gradient: 'from-violet-500 to-fuchsia-500', emoji: '🤖' };
        }
    };

    const { gradient, emoji } = getMoodConfig();

    const [imgError, setImgError] = useState(false);

    // Reset error state when avatarUrl changes
    useEffect(() => {
        console.log('🎨 AvatarAnimator: avatarUrl changed to:', avatarUrl);
        console.log('🎨 AvatarAnimator: Resetting imgError state');
        setImgError(false);
    }, [avatarUrl]);

    // Debug current state
    useEffect(() => {
        console.log('🎨 AvatarAnimator State:', {
            avatarUrl,
            imgError,
            hasUrl: !!avatarUrl,
            willShowImage: !!(avatarUrl && !imgError)
        });
    }, [avatarUrl, imgError]);

    // 3D Tilt Values
    const rotateX = mousePos.y * -10; // Look up/down
    const rotateY = mousePos.x * 10;  // Look left/right

    return (
        <div
            onClick={onClick}
            className="relative group cursor-pointer flex flex-col items-end"
            // Taller container for full body
            style={{ width: '160px', height: '320px', perspective: '1000px' }}
        >
            {/* Ambient Glow - Subtle floor shadow */}
            <motion.div
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-4 rounded-[100%] bg-black opacity-20 blur-md`}
                animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.15, 0.2] }}
                transition={{ duration: 4, repeat: Infinity }}
            />

            {/* Avatar Container with 3D Tilt */}
            <motion.div
                className="relative w-full h-full flex items-end justify-center z-10"
                style={{
                    transformStyle: 'preserve-3d',
                }}
                animate={{
                    rotateX: animationState === 'idle' ? rotateX : 0,
                    rotateY: animationState === 'idle' ? rotateY : 0,
                }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
            >
                {avatarUrl && !imgError ? (
                    <motion.img
                        key={avatarUrl} // Force re-render when URL changes
                        src={avatarUrl}
                        alt="Avatar"
                        className="max-w-none w-auto h-full object-contain filter drop-shadow-2xl select-none"
                        style={{ transformOrigin: 'bottom center' }}
                        // Animations
                        animate={
                            animationState === 'entry' ? {
                                rotate: [0, 15, -15, 15, 0], // Big Wave
                                y: [0, -10, 0],
                                scale: 1
                            } :
                                animationState === 'celebrate' ? {
                                    y: [0, -20, 0],
                                    rotate: [0, -10, 10, 0],
                                    transition: { duration: 0.5, repeat: 5 }
                                } :
                                    animationState === 'scroll' ? {
                                        y: 60, // Sit Down Lower
                                        rotateX: 5,
                                        scaleY: 0.95, // Squash
                                        scaleX: 1.05  // Stretch
                                    } :
                                        // Idle / Speaking (Breathing Loop)
                                        {
                                            y: isSpeaking ? [0, -5, 0] : [0, -4, 0],
                                            scaleY: isSpeaking ? 1.05 : [1, 1.02, 1], // Breathing Stretch
                                            scaleX: isSpeaking ? 1.05 : [1, 0.99, 1], // Breathing Squeeze
                                        }
                        }
                        transition={
                            animationState === 'entry' ? { duration: 1.5, ease: "easeInOut" } :
                                animationState === 'scroll' ? { duration: 0.5 } :
                                    {
                                        duration: isSpeaking ? 0.3 : 4,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }
                        }
                        // Fallback handling
                        onError={(e) => {
                            console.error('❌ Avatar image failed to load:', avatarUrl, e);
                            setImgError(true);
                        }}
                        onLoad={() => {
                            console.log('✅ Avatar image loaded successfully:', avatarUrl);
                        }}
                    />
                ) : (
                    <> {/* Fallback Emoji Display (Shown only if no IMG or Error) */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                className="flex items-center justify-center"
                                animate={
                                    animationState === 'entry' ? {
                                        rotate: [0, 15, -15, 15, 0],
                                        scale: [1, 1.1, 1],
                                        transition: { duration: 1.2, ease: "easeInOut" }
                                    } :
                                        animationState === 'scroll' ? {
                                            y: 30, // Sit lower
                                            scaleY: 0.9,
                                            scaleX: 1.1,
                                            transition: { type: "spring", stiffness: 200 }
                                        } :
                                            {
                                                scale: isSpeaking ? 1.1 : 1,
                                                y: 0
                                            }
                                }
                            >
                                <span className="text-8xl select-none filter drop-shadow-2xl">{emoji}</span>
                            </motion.div>
                        </div>
                    </>
                )
                }

                {/* --- STATE OVERLAYS (Icons Only, No Backgrounds) --- */}

                {/* 2. NOTIFICATION: Bell Floating Above */}
                <AnimatePresence>
                    {animationState === 'notification' && (
                        <motion.div
                            initial={{ y: 0, opacity: 0 }}
                            animate={{ y: -40, opacity: 1, rotate: [0, -15, 15, 0] }}
                            exit={{ y: 0, opacity: 0 }}
                            transition={{ rotate: { repeat: Infinity, duration: 0.5 } }}
                            className="absolute -top-4 right-8 text-5xl filter drop-shadow-lg z-20"
                        >
                            🔔
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 3. MESSAGE: Phone Floating Ear Level */}
                <AnimatePresence>
                    {animationState === 'message' && (
                        <motion.div
                            initial={{ x: 0, opacity: 0 }}
                            animate={{ x: -20, opacity: 1, rotate: [-10, 10] }}
                            exit={{ opacity: 0 }}
                            transition={{ rotate: { repeat: Infinity, duration: 0.2 } }}
                            className="absolute top-16 left-0 text-5xl filter drop-shadow-lg z-20"
                        >
                            📞
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 4. THINKING: Thought Bubble */}
                <AnimatePresence>
                    {animationState === 'thinking' && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1, y: -60, x: 20 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute -top-8 right-0 z-20"
                        >
                            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-3 rounded-bl-none shadow-xl border border-purple-100">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                            </div>
                            <div className="absolute -bottom-2 left-0 w-2 h-2 bg-white rounded-full"></div>
                            <div className="absolute -bottom-4 -left-2 w-1.5 h-1.5 bg-white rounded-full"></div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div >
        </div >
    );
};

export default AvatarAnimator;
