import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart
} from 'recharts';
import {
    ArrowTrendingUpIcon, HeartIcon, UserGroupIcon,
    ChatBubbleLeftRightIcon, PhotoIcon, SparklesIcon,
    CalendarDaysIcon, ClockIcon, UserPlusIcon,
    BoltIcon, RectangleGroupIcon, EyeIcon, ShieldCheckIcon
} from '@heroicons/react/24/outline';
import Layout from '../components/layout/Layout';
import api from '../api/axios';

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [wordFilterRequests, setWordFilterRequests] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await api.get('/analytics/dashboard/');
                setData(response.data);
            } catch (err) {
                const errorMessage = err.response?.data?.error || err.message || 'Failed to load dashboard data.';
                setError(errorMessage);
                console.error("Dashboard Error:", err);
            } finally {
                setLoading(false);
            }
        };

        const fetchWordFilterRequests = async () => {
            try {
                console.log('[Dashboard] Fetching word filter requests...');
                const response = await api.get('/posts/filter/requests/');
                console.log('[Dashboard] Word filter requests response:', response.data);
                console.log('[Dashboard] Is array?', Array.isArray(response.data));
                console.log('[Dashboard] Length:', response.data?.length);

                // Handle paginated response from DRF
                const data = response.data;
                if (data && typeof data === 'object' && 'results' in data) {
                    console.log('[Dashboard] Paginated response, using results');
                    setWordFilterRequests(Array.isArray(data.results) ? data.results : []);
                } else if (Array.isArray(data)) {
                    console.log('[Dashboard] Direct array response');
                    setWordFilterRequests(data);
                } else {
                    console.warn('[Dashboard] Unexpected format:', data);
                    setWordFilterRequests([]);
                }
            } catch (err) {
                console.error("[Dashboard] Word Filter Requests Error:", err);
                console.error("[Dashboard] Error details:", err.response);
                setWordFilterRequests([]);
            }
        };

        fetchDashboardData();
        fetchWordFilterRequests();
    }, []);

    if (loading) return (
        <Layout>
            <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-indigo-600 rounded-full animate-pulse opacity-20"></div>
                    </div>
                </div>
                <p className="text-gray-400 font-bold animate-pulse tracking-widest text-[10px] uppercase">Decrypting Performance Data...</p>
            </div>
        </Layout>
    );

    if (error) return (
        <Layout>
            <div className="h-[70vh] flex flex-col items-center justify-center text-center px-4">
                <div className="p-4 bg-red-50 rounded-full mb-4">
                    <BoltIcon className="w-12 h-12 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Sync Interrupted</h3>
                <p className="text-gray-500 max-w-sm mx-auto mb-6">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all"
                >
                    Retry Connection
                </button>
            </div>
        </Layout>
    );

    if (!data) return null;

    const SENTIMENT_COLORS = ['#10B981', '#F59E0B', '#EF4444'];
    const m = data.metrics || {};

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-600 mb-1">
                            <SparklesIcon className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Personal Intelligence</span>
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
                            Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Digital Pulse</span>
                        </h1>
                    </div>
                    <button
                        onClick={() => navigate('/settings/word-filters')}
                        className="flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer transform hover:scale-105"
                    >
                        <ShieldCheckIcon className="w-5 h-5 text-white" />
                        <span className="text-[11px] font-black text-white uppercase tracking-widest">Word Filters</span>
                    </button>
                </div>

                {/* Word Filter Requests Widget */}
                {wordFilterRequests.length > 0 && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-[2rem] shadow-lg border border-purple-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg">
                                    <ShieldCheckIcon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Your Word Filter Requests</h2>
                                    <p className="text-xs text-gray-600 font-medium">Track your filter requests and their status</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/settings/word-filters')}
                                className="text-xs font-bold text-purple-600 hover:text-purple-700 uppercase tracking-wider hover:underline"
                            >
                                View All →
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {wordFilterRequests.slice(0, 6).map((request) => (
                                <div
                                    key={request.id}
                                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                {request.status === 'pending' && (
                                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-black uppercase rounded-full flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span>
                                                        Pending
                                                    </span>
                                                )}
                                                {request.status === 'approved' && (
                                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-[10px] font-black uppercase rounded-full flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                                        Approved
                                                    </span>
                                                )}
                                                {request.status === 'rejected' && (
                                                    <span className="px-2 py-1 bg-red-100 text-red-800 text-[10px] font-black uppercase rounded-full flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                                        Rejected
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {request.requested_words.split(',').slice(0, 3).map((word, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded"
                                                    >
                                                        {word.trim()}
                                                    </span>
                                                ))}
                                                {request.requested_words.split(',').length > 3 && (
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded">
                                                        +{request.requested_words.split(',').length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-medium">
                                                {new Date(request.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    {request.admin_notes && (
                                        <div className="mt-2 p-2 bg-blue-50 rounded-lg border-l-2 border-blue-500">
                                            <p className="text-[10px] text-blue-900 font-medium">
                                                <strong>Admin:</strong> {request.admin_notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {wordFilterRequests.length > 6 && (
                            <div className="mt-4 text-center">
                                <button
                                    onClick={() => navigate('/settings/word-filters')}
                                    className="text-xs font-bold text-purple-600 hover:text-purple-700 uppercase tracking-wider"
                                >
                                    View All {wordFilterRequests.length} Requests →
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* 1. High-Impact Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        title="Pulse Content"
                        value={m.posts}
                        subtext="Posts created"
                        icon={<PhotoIcon className="w-5 h-5" />}
                        color="indigo"
                    />
                    <MetricCard
                        title="Social Resonance"
                        value={m.likes_received}
                        subtext="Total likes"
                        icon={<HeartIcon className="w-5 h-5" />}
                        color="rose"
                    />
                    <MetricCard
                        title="Interaction Hub"
                        value={m.comments_received}
                        subtext="Comments received"
                        icon={<ChatBubbleLeftRightIcon className="w-5 h-5" />}
                        color="violet"
                    />
                    <MetricCard
                        title="Network Reach"
                        value={m.followers}
                        subtext="Followers"
                        icon={<UserGroupIcon className="w-5 h-5" />}
                        color="emerald"
                    />
                </div>

                {/* 2. Main Analytics Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Engagement Trend with Rich Gradients */}
                    <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-gray-100 group">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                    Engagement Growth
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] uppercase font-black rounded-lg">30D Window</span>
                                </h3>
                                <p className="text-gray-400 text-xs mt-1 font-medium">Trajectory of likes across your content</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                                <ArrowTrendingUpIcon className="w-5 h-5 text-indigo-600" />
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.charts.likes_over_time}>
                                    <defs>
                                        <linearGradient id="colorLikesUser" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => val.slice(5)}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                        dx={-10}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#6366f1"
                                        fillOpacity={1}
                                        fill="url(#colorLikesUser)"
                                        strokeWidth={4}
                                        animationDuration={2000}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Vibe Check (Sentiment) */}
                    <div className="bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl flex flex-col group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110">
                            <SparklesIcon className="w-48 h-48 text-white" />
                        </div>

                        <div className="relative z-10 flex flex-col h-full">
                            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                                Content Vibe Check
                                <BoltIcon className="w-4 h-4 text-amber-400 animate-pulse" />
                            </h3>
                            <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mt-2 mb-8">Deep AI Sentiment Mapping</p>

                            <div className="flex-1 min-h-[220px] relative mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data.sentiment}
                                            cx="50%" cy="50%"
                                            innerRadius={70} outerRadius={95}
                                            paddingAngle={8}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {data.sentiment.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[index % SENTIMENT_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip dark />} />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            formatter={(value) => <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1">{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-4xl font-black text-white tracking-tighter">
                                        {data.sentiment.find(s => s.name === 'Positive')?.value || 0}%
                                    </span>
                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Positive</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Operational Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Interactions Section (Most Viewed - Proxy) */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                    Top Connections
                                    <UserGroupIcon className="w-5 h-5 text-indigo-600" />
                                </h3>
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Most engaged network based on interactions</p>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4">
                            {data.top_interactors && data.top_interactors.length > 0 ? (
                                data.top_interactors.map((user, idx) => (
                                    <div key={user.id} className="flex items-center justify-between group p-3 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate(`/user/${user.username}`)}>
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <img
                                                    src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}`}
                                                    alt={user.username}
                                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent group-hover:ring-indigo-100 transition-all"
                                                />
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white">
                                                    #{idx + 1}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900">{user.username}</h4>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Passionate Fan</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-black text-indigo-600">{user.interaction_score} pts</div>
                                            <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Resonance</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-50">
                                    <UserGroupIcon className="w-12 h-12 text-gray-200 mb-2" />
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No significant interactions yet</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Follower Growth Flow */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                    Growth Velocity
                                    <UserPlusIcon className="w-5 h-5 text-emerald-500" />
                                </h3>
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Network expansion trajectory</p>
                            </div>
                            <div className="text-2xl font-black text-emerald-500">+{m.followers}</div>
                        </div>

                        <div className="flex-1 h-64 mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.charts.follower_growth}>
                                    <XAxis dataKey="date" hide />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', radius: 8 }} />
                                    <Bar
                                        dataKey="count"
                                        fill="#10b981"
                                        radius={[8, 8, 8, 8]}
                                        barSize={20}
                                        animationDuration={2500}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-50">
                            <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Following</span>
                                <div className="text-xl font-black text-gray-900">{m.following}</div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estimated Impact</span>
                                <div className="text-xl font-black text-indigo-600">{m.profile_visits} pts</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Media Portfolio */}
                <div className="bg-white p-8 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.03)] border border-gray-100">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                Media Portfolio
                                <RectangleGroupIcon className="w-6 h-6 text-purple-600" />
                            </h3>
                            <p className="text-gray-400 text-xs font-medium italic">High-performance creative snapshots</p>
                        </div>
                        <button className="text-[10px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-colors tracking-widest border border-gray-100 px-6 py-2 rounded-2xl hover:bg-gray-50">View Gallery</button>
                    </div>

                    {data.media_gallery && data.media_gallery.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                            {data.media_gallery.map((media) => (
                                <div key={media.id} className="relative aspect-square rounded-[1.5rem] overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-2 border border-gray-50">
                                    <img src={media.image} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end pb-4 text-white">
                                        <div className="flex gap-3">
                                            <span className="flex items-center text-[10px] font-black"><HeartIcon className="w-3 h-3 mr-1 text-rose-500 fill-rose-500" /> {media.likes}</span>
                                            <span className="flex items-center text-[10px] font-black"><ChatBubbleLeftRightIcon className="w-3 h-3 mr-1 text-indigo-400" /> {media.comments}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-[2rem]">
                            <PhotoIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No telemetry recorded from media services</p>
                        </div>
                    )}
                </div>

                {/* 5. Top Content Table */}
                <div className="bg-white p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-gray-100 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Top Content Performance</h3>
                                <p className="text-indigo-600 text-[10px] font-bold uppercase tracking-widest mt-2">Ranked by resonance and engagement velocity</p>
                            </div>
                            <div className="hidden md:flex gap-2">
                                <div className="px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100 text-[10px] font-black text-indigo-600 uppercase tracking-widest">Global Ranking: #12</div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left border-b border-gray-100">
                                        <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Content Snapshot</th>
                                        <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Engagement Matrix</th>
                                        <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Resonance Rate</th>
                                        <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Published</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {data.top_content?.map((item, idx) => (
                                        <tr key={item.id} className="group/row hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0">
                                            <td className="py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl border border-gray-100 overflow-hidden flex-shrink-0 bg-gray-50 shadow-inner">
                                                        {item.media ? <img src={item.media} className="w-full h-full object-cover" /> : <PhotoIcon className="w-6 h-6 m-3 text-gray-300" />}
                                                    </div>
                                                    <div className="max-w-xs">
                                                        <p className="text-sm font-bold text-gray-900 line-clamp-1 group-hover/row:text-indigo-600 transition-colors">{item.content || "Legacy Post"}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Node ID: {item.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-6">
                                                <div className="flex items-center gap-8">
                                                    <div className="flex flex-col">
                                                        <div className="text-[9px] font-black text-gray-400 uppercase flex items-center gap-1.5 mb-1.5 tracking-widest"><HeartIcon className="w-3 h-3 text-rose-500" /> Reaction</div>
                                                        <div className="text-base font-black text-gray-900 tabular-nums tracking-tight">{item.likes.toLocaleString()}</div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="text-[9px] font-black text-gray-400 uppercase flex items-center gap-1.5 mb-1.5 tracking-widest"><ChatBubbleLeftRightIcon className="w-3 h-3 text-indigo-400" /> Threads</div>
                                                        <div className="text-base font-black text-gray-900 tabular-nums tracking-tight">{item.comments.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-6 text-center">
                                                <div className="inline-flex flex-col items-center">
                                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 mb-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                        <span className="text-xs font-black text-emerald-600">{item.engagement_rate}%</span>
                                                    </div>
                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Resonance</span>
                                                </div>
                                            </td>
                                            <td className="py-6 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs font-black text-gray-900 tracking-tighter">{item.created_at}</span>
                                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Timestamp</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="text-center py-6 text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">
                    Encrypted Knowledge Base • {new Date().getFullYear()} • Personal Node
                </div>
            </div>
        </Layout>
    );
};

// Advanced Premium Metric Card
const MetricCard = ({ title, value, subtext, icon, color }) => {
    const colorMap = {
        indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100 border-indigo-100 shadow-indigo-500/10 group-hover:bg-indigo-600',
        rose: 'bg-rose-50 text-rose-600 ring-rose-100 border-rose-100 shadow-rose-500/10 group-hover:bg-rose-600',
        violet: 'bg-violet-50 text-violet-600 ring-violet-100 border-violet-100 shadow-violet-500/10 group-hover:bg-violet-600',
        emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100 border-emerald-100 shadow-emerald-500/10 group-hover:bg-emerald-600',
    };

    return (
        <div className="bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-gray-100 relative overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-default">
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-600 transition-colors">{title}</p>
                    <div className="flex items-baseline gap-1 mt-1">
                        <p className="text-3xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors tracking-tighter leading-none">{value.toLocaleString()}</p>
                    </div>
                    <p className="text-[9px] font-bold text-gray-400 mt-2 opacity-60">{subtext}</p>
                </div>
                <div className={`p-4 rounded-2xl shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:shadow-2xl group-hover:text-white ${colorMap[color]}`}>
                    {icon}
                </div>
            </div>
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 group-hover:rotate-12 group-hover:scale-150 pointer-events-none">
                {icon}
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label, dark }) => {
    if (active && payload && payload.length) {
        return (
            <div className={`${dark ? 'bg-gray-900/95 ring-white/10' : 'bg-white/95 ring-black/5'} backdrop-blur-xl border border-transparent p-4 rounded-2xl shadow-2xl text-xs z-50 ring-1`}>
                <p className={`font-black uppercase tracking-widest mb-3 border-b pb-2 ${dark ? 'text-white border-white/10' : 'text-gray-800 border-gray-100'}`}>{label}</p>
                <div className="space-y-2">
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-4">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className={`flex-1 font-bold text-[10px] uppercase tracking-wider ${dark ? 'text-gray-300' : 'text-gray-500'}`}>{entry.name}</span>
                            <span className={`font-black ${dark ? 'text-white' : 'text-gray-900'}`}>{entry.value.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export default Dashboard;
