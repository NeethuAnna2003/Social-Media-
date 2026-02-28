import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

const AdminUsers = () => {
    const [search, setSearch] = useState('');
    const queryClient = useQueryClient();

    const { data: users = [], isLoading, isError } = useQuery({
        queryKey: ['adminUsers', search],
        queryFn: async () => {
            // If search is empty, backend handles it (returns all) or filtered
            const response = await api.get(`/adminpanel/users/?search=${search}`);
            return response.data.results || response.data || [];
        }
    });

    const banMutation = useMutation({
        mutationFn: (userId) => api.post(`/adminpanel/users/${userId}/ban/`),
        onSuccess: () => {
            queryClient.invalidateQueries(['adminUsers']);
            toast.success("User banned successfully");
        },
        onError: () => toast.error("Failed to ban user")
    });

    const unbanMutation = useMutation({
        mutationFn: (userId) => api.post(`/adminpanel/users/${userId}/unban/`),
        onSuccess: () => {
            queryClient.invalidateQueries(['adminUsers']);
            toast.success("User activated successfully");
        },
        onError: () => toast.error("Failed to unban user")
    });

    const makeAdminMutation = useMutation({
        mutationFn: (userId) => api.post(`/adminpanel/users/${userId}/make_admin/`),
        onSuccess: () => {
            queryClient.invalidateQueries(['adminUsers']);
            toast.success("User promoted to Admin");
        },
        onError: () => toast.error("Failed to promote user")
    });

    const removeAdminMutation = useMutation({
        mutationFn: (userId) => api.post(`/adminpanel/users/${userId}/remove_admin/`),
        onSuccess: () => {
            queryClient.invalidateQueries(['adminUsers']);
            toast.success("User removed from Admin");
        },
        onError: () => toast.error("Failed to demote user")
    });

    if (isLoading) return <div className="text-center p-10">Loading users...</div>;
    if (isError) return <div className="text-center p-10 text-red-500">Error fetching users</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10">
                                            <img className="h-10 w-10 rounded-full object-cover" src={user.profile_pic || `https://ui-avatars.com/api/?name=${user.username}`} alt="" />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-bold text-gray-900">{user.username}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {user.is_active ? 'Active' : 'Banned'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {user.is_admin ? (
                                        <span className="text-purple-600 font-bold">Admin</span>
                                    ) : (
                                        <span>User</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                                    {user.is_active ? (
                                        <button
                                            onClick={() => banMutation.mutate(user.id)}
                                            disabled={banMutation.isPending}
                                            className="text-red-600 hover:text-red-900 font-bold disabled:opacity-50"
                                        >
                                            Ban
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => unbanMutation.mutate(user.id)}
                                            disabled={unbanMutation.isPending}
                                            className="text-green-600 hover:text-green-900 font-bold disabled:opacity-50"
                                        >
                                            Unban
                                        </button>
                                    )}

                                    {!user.is_admin ? (
                                        <button
                                            onClick={() => makeAdminMutation.mutate(user.id)}
                                            disabled={makeAdminMutation.isPending}
                                            className="text-blue-600 hover:text-blue-900 font-bold disabled:opacity-50"
                                        >
                                            Promote
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => removeAdminMutation.mutate(user.id)}
                                            disabled={removeAdminMutation.isPending}
                                            className="text-orange-600 hover:text-orange-900 font-bold disabled:opacity-50"
                                        >
                                            Demote
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan="4" className="text-center py-10 text-gray-500">No users found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminUsers;

