import React, { useState, useEffect } from 'react';

const ScheduledPostBadge = ({ scheduledFor }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const scheduled = new Date(scheduledFor);
            const diff = scheduled - now;

            if (diff <= 0) {
                setTimeLeft('Publishing now...');
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (days > 0) {
                setTimeLeft(`Will be posted in ${days}d ${hours}h`);
            } else if (hours > 0) {
                setTimeLeft(`Will be posted in ${hours}h ${minutes}m`);
            } else if (minutes > 0) {
                setTimeLeft(`Will be posted in ${minutes}m ${seconds}s`);
            } else {
                setTimeLeft(`Will be posted in ${seconds}s`);
            }
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [scheduledFor]);

    return (
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg mb-3 flex items-center gap-2 animate-pulse">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
                <div className="font-bold text-sm">📅 Scheduled Post</div>
                <div className="text-xs opacity-90">{timeLeft}</div>
            </div>
        </div>
    );
};

export default ScheduledPostBadge;
