import { useState, useEffect } from 'react';

import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import Layout from '../components/layout/Layout';
import ProfileHeader from '../components/profile/ProfileHeader';
import UserPostsSection from '../components/profile/UserPostsSection';
import EditProfileModal from '../components/profile/EditProfileModal';
import CreatePostModal from '../components/profile/CreatePostModal';

const Profile = () => {
    const { user, fetchUser } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

    const [isPrivateProfile, setIsPrivateProfile] = useState(false);

    const fetchPosts = async () => {
        if (user?.username) {
            try {
                // Use specific endpoint for user's posts or general filter
                const response = await api.get(`/accounts/users/${user.username}/posts/`);
                setPosts(response.data.results || response.data || []);
                setIsPrivateProfile(false); // If successful, it's not private to us
            } catch (error) {
                if (error.response && error.response.status === 403) {
                    setPosts([]);
                    setIsPrivateProfile(true);
                } else {
                    console.error("Failed to fetch posts", error);
                }
            } finally {
                setLoadingPosts(false);
            }
        }
    };

    // Reset private state when user changes
    useEffect(() => {
        setIsPrivateProfile(false);
    }, [user]);

    useEffect(() => {
        if (user) fetchPosts();
    }, [user]);

    const handleProfileUpdate = (updatedData) => {
        fetchUser(); // Refresh global auth state
    };

    const handlePostCreated = () => {
        fetchPosts(); // Refresh posts list
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto px-4 py-8 pb-20">
                <ProfileHeader
                    user={user}
                    isOwnProfile={true}
                    onEdit={() => setIsEditModalOpen(true)}
                />

                <div className="flex justify-end mb-6">
                    <button
                        onClick={() => setIsCreatePostOpen(true)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="hidden sm:inline">Create Post</span>
                    </button>
                </div>

                <UserPostsSection
                    posts={posts}
                    loading={loadingPosts}
                    username={user.username}
                    currentUserId={user.id}
                    isPrivateProfile={isPrivateProfile}
                />
            </div>

            <EditProfileModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                user={user}
                onUpdate={handleProfileUpdate}
            />

            <CreatePostModal
                isOpen={isCreatePostOpen}
                onClose={() => setIsCreatePostOpen(false)}
                onPostCreated={handlePostCreated}
            />
        </Layout>
    );
};

export default Profile;
