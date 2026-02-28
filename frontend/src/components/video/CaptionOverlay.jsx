import React from 'react';

const CaptionOverlay = ({ text }) => {
    if (!text) return null;

    return (
        <div
            className="absolute left-0 right-0 flex justify-center px-4 pointer-events-none"
            style={{ bottom: '52px', zIndex: 10 }}
        >
            <div
                style={{
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    color: '#ffffff',
                    padding: '6px 18px',
                    borderRadius: '4px',
                    maxWidth: '90%',
                    textAlign: 'center',
                    fontSize: '1.15rem',
                    lineHeight: '1.5',
                    fontWeight: '600',
                    letterSpacing: '0.01em',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                }}
            >
                {text}
            </div>
        </div>
    );
};

export default CaptionOverlay;
