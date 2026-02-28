import { useState, useEffect } from 'react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ComposedChart, FunnelChart, Funnel, LabelList
} from 'recharts';
import {
    UsersIcon, DocumentTextIcon, HeartIcon, BoltIcon,
    ArrowTrendingUpIcon, ArrowTrendingDownIcon, CalendarIcon
} from '@heroicons/react/24/outline';
import api from '../api/axios';

const AdminDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateFilter, setDateFilter] = useState('30d'); // UI state only for now

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const response = await api.get('/analytics/admin-dashboard/');
                setData(response.data);
            } catch (err) {
                console.error(err);
                setError("Failed to load analytics data.");
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 text-red-500 font-bold">
            {error}
        </div>
    );

    if (!data) return null;

    // --- Components ---

    const KpiCard = ({ title, value, growth, icon: Icon, color }) => (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                <Icon className={`w-24 h-24 text-${color}-500`} />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`p-2 rounded-lg bg-${color}-50 text-${color}-600`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-gray-500 font-medium text-sm">{title}</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</div>
                </div>

                {growth !== undefined && (
                    <div className={`flex items-center mt-4 text-xs font-bold ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {growth >= 0 ? <ArrowTrendingUpIcon className="w-3 h-3 mr-1" /> : <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />}
                        {Math.abs(growth)}%
                        <span className="text-gray-400 font-normal ml-1">vs last month</span>
                    </div>
                )}
            </div>
        </div>
    );

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/90 backdrop-blur border border-gray-100 p-3 rounded-xl shadow-xl text-xs">
                    <p className="font-bold text-gray-700 mb-1">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 text-gray-600">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span>{entry.name}:</span>
                            <span className="font-bold">{entry.value.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-1">Real-time system performance and analytics overview.</p>
                </div>

                <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                    {['24h', '7d', '30d', 'All'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setDateFilter(filter.toLowerCase())}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${dateFilter === filter.toLowerCase()
                                    ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                    <button className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-indigo-600 flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        Custom
                    </button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KpiCard
                    title="Total Users"
                    value={data.kpi.users.value}
                    growth={data.kpi.users.growth}
                    icon={UsersIcon}
                    color="indigo"
                />
                <KpiCard
                    title="Total Posts"
                    value={data.kpi.posts.value}
                    growth={data.kpi.posts.growth}
                    icon={DocumentTextIcon}
                    color="blue"
                />
                <KpiCard
                    title="Engagement"
                    value={data.kpi.engagement.value}
                    growth={data.kpi.engagement.growth}
                    icon={HeartIcon}
                    color="rose"
                />
                <KpiCard
                    title="AI Moderation"
                    value={data.kpi.ai_flagged.value}
                    growth={0}
                    icon={BoltIcon}
                    color="amber"
                />
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                {/* User Growth */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-800">User Growth</h3>
                        <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-bold">
                            + {data.kpi.users.growth}%
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.user_growth.daily}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => val.slice(5)} // Show MM-DD
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="users"
                                    stroke="#4f46e5"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorUsers)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Funnel */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-6">Conversion Funnel</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <FunnelChart>
                                <Tooltip content={<CustomTooltip />} />
                                <Funnel
                                    dataKey="value"
                                    data={data.funnel}
                                    isAnimationActive
                                >
                                    <LabelList position="right" fill="#6b7280" stroke="none" dataKey="stage" />
                                </Funnel>
                            </FunnelChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="text-center mt-4 text-xs text-gray-400">
                        Uploads → Published → Engaged
                    </div>
                </div>
            </div>

            {/* Secondary Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                {/* Engagement Trends */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-6">Engagement Trends</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.engagement_chart}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => val.slice(5)}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Line
                                    type="monotone"
                                    dataKey="likes"
                                    stroke="#f43f5e"
                                    strokeWidth={2}
                                    dot={false}
                                    name="Likes"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="comments"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    dot={false}
                                    name="Comments"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Usage */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-6">AI Feature Usage</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.ai_usage} stacked>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => val.slice(5)}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Bar dataKey="Safe Content" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="Flagged Content" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Content Table */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-6">Top Performing Content</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 font-medium">Post Content</th>
                                <th className="px-6 py-3 font-medium text-center">Likes</th>
                                <th className="px-6 py-3 font-medium text-center">Comments</th>
                                <th className="px-6 py-3 font-medium text-right">Total Engagement</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.top_content.map((post, idx) => (
                                <tr key={idx} className="bg-white border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-xs">{post.name}</td>
                                    <td className="px-6 py-4 text-center text-gray-600">{post.likes.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center text-gray-600">{post.comments.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                            {post.engagement.toLocaleString()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 text-center text-xs text-gray-400">
                Connectify AI Analytics • Admin Panel • {new Date().getFullYear()}
            </div>
        </div>
    );
};

export default AdminDashboard;
