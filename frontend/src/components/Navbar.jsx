import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useState, useRef, useEffect } from 'react';
import api from '../api/axios';
import adverseLogo from '../assets/adverse_logo.mp4';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { unreadCount, notifications, clearNotifications, updateNotification, addNotification } = useNotification();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [scrolled, setScrolled] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const notifRef = useRef(null);
    const profileRef = useRef(null);

    // Scroll detection
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Outside click closer
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) setIsNotificationsOpen(false);
            if (profileRef.current && !profileRef.current.contains(event.target)) setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            navigate(`/search?q=${searchTerm}`);
        }
    };

    const handleFollowResponse = async (e, relatedId, action, notificationId) => {
        e.stopPropagation();
        try {
            await api.post('/social/follow/respond/', {
                request_id: relatedId,
                action: action,
                notification_id: notificationId
            });
            updateNotification(notificationId, { responding: true });
            updateNotification(notificationId, { responded: true, response_action: action });
        } catch (err) {
            console.error(err);
        }
    };

    // Minimilist Floating Nav Link
    const NavLink = ({ to, icon, active, index }) => (
        <Link
            to={to}
            style={{ animationDelay: `${index * 100}ms` }}
            className={`
                relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ease-spring
                hover:-translate-y-1 hover:bg-white/10
                animate-fade-in
                ${active ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-500'}
            `}
        >
            <div className={`transform transition-transform duration-300 ${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'scale-100'}`}>
                {icon}
            </div>
            {active && (
                <span className="absolute -bottom-1 w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-pulse"></span>
            )}
        </Link>
    );

    return (
        <nav className={`
            fixed top-0 w-full z-50 transition-all duration-500 ease-out
            ${scrolled
                ? 'bg-white/40 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] py-2'
                : 'bg-transparent py-5'
            }
            animate-slide-down
        `}>
            <div className="max-w-[1700px] mx-auto px-4 sm:px-8 lg:px-12 flex items-center justify-between">

                {/* LEFT: Branding (Floating) */}
                <div className="flex-shrink-0 flex items-center">
                    <Link to="/" className="group flex items-center gap-3">
                        <div className="relative w-16 h-16 flex items-center justify-center overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5 transform transition-all duration-500 group-hover:scale-105 group-hover:shadow-indigo-500/20">
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 mix-blend-overlay z-10"></div>
                            <video
                                src={adverseLogo}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover transform scale-105"
                            />
                        </div>
                        <span className={`text-2xl font-bold tracking-tighter transition-colors duration-300 ${scrolled ? 'text-gray-900' : 'text-gray-800'}`}>
                            Adverse
                        </span>
                    </Link>
                </div>

                {/* CENTER: Navigation Links */}
                <div className="hidden md:flex items-center gap-2 lg:gap-6 flex-1 justify-center px-4">
                    <NavLink index={1} active={location.pathname === '/'} to="/" icon={
                        <svg className="w-6 h-6" fill={location.pathname === '/' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    } />
                    <NavLink index={2} active={location.pathname === '/studio'} to="/studio" icon={
                        <svg className="w-6 h-6" fill={location.pathname === '/studio' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    } />
                    <NavLink index={3} active={location.pathname === '/news-dashboard'} to="/news-dashboard" icon={
                        <svg className="w-6 h-6" fill={location.pathname === '/news-dashboard' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                    } />
                    <NavLink index={4} active={location.pathname.startsWith('/messages')} to="/messages" icon={
                        <svg className="w-6 h-6" fill={location.pathname.startsWith('/messages') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    } />
                </div>

                {/* RIGHT: Actions */}
                <div className="flex items-center gap-4 lg:gap-6">

                    {/* Ghost Search */}
                    <div className="hidden lg:flex items-center relative group">
                        <button className="absolute left-3 text-gray-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </button>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                            className={`
                                py-2 pl-10 pr-4 block rounded-full border-none outline-none
                                bg-transparent
                                text-sm text-gray-800 placeholder-gray-400 font-medium
                                focus:bg-white focus:w-48 focus:shadow-lg focus:shadow-indigo-500/10 focus:ring-1 focus:ring-indigo-100
                                w-32 hover:w-36 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]
                            `}
                        />
                    </div>

                    {/* Notification Bell (Floating) */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                            className={`
                                relative p-2 rounded-full transition-all duration-300 hover:-translate-y-0.5
                                ${isNotificationsOpen ? 'text-indigo-600 bg-white shadow-md' : 'text-gray-500 hover:text-gray-800'}
                            `}
                        >
                            <svg className={`w-6 h-6 ${unreadCount > 0 ? 'animate-wiggle' : ''}`} fill={isNotificationsOpen ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                            </svg>
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse"></span>
                            )}
                        </button>

                        {/* Dropdown - Floating Glass Panel */}
                        {isNotificationsOpen && (
                            <div className="absolute right-0 top-full mt-4 w-96 transform origin-top-right animate-fade-in-up z-50">
                                <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_30px_60px_-10px_rgba(0,0,0,0.12)] border border-white/50 overflow-hidden ring-1 ring-black/5">
                                    <div className="px-6 py-4 border-b border-gray-100/50 flex justify-between items-center">
                                        <h3 className="font-bold text-gray-800">Activity</h3>
                                        {unreadCount > 0 && <button onClick={clearNotifications} className="text-xs font-bold text-indigo-600 hover:opacity-80 transition-opacity">CLEAR</button>}
                                    </div>
                                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                                        {!notifications?.length ? (
                                            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                                                <p className="text-sm font-medium opacity-60">No new activity</p>
                                            </div>
                                        ) : (
                                            notifications.map(n => (
                                                <div key={n.id} className="group relative p-3 rounded-2xl hover:bg-white/50 transition-colors cursor-pointer" onClick={() => navigate(`/user/${n.actor_name}`)}>
                                                    <div className="flex gap-3">
                                                        <img src={n.actor_avatar || `https://ui-avatars.com/api/?name=${n.actor_name}&background=random`} className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm" alt="" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-gray-800 leading-snug">
                                                                <span className="font-bold">{n.actor_name}</span> {n.message.replace(n.actor_name, '')}
                                                            </p>
                                                            <span className="text-xs text-gray-400 mt-1 block">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                                                            {/* Action Buttons */}
                                                            {/* Broadened check for follow requests */}
                                                            {((n.type === 'follow_request') || (n.message && n.message.toLowerCase().includes('requested to follow'))) && !n.responded && (
                                                                <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                                                                    <button
                                                                        onClick={(e) => handleFollowResponse(e, n.related_id, 'accept', n.id)}
                                                                        className="flex-1 bg-white hover:bg-gray-50 text-gray-900 text-[11px] font-bold py-1.5 px-3 rounded-lg border border-gray-200 shadow-sm transition-all"
                                                                    >
                                                                        Confirm
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => handleFollowResponse(e, n.related_id, 'deny', n.id)}
                                                                        className="flex-1 bg-white hover:bg-gray-50 text-gray-500 text-[11px] font-bold py-1.5 px-3 rounded-lg border border-gray-200 transition-all"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {/* Post-Response Actions */}
                                                            {n.responded && n.response_action === 'accept' && (
                                                                <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                                                                    {!n.followed_back ? (
                                                                        <button
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                const btn = e.target;
                                                                                btn.disabled = true;
                                                                                const originalText = btn.innerText;
                                                                                btn.innerText = '...';

                                                                                try {
                                                                                    // Corrected endpoint: POST /social/follow/ with body { username }
                                                                                    const res = await api.post('/social/follow/', { username: n.actor_name });

                                                                                    if (res.data.status === 'requested') {
                                                                                        btn.innerText = 'Requested';
                                                                                        // Don't mark full 'followed_back' yet maybe? Or just treat as handled.
                                                                                        updateNotification(n.id, { followed_back: true }); // We can use this to disable
                                                                                    } else { // status === 'followed'
                                                                                        btn.innerText = 'Following';
                                                                                        updateNotification(n.id, { followed_back: true });
                                                                                    }
                                                                                } catch (err) {
                                                                                    console.error(err);
                                                                                    btn.innerText = originalText;
                                                                                    btn.disabled = false;
                                                                                }
                                                                            }}
                                                                            className="flex-1 bg-white hover:bg-gray-50 text-gray-900 text-[11px] font-bold py-1.5 px-3 rounded-lg border border-gray-200 shadow-sm transition-all"
                                                                        >
                                                                            Follow Back
                                                                        </button>
                                                                    ) : (
                                                                        <button className="flex-1 bg-gray-100 text-gray-500 text-[11px] font-bold py-1.5 px-3 rounded-lg cursor-default border border-gray-100">
                                                                            Following
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); navigate(`/user/${n.actor_name}`); setIsNotificationsOpen(false); }}
                                                                        className="flex-1 bg-white hover:bg-gray-50 text-gray-900 text-[11px] font-bold py-1.5 px-3 rounded-lg border border-gray-200 transition-all"
                                                                    >
                                                                        View Profile
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {!n.is_read && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile Avatar (Floating) */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="group relative flex items-center justify-center transition-all duration-300 focus:outline-none"
                        >
                            <img
                                src={user?.avatar || "https://ui-avatars.com/api/?name=User&background=random"}
                                className="w-9 h-9 rounded-full object-cover shadow-sm ring-2 ring-white group-hover:ring-indigo-100 transition-all duration-300"
                                alt="Profile"
                            />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-3 w-72 origin-top-right z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-white/90 backdrop-blur-2xl rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden">

                                    {/* User Header */}
                                    <div className="px-5 py-4 border-b border-gray-100/50 flex items-center gap-4">
                                        <img
                                            src={user?.avatar || "https://ui-avatars.com/api/?name=User&background=random"}
                                            className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-white"
                                            alt="Profile"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate tracking-tight">{user?.username || 'Guest'}</p>
                                            <p className="text-xs font-medium text-gray-500 truncate">{user?.email}</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="p-1.5 space-y-0.5">
                                        {(user?.is_staff || user?.is_superuser || user?.is_admin) && (
                                            <Link
                                                to="/admin-dashboard"
                                                className="group flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-indigo-50/50 transition-all duration-200"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                <div className="text-indigo-400 group-hover:text-indigo-600 transition-colors duration-200 transform group-hover:translate-x-0.5">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                                </div>
                                                <span className="text-sm font-bold text-indigo-600 group-hover:text-indigo-700">Admin Dashboard</span>
                                            </Link>
                                        )}

                                        <Link
                                            to="/profile"
                                            className="group flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50/80 transition-all duration-200"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <div className="text-gray-400 group-hover:text-indigo-600 transition-colors duration-200 transform group-hover:translate-x-0.5">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            </div>
                                            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">My Profile</span>
                                        </Link>

                                        <Link
                                            to="/dashboard"
                                            className="group flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50/80 transition-all duration-200"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <div className="text-gray-400 group-hover:text-indigo-600 transition-colors duration-200 transform group-hover:translate-x-0.5">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                            </div>
                                            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Personal Analytics</span>
                                        </Link>

                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                logout();
                                            }}
                                            className="group flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-red-50/50 transition-all duration-200 text-left"
                                        >
                                            <div className="text-gray-400 group-hover:text-red-500 transition-colors duration-200 transform group-hover:translate-x-0.5">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                            </div>
                                            <span className="text-sm font-medium text-gray-700 group-hover:text-red-600">Sign Out</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
