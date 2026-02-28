import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const Search = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q');
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (query) {
            handleSearch(query);
        }
    }, [query]);

    const handleSearch = async (q) => {
        setLoading(true);
        try {
            const res = await api.get(`/accounts/search/?q=${q}`);
            setResults(res.data.results || res.data || []);
        } catch (e) {
            console.error(e);
            toast.error("Search failed");
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (user) => {
        try {
            if (user.is_following) {
                await api.post('/social/unfollow/', { username: user.username });
                toast.success(`Unfollowed ${user.username}`);
            } else {
                await api.post('/social/follow/', { username: user.username });
                toast.success(`Following ${user.username}`);
            }
            // Update local state
            setResults(prev => prev.map(u =>
                u.id === user.id ? { ...u, is_following: !u.is_following } : u
            ));
        } catch (e) {
            toast.error("Action failed");
        }
    };

    const handleMessage = async (user) => {
        try {
            const res = await api.post('/chat/threads/', { target_user_id: user.id });
            navigate(`/messages/${res.data.id}`);
        } catch (e) {
            toast.error("Failed to start chat");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-4xl mx-auto p-4 md:p-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Search Results</h1>
                    <p className="text-gray-500">Found {results.length} result(s) for "{query}"</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent"></div>
                    </div>
                ) : results.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                        <p className="mt-1 text-sm text-gray-500">Try searching for a different name or username.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                        {results.map(user => (
                            <div key={user.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/user/${user.username}`)}>
                                    <img
                                        src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}`}
                                        alt={user.username}
                                        className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm bg-gray-50"
                                    />
                                    <div>
                                        <h3 className="font-bold text-gray-900 leading-tight">{user.first_name} {user.last_name || ''}</h3>
                                        <p className="text-sm text-gray-500">@{user.username}</p>
                                        <div className="flex gap-2 text-xs text-gray-400 mt-1">
                                            <span>{user.followers_count || 0} followers</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 items-end">
                                    {currentUser?.id !== user.id ? (
                                        <>
                                            <button
                                                onClick={() => handleFollow(user)}
                                                className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${user.is_following
                                                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        : 'bg-black text-white hover:bg-gray-800 shadow-lg shadow-purple-500/20'
                                                    }`}
                                            >
                                                {user.is_following ? 'Following' : 'Follow'}
                                            </button>

                                            {user.is_following && (
                                                <div className="flex gap-2 mt-1">
                                                    <button
                                                        onClick={() => handleMessage(user)}
                                                        title="Message"
                                                        className="p-2 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => toast("Video call coming soon")}
                                                        title="Video Call"
                                                        className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">You</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Search;
