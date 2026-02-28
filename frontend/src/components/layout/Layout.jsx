import React from 'react';
import Navbar from '../Navbar';

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-gray-900 font-sans">
            <Navbar />
            <main className="pt-24 min-h-screen">
                {children}
            </main>
        </div>
    );
};

export default Layout;
