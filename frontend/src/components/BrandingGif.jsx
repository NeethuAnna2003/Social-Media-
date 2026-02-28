import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PageBot from './PageBot';

const BrandingGifWithBot = () => {
    const location = useLocation();

    // Only show on Feed/Home page
    const isHomePage = location.pathname === '/' || location.pathname === '/feed';

    // Don't render anything if not on home page
    if (!isHomePage) {
        return null;
    }
    const gifs = [
        '/branding.gif',
        '/branding2.gif',
        '/branding3.gif',
        '/branding4.gif'
    ];

    const [currentGifIndex, setCurrentGifIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [fadeIn, setFadeIn] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // Check if user has scrolled down significantly
            const scrollPosition = window.scrollY + window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;

            // Show GIF when user is near the bottom (within 500px)
            if (scrollPosition >= documentHeight - 500) {
                setIsVisible(true);
            }
        };

        // Check on mount
        handleScroll();

        // Add scroll listener
        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    useEffect(() => {
        if (!isVisible) return; // Don't rotate if not visible

        const interval = setInterval(() => {
            // Fade out
            setFadeIn(false);

            // Wait for fade out animation, then change GIF
            setTimeout(() => {
                setCurrentGifIndex((prevIndex) => (prevIndex + 1) % gifs.length);
                setFadeIn(true);
            }, 300);
        }, 5000); // Change GIF every 5 seconds

        return () => clearInterval(interval);
    }, [isVisible]);

    const handleGifClick = () => {
        setIsChatOpen(true);
    };

    // Don't render if not visible
    if (!isVisible) {
        return null;
    }

    return (
        <>
            {/* GIF Button - Only show when chat is closed */}
            {!isChatOpen && (
                <div
                    onClick={handleGifClick}
                    style={{
                        position: 'fixed',
                        bottom: '30px',
                        right: '30px',
                        zIndex: 10,
                        width: '300px',
                        height: 'auto',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        boxShadow: isHovered
                            ? '0 20px 40px rgba(138, 43, 226, 0.4), 0 0 30px rgba(138, 43, 226, 0.3)'
                            : '0 10px 30px rgba(0, 0, 0, 0.3), 0 0 15px rgba(138, 43, 226, 0.2)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isHovered ? 'scale(1.08) translateY(-5px)' : 'scale(1)',
                        border: '3px solid rgba(138, 43, 226, 0.3)',
                        background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.1), rgba(75, 0, 130, 0.1))',
                        cursor: 'pointer',
                    }}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <img
                        src={gifs[currentGifIndex]}
                        alt={`Branding Animation ${currentGifIndex + 1}`}
                        style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                            opacity: fadeIn ? 1 : 0,
                            transition: 'opacity 0.3s ease-in-out',
                        }}
                    />

                    {/* Click hint overlay */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: isHovered ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s ease',
                            pointerEvents: 'none',
                        }}
                    >
                        {isHovered && (
                            <div
                                style={{
                                    background: 'rgba(0, 0, 0, 0.8)',
                                    color: 'white',
                                    padding: '12px 24px',
                                    borderRadius: '24px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    backdropFilter: 'blur(10px)',
                                    animation: 'fadeIn 0.3s ease',
                                }}
                            >
                                💬 Chat with PageBot
                            </div>
                        )}
                    </div>

                    {/* Indicator dots */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '10px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            gap: '8px',
                            padding: '8px 12px',
                            background: 'rgba(0, 0, 0, 0.5)',
                            borderRadius: '20px',
                            backdropFilter: 'blur(10px)',
                        }}
                    >
                        {gifs.map((_, index) => (
                            <div
                                key={index}
                                style={{
                                    width: currentGifIndex === index ? '24px' : '8px',
                                    height: '8px',
                                    borderRadius: '4px',
                                    background: currentGifIndex === index
                                        ? 'linear-gradient(90deg, #8a2be2, #9370db)'
                                        : 'rgba(255, 255, 255, 0.4)',
                                    transition: 'all 0.3s ease',
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* PageBot Component */}
            <PageBot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
        </>
    );
};

export default BrandingGifWithBot;
