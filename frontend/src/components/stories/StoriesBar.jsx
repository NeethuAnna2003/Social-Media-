import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import StoryViewer from './StoryViewer';
import CreateStory from './CreateStory';

const StoriesBar = ({ currentUser }) => {
    const { user: authUser } = useAuth();
    const user = currentUser || authUser;
    const [storyUsers, setStoryUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUserIndex, setSelectedUserIndex] = useState(null); // Which user's stories are being viewed

    // Create Story State
    const [isCreating, setIsCreating] = useState(false);
    const [initialFile, setInitialFile] = useState(null);
    const fileInputRef = useRef(null);

    const handleAddStoryClick = () => {
        fileInputRef.current.click();
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setInitialFile(file);
            setIsCreating(true);
        }
        e.target.value = null; // Reset
    };

    useEffect(() => {
        fetchStories();
    }, []);

    const fetchStories = async () => {
        try {
            const res = await api.get('/stories/feed/');
            console.log("Fetched stories:", res.data);
            setStoryUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch stories", err);
        } finally {
            setLoading(false);
        }
    };

    const handleStoryClick = (index) => {
        setSelectedUserIndex(index);
    };

    const handleCloseViewer = () => {
        setSelectedUserIndex(null);
        fetchStories(); // Refresh to update "seen" status
    };

    const handleCreated = () => {
        setIsCreating(false);
        fetchStories();
    };

    if (loading) return null; // Or skeleton

    return (
        <div className="relative mb-8 perspective-1000 w-full group">
            {/* Hidden File Input for Direct Upload */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/mp4,video/x-m4v,video/*"
            />

            <div className="flex space-x-5 overflow-x-auto py-4 scrollbar-hide px-4 items-start w-full">

                {/* Add Story - Direct File Explorer Trigger */}
                <div className="group flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer" onClick={handleAddStoryClick}>
                    <div className="w-16 h-16 relative">
                        {/* Avatar Container - Rigid Layout */}
                        <div className="absolute inset-0 rounded-2xl overflow-hidden border border-gray-200 shadow-sm group-hover:shadow-md transition-all duration-300 ease-out group-hover:scale-105">
                            {user?.profile?.profile_pic || user?.avatar ? (
                                <img
                                    src={user.profile?.profile_pic || user.avatar}
                                    alt="You"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-300 font-bold text-xs tracking-wider">
                                    YOU
                                </div>
                            )}
                        </div>


                        {/* Plus Badge - Floating Top Layer */}
                        <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center border-2 border-white shadow-md z-20 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                    </div>
                    <span className="text-xs font-medium text-gray-500 group-hover:text-indigo-600 transition-colors">Add Story</span>
                </div>

                {/* User Stories - Floating Bubbles */}
                {storyUsers.map((storyUser, index) => {
                    const isUnseen = storyUser.has_unseen;
                    return (
                        <div
                            key={storyUser.user_id}
                            className="group flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer"
                            style={{ animationDelay: `${index * 100}ms` }}
                            onClick={() => handleStoryClick(index)}
                        >
                            <div className={`
                                w-16 h-16 rounded-2xl p-0.5 relative transition-all duration-300 ease-out transform group-hover:-translate-y-1 group-hover:shadow-md
                                ${isUnseen
                                    ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent'
                                    : 'ring-1 ring-gray-200 ring-offset-2 ring-offset-transparent grayscale-[0.3] group-hover:grayscale-0'
                                }
                            `}>
                                <div className="w-full h-full rounded-2xl overflow-hidden bg-gray-100 relative">
                                    <img
                                        src={storyUser.avatar || `https://ui-avatars.com/api/?name=${storyUser.username}`}
                                        alt={storyUser.username}
                                        className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
                                    />
                                </div>
                            </div>
                            <span className={`text-[11px] font-medium tracking-tight max-w-[64px] truncate transition-colors ${isUnseen ? 'text-gray-900 font-semibold' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                {storyUser.is_own ? 'Your Story' : storyUser.username}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Viewer Modal */}
            {selectedUserIndex !== null && (
                <StoryViewer
                    initialUserIndex={selectedUserIndex}
                    storyUsers={storyUsers}
                    onClose={handleCloseViewer}
                />
            )}

            {/* Creator Modal */}
            {isCreating && (
                <CreateStory
                    initialFile={initialFile}
                    onClose={() => {
                        setIsCreating(false);
                        setInitialFile(null);
                    }}
                    onSuccess={handleCreated}
                />
            )}
        </div>
    );
};

export default StoriesBar;
