import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const RightSidebar = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Trending Hashtags
        const trendsRes = await api.get('/analytics/trending-hashtags/');
        setTrends(trendsRes.data || []);

        // Fetch Suggested Users from new analytics endpoint
        const suggestionsRes = await api.get('/analytics/suggestions/');
        setSuggestions(suggestionsRes.data || []);

        setLoading(false);

      } catch (error) {
        console.error("Error fetching right sidebar data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFollow = async (userId, username) => {
    try {
      await api.post('/social/follow/', { username });

      setSuggestions(suggestions.map(user =>
        user.id === userId ? { ...user, isFollowing: true } : user
      ));
    } catch (err) {
      console.error('Follow failed:', err);
    }
  };

  const [showAll, setShowAll] = useState(false);
  const displayedTrends = showAll ? trends : trends.slice(0, 5);

  if (loading) {
    return <div className="hidden lg:block w-80 bg-gray-100/50 animate-pulse h-96 rounded-xl"></div>;
  }

  return (
    <div className="hidden lg:block w-80 sticky top-28 max-h-[calc(100vh-8rem)] flex flex-col perspective-1000">

      {/* Scrollable Content Container */}
      <div className="overflow-y-auto space-y-6 flex-1 pr-2 custom-scrollbar">
        {/* Trending Section - Floating Glass Panel */}
        <div className="bg-white/40 backdrop-blur-xl rounded-[2rem] shadow-sm hover:shadow-depth-1 border border-white/50 p-6 transition-all duration-300">
          <div className="flex items-center space-x-2 mb-6">
            <div className="p-1.5 bg-pink-100 rounded-lg">
              <span className="text-xl">🔥</span>
            </div>
            <h3 className="font-extrabold text-lg text-gray-900 tracking-tight">
              Trending <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">Now</span>
            </h3>
          </div>

          <div className="space-y-1">
            {displayedTrends.length > 0 ? (
              displayedTrends.map((tag, idx) => (
                <Link
                  key={idx}
                  to={`/hashtags/${tag.hashtag.replace('#', '')}`}
                  className="group flex items-center justify-between py-2 px-3 hover:bg-white/60 rounded-xl transition-all duration-200 cursor-pointer -mx-3"
                >
                  <div>
                    <div className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">
                      {tag.hashtag}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-0.5">
                      {tag.total_posts} posts
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-gray-400 text-sm italic">The world is quiet right now.</p>
            )}
          </div>

          {trends.length > 5 && (
            <div className="mt-4 pt-3 border-t border-indigo-50/50">
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 focus:outline-none transition-colors uppercase tracking-wide flex items-center gap-1"
              >
                {showAll ? "Show less" : "View all trends"}
              </button>
            </div>
          )}
        </div>

        {/* Suggestions Section - Floating Glass Panel */}
        <div className="bg-white/40 backdrop-blur-xl rounded-[2rem] shadow-sm hover:shadow-depth-1 border border-white/50 p-6 transition-all duration-300 delay-100">
          <h3 className="font-black text-xs text-gray-400 uppercase tracking-[0.2em] mb-5 pl-1">Suggested for you</h3>
          <div className="space-y-5">
            {suggestions.length > 0 ? suggestions.slice(0, 5).map((user) => (
              <div key={user.id} className="flex items-start justify-between group">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div className="relative flex-shrink-0">
                    <img
                      src={user.profile_pic || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
                      alt={user.username}
                      className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-sm group-hover:scale-105 transition-transform duration-300"
                    />
                    {user.suggestion_type === 'new' && (
                      <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-purple-400 to-pink-400 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-[8px]">✨</span>
                      </div>
                    )}
                    {user.suggestion_type === 'mutual' && (
                      <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-400 to-indigo-400 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-[8px]">🤝</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/user/${user.username}`}
                      className="font-bold text-sm text-gray-900 group-hover:text-indigo-600 transition-colors block truncate"
                    >
                      {user.username}
                    </Link>
                    {user.reason && (
                      <p className="text-[10px] font-medium text-gray-500 mt-0.5 truncate">
                        {user.reason}
                      </p>
                    )}
                    {user.bio && (
                      <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">
                        {user.bio}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[9px] text-gray-400 font-medium">
                      <span>{user.followers_count || 0} followers</span>
                      {user.is_private && (
                        <span className="flex items-center gap-0.5">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          Private
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {!user.isFollowing && (
                  <button
                    onClick={() => handleFollow(user.id, user.username)}
                    className="text-xs font-bold px-4 py-2 rounded-full transition-all duration-300 transform active:scale-95 shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/30 flex-shrink-0 ml-2"
                  >
                    Follow
                  </button>
                )}
                {user.isFollowing && (
                  <button
                    disabled
                    className="text-xs font-bold px-4 py-2 rounded-full transition-all duration-300 bg-gray-100 text-gray-400 cursor-default flex-shrink-0 ml-2"
                  >
                    {user.is_private ? 'Requested' : 'Following'}
                  </button>
                )}
              </div>
            )) : (
              <p className="text-gray-400 text-sm italic">No suggestions available</p>
            )}
          </div>
        </div>

      </div>

      {/* Footer - Always visible at bottom */}
      <div className="text-[10px] font-bold text-gray-300 px-4 py-4 uppercase tracking-widest flex justify-between items-center flex-shrink-0">
        <p>© 2024 Connectify AI</p>
        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
        <p>Privacy</p>
      </div>
    </div>
  );
};

export default RightSidebar;
