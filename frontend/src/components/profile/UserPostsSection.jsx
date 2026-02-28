import { useState, useEffect } from 'react';
import PostCard from '../PostCard';
import PostDetailModal from './PostDetailModal';

const UserPostsSection = ({ posts, loading, username, currentUserId, isPrivateProfile }) => {
    const [activeTab, setActiveTab] = useState('photos'); // photos, videos, favorites
    const [selectedPost, setSelectedPost] = useState(null);
    const [likedPosts, setLikedPosts] = useState([]);
    const [loadingLiked, setLoadingLiked] = useState(false);

    // Fetch liked posts when tab changes
    useEffect(() => {
        if (activeTab === 'favorites' && username) {
            // Only fetch if it's my own profile (checked by backend too, but frontend optimization)
            if (currentUserId && (username === JSON.parse(localStorage.getItem('user'))?.username)) { // Fallback check or assume valid if UI allows
                fetchLikedPosts();
            }
        }
    }, [activeTab, username]);

    const fetchLikedPosts = async () => {
        setLoadingLiked(true);
        try {
            const response = await api.get(`/accounts/users/${username}/liked-posts/`);
            setLikedPosts(response.data.results || response.data || []);
        } catch (error) {
            console.error("Failed to fetch liked posts", error);
        } finally {
            setLoadingLiked(false);
        }
    };

    // Check if viewing own profile for Favorites tab visibility
    const isOwner = currentUserId && (username === JSON.parse(localStorage.getItem('user'))?.username); // Better to pass isOwner prop but this works

    // ... rest of filters ...

    const mediaPosts = posts.filter(post => post.image || (post.media && post.media.length > 0));

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
            </div>
        );
    }

    // Private Account Message
    if (isPrivateProfile) {
        return (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-200">
                <div className="inline-flex items-center justify-center p-4 bg-gray-100 rounded-full mb-4">
                    <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">This account is private</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                    Follow to see their posts.
                </p>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 border-dashed">
                <div className="inline-flex items-center justify-center p-4 bg-gray-50 rounded-full mb-4">
                    <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">No posts yet</h3>
                <p className="text-gray-500">
                    {username ? `${username} hasn't posted anything yet.` : "You haven't posted anything yet."}
                </p>
            </div>
        );
    }

    // Tabs Components
    const TabButton = ({ label, id }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex-1 pb-4 text-sm font-bold tracking-wide transition-all relative ${activeTab === id
                ? 'text-gray-900'
                : 'text-gray-400 hover:text-gray-600'
                }`}
        >
            {label}
            {activeTab === id && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900 rounded-full"></div>
            )}
        </button>
    );

    return (
        <div className="space-y-6">
            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-100 mb-6">
                <TabButton label="Photos" id="photos" />
                <TabButton label="Videos" id="videos" />
                <TabButton label="Favorites" id="favorites" />
            </div>

            {/* Content Area */}
            {activeTab === 'photos' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-6">
                    {mediaPosts.map(post => {
                        const mediaItem = post.media && post.media.length > 0 ? post.media[0] : null;
                        const mediaUrl = post.image || (mediaItem ? mediaItem.file : null);

                        if (!mediaUrl) return null;

                        const isVideo = (mediaItem && mediaItem.media_type === 'video') ||
                            (typeof mediaUrl === 'string' && mediaUrl.toLowerCase().match(/\.(mp4|mov|webm)$/));

                        return (
                            <div
                                key={post.id || post._id}
                                onClick={() => setSelectedPost(post)}
                                className="relative group aspect-square overflow-hidden bg-gray-100 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all"
                            >
                                {isVideo ? (
                                    <video
                                        src={mediaUrl}
                                        className="w-full h-full object-cover transform transition-transform duration-500"
                                        muted
                                        loop
                                        onMouseOver={event => event.target.play()}
                                        onMouseOut={event => event.target.pause()}
                                    />
                                ) : (
                                    <img
                                        src={mediaUrl}
                                        alt="Post media"
                                        className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
                                    />
                                )}

                                {/* Premium Overlay */}
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-6 text-white pointer-events-none">
                                    <div className="flex flex-col items-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                        <svg className="w-8 h-8 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                                        <span className="font-bold text-lg drop-shadow-md">{post.likes_count || 0}</span>
                                    </div>
                                    <div className="flex flex-col items-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                                        <svg className="w-8 h-8 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" /></svg>
                                        <span className="font-bold text-lg drop-shadow-md">{post.comments_count || 0}</span>
                                    </div>
                                    {isVideo && (
                                        <div className="absolute top-2 right-2">
                                            <svg className="w-6 h-6 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /></svg>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {/* Fallback if no media posts */}
                    {mediaPosts.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400 font-medium">
                            No photos shared yet.
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'videos' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-6">
                    {posts.filter(post => {
                        const mediaItem = post.media && post.media.length > 0 ? post.media[0] : null;
                        const mediaUrl = post.image || (mediaItem ? mediaItem.file : null);
                        if (!mediaUrl) return false;

                        return (mediaItem && mediaItem.media_type === 'video') ||
                            (typeof mediaUrl === 'string' && mediaUrl.toLowerCase().match(/\.(mp4|mov|webm)$/));
                    }).map(post => {
                        const mediaItem = post.media && post.media.length > 0 ? post.media[0] : null;
                        const mediaUrl = post.image || (mediaItem ? mediaItem.file : null);

                        return (
                            <div
                                key={post.id || post._id}
                                onClick={() => setSelectedPost(post)}
                                className="relative group aspect-square overflow-hidden bg-gray-100 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all"
                            >
                                <video
                                    src={mediaUrl}
                                    className="w-full h-full object-cover transform transition-transform duration-500"
                                    muted
                                    loop
                                    onMouseOver={event => event.target.play()}
                                    onMouseOut={event => event.target.pause()}
                                />

                                {/* Premium Overlay */}
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-6 text-white pointer-events-none">
                                    <div className="flex flex-col items-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                        <svg className="w-8 h-8 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                                        <span className="font-bold text-lg drop-shadow-md">{post.likes_count || 0}</span>
                                    </div>
                                    <div className="flex flex-col items-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                                        <svg className="w-8 h-8 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" /></svg>
                                        <span className="font-bold text-lg drop-shadow-md">{post.comments_count || 0}</span>
                                    </div>
                                    <div className="absolute top-2 right-2">
                                        <svg className="w-6 h-6 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /></svg>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Fallback */}
                    {posts.filter(post => {
                        const mediaItem = post.media && post.media.length > 0 ? post.media[0] : null;
                        const mediaUrl = post.image || (mediaItem ? mediaItem.file : null);
                        return mediaUrl && ((mediaItem && mediaItem.media_type === 'video') || (typeof mediaUrl === 'string' && mediaUrl.toLowerCase().match(/\.(mp4|mov|webm)$/)));
                    }).length === 0 && (
                            <div className="col-span-full py-20 text-center text-gray-400 font-medium">
                                <div className="inline-flex items-center justify-center p-4 bg-gray-50 rounded-full mb-4">
                                    <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <p>No videos shared yet.</p>
                            </div>
                        )}
                </div>
            )}

            {activeTab === 'favorites' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-6">
                    {loadingLiked ? (
                        <div className="col-span-full py-12 flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
                        </div>
                    ) : (
                        <>
                            {!isOwner ? (
                                <div className="col-span-full py-20 text-center text-gray-400 font-medium">
                                    <div className="inline-flex items-center justify-center p-4 bg-gray-50 rounded-full mb-4">
                                        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <p>Liked posts are private.</p>
                                </div>
                            ) : likedPosts.length === 0 ? (
                                <div className="col-span-full py-20 text-center text-gray-400 font-medium">
                                    <div className="inline-flex items-center justify-center p-4 bg-gray-50 rounded-full mb-4">
                                        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                    </div>
                                    <p>No favorites yet.</p>
                                </div>
                            ) : (
                                likedPosts.map(post => {
                                    const mediaItem = post.media && post.media.length > 0 ? post.media[0] : null;
                                    const mediaUrl = post.image || (mediaItem ? mediaItem.file : null);
                                    if (!mediaUrl) return null;

                                    const isVideo = (mediaItem && mediaItem.media_type === 'video') ||
                                        (typeof mediaUrl === 'string' && mediaUrl.toLowerCase().match(/\.(mp4|mov|webm)$/));

                                    return (
                                        <div
                                            key={post.id || post._id}
                                            onClick={() => setSelectedPost(post)}
                                            className="relative group aspect-square overflow-hidden bg-gray-100 rounded-xl cursor-pointer shadow-sm hover:shadow-md transition-all"
                                        >
                                            {isVideo ? (
                                                <video
                                                    src={mediaUrl}
                                                    className="w-full h-full object-cover transform transition-transform duration-500"
                                                    muted
                                                    loop
                                                    onMouseOver={event => event.target.play()}
                                                    onMouseOut={event => event.target.pause()}
                                                />
                                            ) : (
                                                <img
                                                    src={mediaUrl}
                                                    alt="Post media"
                                                    className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
                                                />
                                            )}

                                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-6 text-white pointer-events-none">
                                                <div className="flex flex-col items-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                                    <svg className="w-8 h-8 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                                                    <span className="font-bold text-lg drop-shadow-md">{post.likes_count || 0}</span>
                                                </div>
                                                <div className="flex flex-col items-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                                                    <svg className="w-8 h-8 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" /></svg>
                                                    <span className="font-bold text-lg drop-shadow-md">{post.comments_count || 0}</span>
                                                </div>
                                                {isVideo && (
                                                    <div className="absolute top-2 right-2">
                                                        <svg className="w-6 h-6 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /></svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </>
                    )}
                </div>
            )}

            <PostDetailModal
                post={selectedPost}
                isOpen={!!selectedPost}
                onClose={() => setSelectedPost(null)}
            />

            {/* If we wanted to keep the legacy feed view as an option, we could add a tab for it, but the user requested this specific UI. */}
        </div>
    );
};

export default UserPostsSection;
