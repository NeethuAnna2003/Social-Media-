import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Layout from '../components/layout/Layout';
import ProfileHeader from '../components/profile/ProfileHeader';
import UserPostsSection from '../components/profile/UserPostsSection';
import { toast } from 'react-hot-toast';

const UserPage = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [profileUser, setProfileUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isPrivateProfile, setIsPrivateProfile] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setLoading(true);
                setIsPrivateProfile(false); // Reset on each fetch

                // Fetch User Profile
                const userRes = await api.get(`/accounts/users/${username}/`);
                setProfileUser(userRes.data);

                if (currentUser) {
                    const followersRes = await api.get(`/accounts/users/${username}/followers/`);
                    const followersList = followersRes.data.results || followersRes.data || [];
                    const amIFollowing = followersList.some(f => f.id === currentUser.id);
                    setIsFollowing(amIFollowing);
                }

                // Fetch Posts
                try {
                    const postsRes = await api.get(`/accounts/users/${username}/posts/`);
                    setPosts(postsRes.data.results || postsRes.data || []);
                } catch (postsError) {
                    // If 403, it's a private account and we're not following
                    if (postsError.response && postsError.response.status === 403) {
                        setPosts([]);
                        setIsPrivateProfile(true);
                    } else {
                        throw postsError; // Re-throw other errors
                    }
                }

            } catch (error) {
                console.error("Failed to load user", error);
                toast.error("User not found");
            } finally {
                setLoading(false);
            }
        };

        if (username) fetchUserData();
    }, [username, currentUser]);

    const handleFollowToggle = async () => {
        if (!processUserAction()) return;

        // Optimistic Update
        const prevFollowing = isFollowing;
        setIsFollowing(!isFollowing); // Toggle UI immediately

        try {
            if (prevFollowing) {
                await api.post('/social/unfollow/', { username: profileUser.username });
                toast.success(`Unfollowed @${profileUser.username}`);
            } else {
                await api.post('/social/follow/', { username: profileUser.username });
                toast.success(`Following @${profileUser.username}`);
            }
        } catch (error) {
            // Revert on error
            setIsFollowing(prevFollowing);
            toast.error("Action failed. Please try again.");
        }
    };

    const processUserAction = () => {
        if (!currentUser) {
            toast.error("Please login to follow users");
            return false;
        }
        return true;
    };

    const handleMessage = async () => {
        if (!currentUser) {
            toast.error("Please login to message");
            return;
        }
        try {
            const res = await api.post('/chat/threads/', { target_user_id: profileUser.id });
            navigate(`/messages/${res.data.id}`);
        } catch (err) {
            console.error(err);
            toast.error("Failed to start chat");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!profileUser) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">User not found</div>;

    return (
        <Layout>
            <div className="max-w-4xl mx-auto px-4 py-8 pb-20">
                <ProfileHeader
                    user={profileUser}
                    isOwnProfile={currentUser?.username === profileUser.username}
                    isFollowing={isFollowing}
                    onFollowToggle={handleFollowToggle}
                    onMessage={handleMessage}
                />

                <div className="border-b border-gray-200 mb-8">
                    <div className="flex gap-8">
                        <button className="px-4 py-3 border-b-2 border-purple-600 font-bold text-purple-600">
                            Latest Posts
                        </button>
                    </div>
                </div>

                <UserPostsSection
                    posts={posts}
                    loading={false}
                    username={profileUser.username}
                    currentUserId={currentUser?.id}
                    isPrivateProfile={isPrivateProfile}
                />
            </div>
        </Layout>
    );
};

export default UserPage;
