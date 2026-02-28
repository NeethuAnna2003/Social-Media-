import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import api from '../../api/axios';
import StoryViewer from '../stories/StoryViewer';
import UserListModal from './UserListModal';

const ProfileHeader = ({ user, isOwnProfile, onEdit, isFollowing, onFollowToggle, onMessage }) => {
    const navigate = useNavigate();
    const [stories, setStories] = useState([]);
    const [isStoryOpen, setIsStoryOpen] = useState(false);

    // User List Modal State
    const [userListOpen, setUserListOpen] = useState(false);
    const [userListType, setUserListType] = useState('followers'); // 'followers' or 'following'

    // Profile Menu State
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const coverPhoto = user.profile?.cover_photo || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80";

    useEffect(() => {
        if (user?.id) {
            fetchStories();
        }
    }, [user?.id]);

    const fetchStories = async () => {
        try {
            const res = await api.get(`/stories/user/${user.id}/`);
            setStories(res.data);
        } catch (err) {
            console.error("Failed to fetch stories", err);
        }
    };

    const storyUsers = [{
        user_id: user.id,
        username: user.username,
        avatar: user.avatar || user.profile?.profile_pic || user.profile_picture || `https://ui-avatars.com/api/?name=${user.username}&background=random`,
        is_own: isOwnProfile,
        stories: stories
    }];

    const openUserList = (type) => {
        setUserListType(type);
        setUserListOpen(true);
    };

    return (
        <div className="perspective-1000 mb-10">
            <div className="relative group/card transform transition-all duration-500 hover:-translate-y-1">

                {/* Floating Glass Container */}
                <div className="bg-white/60 backdrop-blur-xl rounded-[3rem] shadow-depth-1 border border-white/50 overflow-hidden relative z-10 transition-all duration-500 hover:shadow-depth-2">

                    {/* Cover Image - Parallax feel */}
                    <div className="h-64 relative bg-gray-100 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10 transition-opacity duration-500 opacity-60"></div>
                        <img
                            src={coverPhoto}
                            alt="Cover"
                            className="w-full h-full object-cover transform transition-transform duration-700 ease-out group-hover/card:scale-105"
                        />
                    </div>

                    <div className="px-8 pb-8">
                        <div className="relative flex justify-between items-end -mt-[4.5rem] mb-6 z-20">

                            {/* Avatar - Spatial Float */}
                            <div className="relative group/avatar cursor-pointer" onClick={() => stories.length > 0 && setIsStoryOpen(true)}>
                                <div className="absolute inset-0 bg-white/20 backdrop-blur-md rounded-full transform scale-110 blur-xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500"></div>
                                <div className={`w-36 h-36 rounded-full p-1 bg-white shadow-depth-float flex items-center justify-center transform transition-all duration-300 ease-out group-hover/avatar:scale-[1.03] group-hover/avatar:shadow-depth-2 ${stories.length > 0 ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-indigo-600' : ''}`}>
                                    <img
                                        src={user.avatar || user.profile?.profile_pic || user.profile_picture || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
                                        alt={user.username}
                                        className="w-full h-full rounded-full object-cover border-[3px] border-white shadow-inner group-hover/avatar:ring-4 group-hover/avatar:ring-indigo-50/50 transition-all duration-300"
                                    />
                                    {stories.length > 0 && (
                                        <div className="absolute bottom-1 right-1 bg-gradient-to-r from-pink-500 to-indigo-600 text-white text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full shadow-lg border-2 border-white animate-pulse">
                                            LIVE
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Menu (3-Dot) - Minimal & Spatial */}
                            <div className="relative mb-1" ref={menuRef}>
                                {isOwnProfile ? (
                                    <>
                                        <button
                                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                                            className={`
                                                p-2.5 rounded-full bg-white/60 backdrop-blur-md text-gray-600 
                                                hover:bg-white hover:text-indigo-600 hover:shadow-depth-1 
                                                transition-all duration-300 ease-out 
                                                transform ${isMenuOpen ? 'rotate-90 bg-white shadow-depth-1 text-indigo-600' : 'rotate-0'}
                                            `}
                                        >
                                            <EllipsisHorizontalIcon className="w-6 h-6" />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {isMenuOpen && (
                                            <div className="absolute right-0 top-full mt-2 w-48 origin-top-right z-50 animate-in fade-in zoom-in-95 duration-200">
                                                <div className="bg-white/90 backdrop-blur-2xl rounded-2xl shadow-xl ring-1 ring-black/5 p-1.5 focus:outline-none">
                                                    <button
                                                        onClick={() => navigate('/dashboard')}
                                                        className="group flex items-center w-full px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                                                    >
                                                        <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 ml-1 transition-colors">Dashboard</span>
                                                    </button>
                                                    <button
                                                        onClick={onEdit}
                                                        className="group flex items-center w-full px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                                                    >
                                                        <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 ml-1 transition-colors">Edit Profile</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex gap-3">
                                        <button onClick={onMessage} className="px-5 py-2 bg-white/80 border border-white text-gray-700 font-bold rounded-full hover:bg-white hover:shadow-sm transition-all text-sm">
                                            Message
                                        </button>
                                        <button
                                            onClick={onFollowToggle}
                                            className={`px-6 py-2 font-bold rounded-full transition-all shadow-md transform hover:-translate-y-0.5 text-sm ${isFollowing ? 'bg-gray-100 text-gray-600' : 'bg-gray-900 text-white hover:shadow-lg'}`}
                                        >
                                            {isFollowing ? 'Following' : user.is_requested ? 'Requested' : 'Follow'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* User Info & Stats */}
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 animate-fade-in-up">

                            {/* Bio Section */}
                            <div className="flex-1 space-y-3">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight">
                                            {user.first_name || user.username} {user.last_name || ''}
                                        </h1>
                                        {user.is_verified && <div className="text-blue-500 bg-blue-50/50 rounded-full p-1"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg></div>}
                                    </div>
                                    <p className="text-gray-500 font-medium text-sm tracking-wide">@{user.username}</p>
                                </div>

                                <p className="text-gray-600 leading-relaxed text-base max-w-xl font-medium opacity-90">
                                    {user.profile?.bio || user.bio || "Building my digital presence."}
                                </p>

                                {/* Meta Chips */}
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {user.profile?.interests?.split(',').map((tag, i) => (
                                        <span key={i} className="px-3 py-1 bg-gray-100/50 text-gray-600 rounded-lg text-xs font-bold uppercase tracking-wider border border-transparent hover:border-indigo-100 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-default select-none shadow-sm hover:shadow-md hover:-translate-y-0.5">
                                            {tag.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Floating Stats Panel */}
                            <div className="flex gap-3 pt-2">
                                {[
                                    { label: 'Posts', value: user.posts_count || 0 },
                                    { label: 'Followers', value: user.followers_count || 0, action: () => openUserList('followers') },
                                    { label: 'Following', value: user.following_count || 0, action: () => openUserList('following') }
                                ].map((stat, idx) => (
                                    <div
                                        key={idx}
                                        onClick={stat.action}
                                        className={`
                                            flex flex-col items-center justify-center w-20 h-20 rounded-2xl 
                                            bg-white/50 backdrop-blur-md border border-white/60 shadow-sm transition-all duration-300 ease-out
                                            ${stat.action ? 'cursor-pointer hover:bg-white hover:scale-105 hover:-translate-y-1 hover:shadow-md' : 'hover:bg-white/80'}
                                        `}
                                    >
                                        <span className="text-xl font-bold text-gray-900">{stat.value}</span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{stat.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals & Viewers */}
            {isStoryOpen && stories.length > 0 && (
                <StoryViewer
                    storyUsers={storyUsers}
                    initialUserIndex={0}
                    onClose={() => { setIsStoryOpen(false); fetchStories(); }}
                />
            )}
            <UserListModal
                isOpen={userListOpen}
                onClose={() => setUserListOpen(false)}
                username={user.username}
                type={userListType}
            />
        </div>
    );
};

export default ProfileHeader;
