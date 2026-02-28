import { useState, useEffect } from 'react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList,
    ComposedChart
} from 'recharts';
import {
    UsersIcon, DocumentTextIcon, HeartIcon, BoltIcon,
    ArrowTrendingUpIcon, ArrowTrendingDownIcon, CalendarIcon,
    SparklesIcon, ChartBarIcon, CursorArrowRaysIcon
} from '@heroicons/react/24/outline';
import api from '../../api/axios';

const AdminDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const response = await api.get('/analytics/admin-dashboard/');
                setData(response.data);
                setError(null);
            } catch (err) {
                console.error(err);
                setError("Failed to load analytics data. Please ensure the backend server is running and you have admin privileges.");
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return (
        <div className="flex flex-col h-[70vh] items-center justify-center space-y-4">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full animate-pulse opacity-20"></div>
                </div>
            </div>
            <p className="text-gray-400 font-bold animate-pulse uppercase tracking-widest text-xs">Synchronizing Core Metrics...</p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col h-[70vh] items-center justify-center space-y-6">
            <div className="p-4 bg-red-50 rounded-full">
                <BoltIcon className="w-12 h-12 text-red-500" />
            </div>
            <div className="text-center max-w-md">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Telemetry Interrupted</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{error}</p>
            </div>
            <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors"
            >
                Retry Connection
            </button>
        </div>
    );

    if (!data) return null;

    const KpiCard = ({ title, value, growth, icon: Icon, color, subtext }) => {
        const colorVariants = {
            indigo: 'bg-indigo-50 text-indigo-600 shadow-indigo-100 group-hover:bg-indigo-600 group-hover:text-white',
            blue: 'bg-blue-50 text-blue-600 shadow-blue-100 group-hover:bg-blue-600 group-hover:text-white',
            rose: 'bg-rose-50 text-rose-600 shadow-rose-100 group-hover:bg-rose-600 group-hover:text-white',
            amber: 'bg-amber-50 text-amber-600 shadow-amber-100 group-hover:bg-amber-600 group-hover:text-white',
        };

        return (
            <div className="bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                <div className={`absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12 group-hover:rotate-0 duration-700`}>
                    <Icon className={`w-32 h-32 text-${color}-600`} />
                </div>
                <div className="relative z-10 text-gray-500 group-hover:text-white transition-colors duration-300">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2.5 rounded-2xl transition-all duration-500 ${colorVariants[color]}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-black text-[10px] uppercase tracking-widest leading-none group-hover:text-white/80">{title}</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <div className="text-4xl font-black text-gray-900 group-hover:text-white tracking-tighter leading-none transition-colors">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                        </div>
                        {growth !== undefined && (
                            <div className={`flex items-center mb-1 text-xs font-black ${growth >= 0 ? 'text-emerald-500 group-hover:text-emerald-300' : 'text-rose-500 group-hover:text-rose-300'}`}>
                                {growth >= 0 ? '▲' : '▼'} {Math.abs(growth)}%
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] mt-2 font-medium opacity-60">{subtext || "Real-time telemetry"}</p>
                </div>
                <div className={`absolute bottom-0 left-0 w-full h-1 bg-${color}-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500`}></div>
            </div>
        );
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl text-xs z-50 ring-1 ring-white/20">
                    <p className="font-black text-white mb-3 border-b border-white/10 pb-2 uppercase tracking-widest">{label}</p>
                    <div className="space-y-2">
                        {payload.map((entry, index) => (
                            <div key={index} className="flex items-center gap-4 text-gray-300">
                                <span className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)]" style={{ backgroundColor: entry.color }} />
                                <span className="flex-1 font-bold text-[10px] uppercase tracking-wider">{entry.name}</span>
                                <span className="font-black text-white text-sm">{entry.value.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="pb-12 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Super Premium Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 text-indigo-600">
                        <ChartBarIcon className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Operational Intelligence</span>
                    </div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter">
                        Nexus <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Analytics</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100/50 backdrop-blur-sm p-1.5 rounded-2xl border border-gray-200">
                        {['Overview', 'Activity', 'Safety'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab.toLowerCase())}
                                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${activeTab === tab.toLowerCase()
                                    ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-500/10'
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                    title="Global Users"
                    value={data.kpi.users.value}
                    growth={data.kpi.users.growth}
                    icon={UsersIcon}
                    color="indigo"
                    subtext="Account registration velocity"
                />
                <KpiCard
                    title="Platform Content"
                    value={data.kpi.posts.value}
                    growth={data.kpi.posts.growth}
                    icon={DocumentTextIcon}
                    color="blue"
                    subtext="Posts, threads and media"
                />
                <KpiCard
                    title="Engagement Hub"
                    value={data.kpi.engagement.value}
                    growth={data.kpi.engagement.growth}
                    icon={HeartIcon}
                    color="rose"
                    subtext="Likes and comments aggregate"
                />
                <KpiCard
                    title="AI Moderation"
                    value={data.kpi.ai_flagged.value}
                    growth={data.kpi.ai_flagged.growth}
                    icon={BoltIcon}
                    color="amber"
                    subtext="Health shield violations"
                />
            </div>

            {/* Main Operational Timeline (Plotly-like high quality line chart) */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-gray-100">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            App Activities Timeline
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] uppercase font-black rounded-lg">Last 30 Days</span>
                        </h3>
                        <p className="text-gray-400 text-xs mt-1 font-medium italic">Consolidated telemetry across all core services</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-indigo-500 rounded-full shadow-lg shadow-indigo-200"></div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Posts</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-rose-500 rounded-full shadow-lg shadow-rose-200"></div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Engagement</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-amber-500 rounded-full shadow-lg shadow-amber-200"></div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Stories</span>
                        </div>
                    </div>
                </div>

                <div className="h-[400px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data.app_activity}>
                            <defs>
                                <linearGradient id="gradientPosts" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradientLikes" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradientStories" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradientComments" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => val.slice(5)}
                                dy={15}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                                tickLine={false}
                                axisLine={false}
                                dx={-15}
                            />
                            <Tooltip content={<CustomTooltip />} />

                            {/* Colorful Areas */}
                            <Area type="monotone" dataKey="posts" fill="url(#gradientPosts)" stroke="none" />
                            <Area type="monotone" dataKey="likes" fill="url(#gradientLikes)" stroke="none" />
                            <Area type="monotone" dataKey="comments" fill="url(#gradientComments)" stroke="none" />
                            <Area type="monotone" dataKey="stories" fill="url(#gradientStories)" stroke="none" />

                            {/* Bold Lines */}
                            <Line
                                type="monotone"
                                dataKey="posts"
                                stroke="#6366f1"
                                strokeWidth={4}
                                dot={{ fill: '#6366f1', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                                name="Posts Created"
                            />
                            <Line
                                type="monotone"
                                dataKey="likes"
                                stroke="#f43f5e"
                                strokeWidth={3}
                                dot={false}
                                name="Likes"
                            />
                            <Line
                                type="monotone"
                                dataKey="comments"
                                stroke="#8b5cf6"
                                strokeWidth={3}
                                dot={false}
                                name="Comments"
                            />
                            <Line
                                type="monotone"
                                dataKey="stories"
                                stroke="#f59e0b"
                                strokeWidth={4}
                                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                name="Stories"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom Section: Mixed Visuals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* AI Safety Distribution */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">AI Safety Shield</h3>
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Automatic Content Moderation Performance</p>
                        </div>
                        <SparklesIcon className="w-8 h-8 text-amber-500 opacity-20" />
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.ai_usage}>
                                <defs>
                                    <linearGradient id="safeGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="flaggedGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" hide />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="step"
                                    dataKey="Safe"
                                    stroke="#10b981"
                                    strokeWidth={4}
                                    fill="url(#safeGradient)"
                                    animationDuration={2500}
                                />
                                <Area
                                    type="step"
                                    dataKey="Flagged"
                                    stroke="#f43f5e"
                                    strokeWidth={3}
                                    fill="url(#flaggedGradient)"
                                    animationDuration={3000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between mt-6 pt-6 border-t border-gray-50">
                        <div className="text-center">
                            <div className="text-xs font-black text-gray-400 uppercase mb-1">Total Scanned</div>
                            <div className="text-xl font-black text-gray-900">{data.kpi.posts.value.toLocaleString()}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs font-black text-gray-400 uppercase mb-1">Flagged Rate</div>
                            <div className="text-xl font-black text-rose-500">
                                {data.kpi.posts.value > 0 ? ((data.kpi.ai_flagged.value / data.kpi.posts.value) * 100).toFixed(1) : 0}%
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs font-black text-gray-400 uppercase mb-1">Health Score</div>
                            <div className="text-xl font-black text-emerald-500">98.4%</div>
                        </div>
                    </div>
                </div>

                {/* Conversion Funnel */}
                <div className="bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12">
                        <CursorArrowRaysIcon className="w-64 h-64 text-white" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-black text-white tracking-tight leading-none">Content Lifecycle</h3>
                        <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mt-2">Conversion efficiency through platform stages</p>

                        <div className="h-[280px] w-full mt-8">
                            <ResponsiveContainer width="100%" height="100%">
                                <FunnelChart>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Funnel
                                        dataKey="value"
                                        data={data.funnel.map((s, i) => ({
                                            ...s,
                                            fill: ['#6366f1', '#a855f7', '#ec4899'][i % 3]
                                        }))}
                                        isAnimationActive
                                    >
                                        <LabelList position="right" fill="#fff" stroke="none" dataKey="stage" style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} />
                                    </Funnel>
                                </FunnelChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 flex gap-8">
                            {data.funnel.map((step, idx) => (
                                <div key={idx} className="space-y-1">
                                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">{step.stage.split(' ')[1]}</div>
                                    <div className="text-xl font-black text-white">{step.value.toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Viral High-Performers</h3>
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Content with peak engagement velocity</p>
                        </div>
                        <button className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">See All Media</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/20">
                                    <th className="px-8 py-5">Intel Origin</th>
                                    <th className="px-6 py-5">Likes</th>
                                    <th className="px-6 py-5">Responses</th>
                                    <th className="px-8 py-5 text-right">Momentum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {data.top_content.map((post, idx) => (
                                    <tr key={idx} className="group hover:bg-indigo-50/30 transition-all duration-300">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-black text-gray-400 text-xs shadow-inner overflow-hidden">
                                                    {post.media ? (
                                                        <img src={post.media} alt="" className="w-full h-full object-cover" />
                                                    ) : post.avatar ? (
                                                        <img src={post.avatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        post.name.charAt(0)
                                                    )}
                                                </div>
                                                <span className="text-sm font-black text-gray-800 truncate max-w-[200px]">{post.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-sm font-bold text-gray-500">{post.likes.toLocaleString()}</td>
                                        <td className="px-6 py-6 text-sm font-bold text-gray-500">{post.comments.toLocaleString()}</td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="inline-flex px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black shadow-sm">
                                                {post.engagement.toLocaleString()} units
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">System Status</h3>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Environment Health</p>

                        <div className="mt-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500">API Latency</span>
                                <span className="text-xs font-black text-emerald-500 uppercase">Optimal (24ms)</span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full w-[95%]"></div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500">Storage Usage</span>
                                <span className="text-xs font-black text-indigo-500 uppercase">12.4 GB / 100 GB</span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 h-full w-[12%]"></div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500">GPU Training Load</span>
                                <span className="text-xs font-black text-amber-500 uppercase">Moderate (42%)</span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-amber-500 h-full w-[42%]"></div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 mt-8 border-t border-gray-50">
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Backend Live</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="text-center py-6 text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">
                Secure Administrator Terminal • {new Date().getFullYear()} • Vers. 4.8.2
            </div>
        </div>
    );
};

export default AdminDashboard;
