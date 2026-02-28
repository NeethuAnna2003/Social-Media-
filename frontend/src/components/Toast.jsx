import React, { useEffect } from 'react';

const Toast = ({ message, type = 'info', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`flex items-center w-full max-w-xs p-4 space-x-4 text-gray-500 bg-white divide-x divide-gray-200 rounded-lg shadow space-x- dark:text-gray-400 dark:divide-gray-700 space-x- dark:bg-gray-800 absolute top-5 right-5 z-50 animate-bounce transition-all`}>
            <div className="text-sm font-normal text-gray-800">{message}</div>
        </div>
    );
};

export default Toast;
