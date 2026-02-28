import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

const AdminAnalytics = () => {
    const { data: analytics, isLoading, isError } = useQuery({
        queryKey: ['adminAnalytics'],
        queryFn: async () => {
            const response = await api.get('/adminpanel/analytics/');
            return response.data;
        }
    });

    if (isLoading) return <div className="text-center p-10">Loading Analytics...</div>;
    if (isError) return <div className="text-center p-10 text-red-500">Error loading analytics</div>;

    // Transform data for charts if necessary, currently backend returns compatible format
    // posts_per_day: [{date: '2023-01-01', count: 10}, ...]

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Platform Analytics</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Posts Growth Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Content Growth (Last 7 Days)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics?.posts_per_day}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(val) => val.slice(5)} />
                                <YAxis allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="count" name="Posts" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Moderation Stats */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Content Moderation</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                            <span className="font-bold text-green-800">Safe Content</span>
                            <span className="text-2xl font-black text-green-600">{analytics?.moderation_stats?.safe || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl">
                            <span className="font-bold text-orange-800">Flagged For Review</span>
                            <span className="text-2xl font-black text-orange-600">{analytics?.moderation_stats?.flagged || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                            <span className="font-bold text-red-800">Blocked Content</span>
                            <span className="text-2xl font-black text-red-600">{analytics?.moderation_stats?.blocked || 0}</span>
                        </div>
                    </div>
                </div>

                {/* User Growth */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 lg:col-span-2">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">New User Registrations</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics?.new_users_growth}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tickFormatter={(val) => val.slice(5)} />
                                <YAxis allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Bar dataKey="count" name="New Users" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;
