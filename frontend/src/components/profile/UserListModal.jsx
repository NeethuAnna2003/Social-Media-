import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const UserListModal = ({ isOpen, onClose, username, type }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && username && type) {
            fetchUsers();
        } else {
            setUsers([]); // Reset on close or check
        }
    }, [isOpen, username, type]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const endpoint = `/accounts/users/${username}/${type}/`;
            const response = await api.get(endpoint);
            // Assuming response structure. Usually it's an array or a paginated 'results'
            setUsers(Array.isArray(response.data) ? response.data : response.data.results || []);
        } catch (error) {
            console.error(`Failed to fetch ${type}`, error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* 3D Modal Container */}
            <div className="relative w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden transform transition-all animate-fade-in-up perspective-1000">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200/50 flex justify-between items-center bg-white/50">
                    <h3 className="text-xl font-black text-gray-800 capitalize tracking-tight">
                        {type}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-black/5 rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* List Content */}
                <div className="h-[60vh] overflow-y-auto custom-scrollbar p-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <p className="font-medium">No users found.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {users.map((userItem, index) => {
                                // Sometimes the API returns { user: {...} } or just {...} depending on relationship model
                                // Accounts API for followers likely returns User objects directly or profiles.
                                // Let's handle generic fields.
                                // If mapped from Follow model, might be `follower` or `following_user` object.
                                // Let's visually inspect data via logs if needed, but for now assume standardized User Serializer logic
                                // or flattened response. 
                                // Adjust: The endpoint `UserFollowersListView` usually returns a list of Users (serializers.UserSerializer).

                                const u = userItem.user || userItem; // Fallback if nested
                                const displayName = u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.username;
                                const avatar = u.profile?.profile_pic || u.avatar || `https://ui-avatars.com/api/?name=${u.username}&background=random`;

                                return (
                                    <div
                                        key={u.id || index}
                                        className="group flex items-center justify-between p-3 rounded-xl bg-white/40 hover:bg-white/80 border border-transparent hover:border-purple-200 shadow-sm hover:shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5 hover:scale-[1.02]"
                                        onClick={() => {
                                            // Ensure we navigate to the public user profile route
                                            navigate(`/user/${u.username}`);
                                            onClose();
                                        }}
                                        style={{ animationDelay: `${index * 0.05}s` }} // Stagger effect if we added animation class
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <img
                                                    src={avatar}
                                                    alt={u.username}
                                                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm group-hover:border-purple-200 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 leading-tight group-hover:text-purple-700 transition-colors">
                                                    {displayName}
                                                </h4>
                                                <p className="text-xs text-gray-500 font-medium">@{u.username}</p>
                                            </div>
                                        </div>

                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 text-purple-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserListModal;
