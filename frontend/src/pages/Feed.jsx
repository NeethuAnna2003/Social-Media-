import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import Navbar from '../components/Navbar';
import RightSidebar from '../components/RightSidebar';
import StoriesBar from '../components/stories/StoriesBar';


const Feed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [editingPost, setEditingPost] = useState(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState(null);

  // Observer for infinite scroll
  const observer = useRef();
  const lastPostElementRef = useCallback(node => {
    if (isLoading || isFetchingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMorePosts();
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, isFetchingMore, hasMore]);

  const mapPosts = (rawPosts) => {
    return rawPosts.map(post => ({
      ...post,
      _id: post.id,
      content: post.text,
      timestamp: post.created_at,
      likes: post.likes_count || 0,
      is_liked: post.has_liked,
      user: {
        ...post.user,
        avatar: post.user.profile_picture || post.user.avatar
      }
    }));
  };

  // Initial Fetch
  useEffect(() => {
    const fetchInitialPosts = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/posts/feed/?page=1');
        const data = response.data;

        const rawPosts = data.results || [];
        const mappedPosts = mapPosts(rawPosts); // Helper to map

        setPosts(mappedPosts);
        setHasMore(!!data.next);
        setPage(2); // Next page to fetch
      } catch (err) {
        console.error("Failed to fetch posts", err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialPosts();
  }, []);

  const loadMorePosts = async () => {
    if (!hasMore || isFetchingMore) return;

    try {
      setIsFetchingMore(true);
      const response = await api.get(`/posts/feed/?page=${page}`);
      const data = response.data;

      const rawPosts = data.results || [];
      const mappedPosts = mapPosts(rawPosts);

      setPosts(prev => [...prev, ...mappedPosts]);
      setHasMore(!!data.next);
      setPage(prev => prev + 1);
    } catch (err) {
      console.error("Failed to fetch more posts", err);
    } finally {
      setIsFetchingMore(false);
    }
  };

  // Handle post creation
  const handlePostCreated = (newPost) => {
    const mappedPost = {
      ...newPost,
      _id: newPost.id,
      content: newPost.text,
      timestamp: newPost.created_at,
      likes: newPost.likes_count || 0,
      is_liked: newPost.has_liked,
      user: {
        ...newPost.user,
        avatar: newPost.user.profile_picture || newPost.user.avatar
      }
    };
    setPosts([mappedPost, ...posts]);
  };

  // Handle post deletion
  const handlePostDeleted = (postId) => {
    setPosts(posts.filter(post => post._id !== postId && post.id !== postId));
  };

  // Handle post edit click
  const handlePostEdit = (post) => {
    setEditingPost(post);
  };

  const cancelEdit = () => {
    setEditingPost(null);
  };

  // Handle post update success
  const handlePostUpdated = (updatedPost) => {
    const mappedPost = {
      ...updatedPost,
      _id: updatedPost.id,
      content: updatedPost.text,
      timestamp: updatedPost.created_at,
      likes: updatedPost.likes_count || 0,
      is_liked: updatedPost.has_liked,
      user: {
        ...updatedPost.user,
        avatar: updatedPost.user.profile_picture || updatedPost.user.avatar
      }
    };

    setPosts(posts.map(p => (p._id === updatedPost.id || p.id === updatedPost.id) ? mappedPost : p));
    setEditingPost(null);
  };

  // Handle post like/unlike
  const handlePostLiked = (postId) => {
    // Optimistic update handled in PostCard
  };

  if (isLoading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center p-8 bg-white/50 backdrop-blur-xl rounded-3xl shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Curating your feed...</p>
        </div>
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-md border-l-4 border-red-500 p-8 rounded-2xl max-w-xl w-full shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full text-red-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Unable to load feed</h3>
              <p className="text-gray-500 mt-1">Please check your connection and try again.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 text-gray-900 font-sans selection:bg-purple-200 selection:text-gray-900 relative overflow-hidden">

      {/* Animated gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-100/30 via-transparent to-pink-100/30 animate-gradient-shift"></div>

      <Navbar />

      <main className="max-w-7xl mx-auto px-4 pt-24 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 perspective-1000">

        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">

          {/* Stories - Floating Circles Row */}
          <div className="mb-4 -mx-2">
            <StoriesBar currentUser={user} />
          </div>

          {/* Create Post - Floating */}
          <div className="transform transition-all duration-500 hover:translate-y-[-4px]">
            <CreatePost onPostCreated={handlePostCreated} />
          </div>

          {/* Posts List - Staggered 3D Entrance */}
          <div className="space-y-10">
            {posts.length === 0 && !isLoading ? (
              <div className="relative py-32 text-center mx-4">
                <div className="absolute inset-0 bg-white/30 backdrop-blur-xl rounded-[3rem] shadow-depth-2 transform rotate-1"></div>
                <div className="relative z-10 flex flex-col items-center justify-center p-8">
                  <div className="w-20 h-20 bg-gradient-to-tr from-white to-indigo-50 rounded-full flex items-center justify-center shadow-depth-float animate-float mb-6">
                    <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Quiet Space</h3>
                  <p className="mt-3 text-gray-500 max-w-xs font-medium leading-relaxed">
                    Your feed is waiting for the first spark. Share something to begin.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {posts.map((post, index) => {
                  const isLast = posts.length === index + 1;
                  return (
                    <div
                      key={post._id || index}
                      ref={isLast ? lastPostElementRef : null}
                      style={{ animationDelay: `${index * 150}ms` }}
                      className="animate-fade-in-up backface-hidden"
                    >
                      <PostCard
                        post={post}
                        onLike={handlePostLiked}
                        onDelete={handlePostDeleted}
                        onEdit={handlePostEdit}
                        currentUserId={user?.id || user?._id}
                      />
                    </div>
                  );
                })}
              </>
            )}

            {isFetchingMore && (
              <div className="py-12 flex justify-center w-full">
                <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-depth-1 ai-pulse">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-100 border-t-indigo-600"></div>
                  <span className="text-xs font-bold text-indigo-900 tracking-wider uppercase">Loading</span>
                </div>
              </div>
            )}

            {!hasMore && posts.length > 5 && (
              <div className="py-20 text-center opacity-50 hover:opacity-100 transition-opacity">
                <div className="inline-block px-6 py-2 rounded-full border border-gray-200 text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                  End of Stream
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Spatial sticky */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-32 transition-all duration-500">
            <RightSidebar />
          </div>
        </div>
      </main>

      {/* Edit Post Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-2xl transform scale-100 animate-in fade-in zoom-in-95 duration-300">
            <CreatePost
              onPostCreated={handlePostUpdated}
              postToEdit={editingPost}
              onCancel={cancelEdit}
            />
          </div>
        </div>
      )}


    </div>
  );
};

export default Feed;