import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

const AdminReports = () => {
    const queryClient = useQueryClient();

    const { data: reportedPosts = [], isLoading, isError } = useQuery({
        queryKey: ['adminReports'],
        queryFn: async () => {
            // The backend endpoint "adminpanel/reports/" returns flagged posts
            const response = await api.get('/adminpanel/reports/');
            return response.data.results || response.data || [];
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (postId) => api.delete(`/adminpanel/posts/${postId}/`),
        onSuccess: () => {
            queryClient.invalidateQueries(['adminReports']);
            toast.success("Post deleted");
        },
        onError: () => toast.error("Failed to delete post")
    });

    // Resolving a report typically means taking action (Block or Approve)
    const resolveMutation = useMutation({
        mutationFn: async ({ postId, action }) => {
            if (action === 'safe') {
                return api.post(`/adminpanel/posts/${postId}/approve/`);
            } else if (action === 'blocked') {
                return api.post(`/adminpanel/posts/${postId}/reject/`);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['adminReports']);
            toast.success("Report resolved");
        },
        onError: () => toast.error("Failed to resolve report")
    });

    if (isLoading) return <div className="text-center p-10">Loading reports...</div>;
    if (isError) return <div className="text-center p-10 text-red-500">Error fetching reports</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Reported Content</h1>

            {reportedPosts.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center text-gray-500">
                    No reported content at the moment.
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Content</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Author</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reportedPosts.map((post) => (
                                <tr key={post.id} className="hover:bg-red-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 max-w-xs">{post.text}</div>
                                        {post.image && <span className="text-xs text-blue-500">[Image]</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{post.author_username || 'Unknown'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                            Flagged
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                                        <button
                                            onClick={() => resolveMutation.mutate({ postId: post.id, action: 'safe' })}
                                            className="text-green-600 hover:text-green-900 font-bold"
                                        >
                                            Dismiss (Safe)
                                        </button>
                                        <button
                                            onClick={() => resolveMutation.mutate({ postId: post.id, action: 'blocked' })}
                                            className="text-orange-600 hover:text-orange-900 font-bold"
                                        >
                                            Block
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Delete this post?')) {
                                                    deleteMutation.mutate(post.id)
                                                }
                                            }}
                                            className="text-red-600 hover:text-red-900 font-bold"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminReports;
