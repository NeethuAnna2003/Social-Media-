import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import RightSidebar from '../components/RightSidebar';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const HashtagFeed = () => {
    const { tag } = useParams();
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Observer for infinite scroll
    const observer = useRef();
    const lastPostRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => prev + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    // Reset when tag changes
    useEffect(() => {
        setPosts([]);
        setPage(1);
        setHasMore(true);
        setTotalCount(0);
    }, [tag]);

    // Fetch posts
    useEffect(() => {
        const fetchPosts = async () => {
            try {
                setLoading(true);
                // Clean tag (remove # if present in URL param, though usually params are stripped)
                const cleanTag = tag.replace('#', '');

                const response = await api.get(`/posts/hashtag/${cleanTag}/?page=${page}`);
                const data = response.data;

                const newPosts = data.results.map(post => ({
                    ...post,
                    _id: post.id,
                    content: post.text,
                    timestamp: post.created_at,
                    likes: post.likes_count || 0,
                    user: {
                        ...post.user,
                        avatar: post.user.profile_picture || post.user.avatar
                    }
                }));

                setPosts(prev => page === 1 ? newPosts : [...prev, ...newPosts]);
                setHasMore(!!data.next);
                setTotalCount(data.count);

            } catch (error) {
                console.error("Failed to fetch hashtag posts", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, [tag, page]);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Header */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
                            #{tag}
                        </h1>
                        <p className="text-gray-500 font-medium">
                            {totalCount} {totalCount === 1 ? 'Post' : 'Posts'}
                        </p>
                    </div>

                    {/* Posts */}
                    {posts.length === 0 && !loading ? (
                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                            <p className="text-gray-500">No posts found for #{tag}</p>
                        </div>
                    ) : (
                        posts.map((post, index) => {
                            const isLast = posts.length === index + 1;
                            return (
                                <div key={post.id} ref={isLast ? lastPostRef : null}>
                                    <PostCard post={post} currentUserId={user?.id} />
                                </div>
                            );
                        })
                    )}

                    {loading && (
                        <div className="py-8 flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-purple-600"></div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar */}
                <div className="hidden lg:block lg:col-span-1">
                    <RightSidebar />
                </div>
            </main>
        </div>
    );
};

export default HashtagFeed;
