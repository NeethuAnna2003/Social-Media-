import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

const AdminPosts = () => {
    const [search, setSearch] = useState('');
    const queryClient = useQueryClient();

    const { data: posts = [], isLoading, isError } = useQuery({
        queryKey: ['adminPosts', search],
        queryFn: async () => {
            const response = await api.get(`/adminpanel/posts/?search=${search}`);
            return response.data.results || response.data || [];
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (postId) => api.delete(`/adminpanel/posts/${postId}/`),
        onSuccess: () => {
            queryClient.invalidateQueries(['adminPosts']);
            toast.success("Post deleted");
        },
        onError: () => toast.error("Failed to delete post")
    });

    const approveMutation = useMutation({
        mutationFn: (postId) => api.post(`/adminpanel/posts/${postId}/approve/`),
        onSuccess: () => {
            queryClient.invalidateQueries(['adminPosts']);
            toast.success("Post approved");
        },
        onError: () => toast.error("Failed to approve post")
    });

    const rejectMutation = useMutation({
        mutationFn: (postId) => api.post(`/adminpanel/posts/${postId}/reject/`),
        onSuccess: () => {
            queryClient.invalidateQueries(['adminPosts']);
            toast.success("Post blocked");
        },
        onError: () => toast.error("Failed to block post")
    });

    if (isLoading) return <div className="text-center p-10">Loading posts...</div>;
    if (isError) return <div className="text-center p-10 text-red-500">Error fetching posts</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Post Management</h1>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search posts..."
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
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Content</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Author</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {posts.map((post) => (
                            <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900 max-w-xs truncate">{post.text}</div>
                                    {post.image && <span className="text-xs text-blue-500">[Image]</span>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{post.author_username || 'Unknown'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${post.ai_status === 'flagged' ? 'bg-red-100 text-red-800' : post.ai_status === 'blocked' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'}`}>
                                        {post.ai_status || 'Safe'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(post.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                                    <button
                                        onClick={() => approveMutation.mutate(post.id)}
                                        disabled={approveMutation.isPending}
                                        className="text-green-600 hover:text-green-900 font-bold disabled:opacity-50"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => rejectMutation.mutate(post.id)}
                                        disabled={rejectMutation.isPending}
                                        className="text-orange-600 hover:text-orange-900 font-bold disabled:opacity-50"
                                    >
                                        Block
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to delete this post?')) {
                                                deleteMutation.mutate(post.id)
                                            }
                                        }}
                                        disabled={deleteMutation.isPending}
                                        className="text-red-600 hover:text-red-900 font-bold disabled:opacity-50"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {posts.length === 0 && (
                            <tr>
                                <td colSpan="5" className="text-center py-10 text-gray-500">No posts found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminPosts;
