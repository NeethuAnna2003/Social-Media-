import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const SideQuests = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [quests, setQuests] = useState([]);
    const [inputGoals, setInputGoals] = useState("");
    const [generating, setGenerating] = useState(false);
    const [loading, setLoading] = useState(true);

    // Upload/Completion States
    const [selectedQuest, setSelectedQuest] = useState(null);
    const [proofFile, setProofFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [sharing, setSharing] = useState(false);

    // Suggestions State
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        fetchQuests();
    }, []);

    const fetchQuests = async () => {
        try {
            const res = await api.get('/quests/daily/');
            setQuests(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleShareStory = async () => {
        setSharing(true);
        try {
            const res = await api.post('/quests/daily/share/');
            toast.success("Story shared successfully!");
            navigate('/profile');
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || "Failed to share story.");
        } finally {
            setSharing(false);
        }
    };

    // AI Recommendation Logic (Simulated)
    const RECOMMENDATION_ENGINE = {
        tech: {
            keywords: ['code', 'coding', 'dev', 'program', 'react', 'js', 'python', 'bug', 'feature', 'app', 'read'],
            suggestions: [
                "Solve 2 LeetCode medium problems",
                "Refactor a legacy component",
                "Build a complex UI component",
                "Learn a new React Hook pattern",
                "Debug pending issues for 1 hour",
                "Commit 3 solid pull requests",
                "Read tech documentation for 30 mins",
                "Watch a system design tutorial"
            ]
        },
        fitness: {
            keywords: ['walk', 'run', 'gym', 'fly', 'exercise', 'workout', 'fit', 'lift', 'cardio'],
            suggestions: [
                "High-intensity interval training (30m)",
                "Run 5km in nature",
                "Upper body strength session",
                "Yoga and mobility flow",
                "Do 100 pushups challenge",
                "Walk 10,000 steps"
            ]
        },
        mindfulness: {
            keywords: ['meditate', 'mind', 'peace', 'calm', 'breathe', 'stress', 'journal'],
            suggestions: [
                "Meditate for 20 minutes",
                "Journal specific gratitude points",
                "Digital detox for 1 hour",
                "Practice Box Breathing (4-4-4-4)",
                "Read 10 pages of Stoic philosophy"
            ]
        },
        health: {
            keywords: ['drink', 'water', 'eat', 'food', 'diet', 'sleep', 'healthy'],
            suggestions: [
                "Drink 3L of water today",
                "Eat a fully plant-based meal",
                "No sugar for 24 hours",
                "Sleep by 10 PM tonight",
                "Prepare ample healthy snacks"
            ]
        },
        learning: {
            keywords: ['read', 'book', 'learn', 'study', 'course', 'listen'],
            suggestions: [
                "Read 20 pages of non-fiction",
                "Listen to an educational podcast",
                "Complete 1 module of online course",
                "Practice a new language for 15 mins"
            ]
        }
    };

    const DEFAULT_SUGGESTIONS = [
        "Plan my week ahead",
        "Deep clean my workspace",
        "Call a family member",
        "Track expenses for the day",
        "Write down 3 priorities"
    ];

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputGoals(val);

        const lines = val.split('\n');
        const currentLine = lines[lines.length - 1].trim().toLowerCase();

        if (currentLine.length >= 2) {
            let matchedSuggestions = [];
            let categoryMatched = false;

            // 1. Smart Keyword Analysis ("AI")
            Object.values(RECOMMENDATION_ENGINE).forEach(category => {
                if (category.keywords.some(keyword => currentLine.includes(keyword))) {
                    matchedSuggestions = [...matchedSuggestions, ...category.suggestions];
                    categoryMatched = true;
                }
            });

            // 2. Fallback / String Matching if no smart category found
            if (!categoryMatched) {
                // Check against all suggestions + defaults
                const allPotential = [
                    ...Object.values(RECOMMENDATION_ENGINE).flatMap(c => c.suggestions),
                    ...DEFAULT_SUGGESTIONS
                ];

                matchedSuggestions = potential.filter(s =>
                    s.toLowerCase().includes(currentLine)
                );
            }

            // 3. If still sparse, mix in related defaults or just show top results
            // Shuffle slightly to make it feel dynamic?
            const unique = [...new Set(matchedSuggestions)];

            // If user typed "coding" but result list is HUGE, slice it.
            // If user typed "coding" and we found matches, great. 
            // If user typed "xyz" and found nothing, maybe show nothing.

            setSuggestions(unique.slice(0, 6));
            setShowSuggestions(unique.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };

    const applySuggestion = (suggestion) => {
        const lines = inputGoals.split('\n');
        lines.pop(); // Remove partial line
        const newValue = lines.length > 0
            ? [...lines, suggestion].join('\n') + '\n'
            : suggestion + '\n';

        setInputGoals(newValue);
        setShowSuggestions(false);
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!inputGoals.trim()) return;
        setGenerating(true);
        try {
            const res = await api.post('/quests/generate/', { goals: inputGoals });
            setQuests(res.data);
            setInputGoals("");
        } catch (err) {
            console.error(err);
            toast.error("Failed to generate plan.");
        } finally {
            setGenerating(false);
        }
    };

    const handleComplete = async (e) => {
        e.preventDefault();
        if (!proofFile || !selectedQuest) return;

        const formData = new FormData();
        formData.append('proof', proofFile);

        try {
            setUploading(true);
            const res = await api.post(`/quests/${selectedQuest.id}/complete/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setQuests(prev => prev.map(q => q.id === selectedQuest.id ? { ...q, status: 'completed' } : q));
            setSelectedQuest(null);
            setProofFile(null);
            toast.success("Rank up! Quest completed.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to upload proof.");
        } finally {
            setUploading(false);
        }
    };

    const completedCount = quests.filter(q => q.status === 'completed').length;
    const allCompleted = quests.length > 0 && completedCount === quests.length;
    const progressPercent = quests.length > 0 ? (completedCount / quests.length) * 100 : 0;

    return (
        <div className="min-h-screen bg-[#F0F4F8] font-sans text-slate-700 pb-20 relative overflow-hidden selection:bg-purple-200">
            {/* Light Mode Animated Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[100px] animate-pulse-slow" />
                <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-purple-200/40 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
                <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-pink-200/30 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '4s' }} />
            </div>

            <Navbar />

            <main className="max-w-7xl mx-auto px-4 py-12 relative z-10">


                <div className="flex flex-col lg:flex-row gap-10 items-start relative perspective-2000">

                    {/* Left Sidebar - Completed Quests (Glassmorphism Light) */}
                    {quests.some(q => q.status === 'completed') && (
                        <div className="hidden lg:block w-80 sticky top-28 shrink-0">
                            <div className="bg-white/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/60 shadow-xl shadow-purple-500/5 transform transition-all duration-500 hover:scale-[1.02] hover:border-violet-200 hover:shadow-purple-500/10 group">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200 group-hover:rotate-12 transition-transform duration-500">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 tracking-wide">Conquered</h3>
                                        <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Missions Complete</p>
                                    </div>
                                    <span className="ml-auto bg-green-50 text-emerald-600 text-sm font-black px-3 py-1 rounded-lg border border-green-100">
                                        {completedCount}
                                    </span>
                                </div>

                                <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                                    {quests.filter(q => q.status === 'completed').map((quest, idx) => (
                                        <div
                                            key={quest.id}
                                            className="group/item relative bg-white/80 rounded-xl p-4 border border-white hover:border-emerald-200 transition-all duration-300 transform hover:-translate-x-[-5px] shadow-sm hover:shadow-md"
                                            style={{ animationDelay: `${idx * 100}ms` }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-transparent rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                            <h4 className="font-medium text-slate-500 text-sm mb-1 relative z-10 line-through decoration-emerald-400 decoration-2 group-hover/item:text-slate-600">{quest.title}</h4>
                                            <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold uppercase tracking-wider relative z-10">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span>Completed</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className="flex-1 w-full max-w-3xl mx-auto">
                        {loading ? (
                            <div className="flex justify-center py-20 relative">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-20 h-20 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin"></div>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-12 h-12 border-4 border-pink-200 border-b-pink-500 rounded-full animate-spin-reverse"></div>
                                </div>
                            </div>
                        ) : quests.length === 0 ? (
                            /* Step 1: Input Goals (Professional Protocol UI) */
                            <div className="bg-white/80 backdrop-blur-3xl rounded-[2.5rem] p-8 md:p-14 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white relative overflow-hidden group ring-1 ring-slate-900/5 hover:shadow-[0_30px_80px_-20px_rgba(139,92,246,0.1)] transition-all duration-700">

                                {/* Technical Grid Background */}
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
                                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-200 to-transparent opacity-50" />

                                <div className="relative z-10 max-w-2xl mx-auto">
                                    {/* System Status Badge */}
                                    <div className="flex justify-center mb-8">
                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-50 border border-slate-200/60 rounded-full shadow-sm animate-fade-in backdrop-blur-md">
                                            <span className="relative flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">System Ready</span>
                                        </div>
                                    </div>

                                    {/* Header */}
                                    <div className="text-center mb-12">
                                        <h2 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight mb-3">
                                            Initialize <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">Protocol</span>
                                        </h2>
                                        <p className="text-slate-500 text-lg font-medium">Define parameters for daily synchronization.</p>
                                    </div>

                                    <form onSubmit={handleGenerate} className="relative">
                                        <div className="relative group/field">
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-200 to-indigo-200 rounded-[2rem] opacity-0 group-hover/field:opacity-50 transition duration-700 blur-sm"></div>
                                            <textarea
                                                value={inputGoals}
                                                onChange={handleInputChange}
                                                placeholder="> Enter mission objectives... (e.g. 'Deploy feature', '30m run')"
                                                className="relative w-full h-64 bg-slate-50/80 hover:bg-white focus:bg-white border-2 border-slate-200/60 hover:border-violet-300 focus:border-violet-500 rounded-[1.8rem] p-8 text-xl font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-violet-500/10 transition-all duration-300 resize-none shadow-inner font-sans selection:bg-violet-100"
                                            ></textarea>

                                            {/* Autocomplete Suggestions (Floating Chips) */}
                                            {showSuggestions && (
                                                <div className="absolute bottom-5 left-5 right-5 flex flex-wrap gap-2 animate-slide-up-fade z-20">
                                                    <div className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Smart Suggestions detected:</div>
                                                    {suggestions.map((suggestion, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => applySuggestion(suggestion)}
                                                            className="px-4 py-2 bg-white/90 border border-slate-200/80 text-violet-700 text-sm font-bold rounded-xl shadow-sm hover:bg-violet-50 hover:border-violet-200 hover:scale-[1.02] hover:-translate-y-0.5 transition-all flex items-center gap-2 backdrop-blur-sm group/chip"
                                                        >
                                                            <span className="text-violet-400 group-hover/chip:text-violet-600 transition-colors">+</span>
                                                            {suggestion}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={generating || !inputGoals.trim()}
                                            className="w-full mt-8 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-black text-lg tracking-widest rounded-2xl hover:from-violet-900 hover:to-indigo-900 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-violet-900/20 relative overflow-hidden group/btn"
                                        >
                                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                                            <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent transformSkew-x-12 group-hover/btn:animate-shine" />

                                            <span className="relative flex items-center justify-center gap-3">
                                                {generating ? (
                                                    <>
                                                        <svg className="animate-spin h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                        PROCESSING...
                                                    </>
                                                ) : "INITIATE SEQUENCE"}
                                            </span>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        ) : (
                            /* Step 2: Quest List */
                            <div className="space-y-12 animate-fade-in pb-20">
                                {/* Status Bar 3D */}
                                <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200 border border-white/80 relative overflow-hidden transform hover:scale-[1.01] transition-transform duration-500 group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-100/50 rounded-full blur-[80px] group-hover:bg-violet-200/50 transition-colors duration-500" />

                                    <div className="relative z-10 flex justify-between items-end mb-6">
                                        <div>
                                            <h3 className="text-3xl font-black text-slate-800 mb-2">Daily Progress</h3>
                                            <p className="text-slate-500 font-medium tracking-wide">Level up your life, one task at a time.</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-600 drop-shadow-sm">
                                                {Math.round(progressPercent)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-6 p-1 border border-slate-200 shadow-inner">
                                        <div
                                            className="bg-gradient-to-r from-violet-400 via-fuchsia-500 to-pink-500 h-full rounded-full transition-all duration-1000 ease-out relative shadow-lg shadow-violet-200"
                                            style={{ width: `${progressPercent}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/30 animate-pulse-fast rounded-full" />
                                        </div>
                                    </div>
                                </div>

                                {allCompleted && (
                                    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 backdrop-blur-xl rounded-[2.5rem] p-12 text-center border border-yellow-200 shadow-2xl shadow-yellow-500/10 relative overflow-hidden animate-bounce-in">
                                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                                        <div className="relative z-10">
                                            <h2 className="text-5xl font-black text-yellow-500 mb-6 drop-shadow-sm tracking-tight">
                                                MISSION ACCOMPLISHED
                                            </h2>
                                            <p className="text-yellow-700/80 text-xl font-medium mb-10 max-w-lg mx-auto">
                                                All objectives secured. You are unstoppable.
                                            </p>
                                            <button
                                                onClick={handleShareStory}
                                                disabled={sharing}
                                                className="px-10 py-5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-2xl font-black text-lg hover:shadow-xl hover:shadow-yellow-300/50 transition-all active:scale-95 flex items-center justify-center gap-3 mx-auto disabled:opacity-75 disabled:cursor-wait tracking-wide"
                                            >
                                                {sharing ? (
                                                    <>
                                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                        UPLOADING LEGACY...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                                        SHARE VICTORY
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-6">
                                    {quests.map((quest, i) => (
                                        <div
                                            key={quest.id}
                                            className={`group relative bg-white/60 backdrop-blur-md rounded-[2rem] p-8 border hover:border-violet-200 transition-all duration-300 flex items-center gap-8 ${quest.status === 'completed' ? 'border-emerald-200 bg-emerald-50/50' : 'border-white/80 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1'}`}
                                        >

                                            {/* Status Icon */}
                                            <div className={`flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 ${quest.status === 'completed' ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-200 rotate-3' : 'bg-slate-100 text-slate-400 group-hover:bg-violet-50 group-hover:text-violet-500 group-hover:shadow-inner'}`}>
                                                {quest.status === 'completed' ? (
                                                    <svg className="w-10 h-10 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                ) : (
                                                    <span className="font-black text-3xl opacity-30 select-none">0{i + 1}</span>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className={`text-2xl font-bold mb-2 transition-colors ${quest.status === 'completed' ? 'text-emerald-700 line-through decoration-emerald-500/50' : 'text-slate-800 group-hover:text-violet-700'}`}>{quest.title}</h3>
                                                <p className="text-slate-500 font-medium truncate text-lg">{quest.description}</p>
                                            </div>

                                            {quest.status !== 'completed' && (
                                                <button
                                                    onClick={() => setSelectedQuest(quest)}
                                                    className="px-8 py-4 bg-white text-slate-700 text-sm font-bold rounded-xl hover:bg-violet-600 hover:text-white transition-all border border-slate-200 hover:border-violet-600 shadow-lg shadow-slate-200 active:scale-95 whitespace-nowrap flex items-center gap-2 group-hover:shadow-violet-200"
                                                >
                                                    ENGAGE
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Proof Upload Modal - Light Mode */}
            {selectedQuest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-white border border-white/60 rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl animate-slide-up relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400 to-pink-500" />

                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-3xl font-black text-slate-800">Upload Evidence</h3>
                            <button onClick={() => setSelectedQuest(null)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <p className="text-slate-600 mb-8 text-lg">
                            Proof Required for: <strong className="text-violet-600">{selectedQuest.title}</strong>
                        </p>

                        <form onSubmit={handleComplete}>
                            <div className="mb-8">
                                <label className={`block w-full cursor-pointer bg-slate-50 border-2 border-dashed rounded-3xl p-12 text-center transition-all group ${proofFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-violet-400 hover:bg-white'}`}>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*,video/*"
                                        onChange={(e) => setProofFile(e.target.files[0])}
                                    />
                                    {proofFile ? (
                                        <div className="text-emerald-600 font-bold flex flex-col items-center justify-center gap-3 animate-bounce-in">
                                            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                            <span className="text-lg">{proofFile.name}</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 text-slate-400 group-hover:text-violet-500 transition-colors">
                                            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            <span className="font-bold text-lg">Drop evidence here</span>
                                            <span className="text-sm opacity-60">or click to browse</span>
                                        </div>
                                    )}
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={uploading || !proofFile}
                                className="w-full py-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-xl rounded-2xl hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-violet-200"
                            >
                                {uploading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        VERIFYING...
                                    </span>
                                ) : 'SUBMIT FOR ANALYSIS'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SideQuests;
