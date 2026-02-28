import React, { useEffect } from 'react';

const AvatarBubble = ({ message, isVisible, onClose }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    return (
        <div
            className="w-64 z-50 animate-fade-in-up origin-bottom-right"
        >
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-purple-100 p-4 relative">
                <p className="text-gray-800 text-sm font-medium leading-relaxed font-sans">
                    {message}
                </p>

                {/* Arrow pointer */}
                <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white transform rotate-45 border-r border-b border-purple-100"></div>
            </div>
        </div>
    );
};

export default AvatarBubble;
