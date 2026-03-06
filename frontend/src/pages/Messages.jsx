import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import StoryViewer from '../components/stories/StoryViewer';
import { WS_BASE } from '../config/env';

const Messages = () => {
    const { threadId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data State
    const [threads, setThreads] = useState([]);
    const [messages, setMessages] = useState([]);
    const [activeThread, setActiveThread] = useState(null);

    // UI State
    const [loadingThreads, setLoadingThreads] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [chatSummary, setChatSummary] = useState(null);
    const [isRecording, setIsRecording] = useState(false);

    // Story Viewing State
    const [viewingStoryUserIndex, setViewingStoryUserIndex] = useState(null);
    const [storyFeedData, setStoryFeedData] = useState([]);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const socketRef = useRef(null);

    // Refs
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const messageListRef = useRef(null);
    const audioRefs = useRef(new Map());
    const [currentAudioId, setCurrentAudioId] = useState(null);
    const [isUserNearBottom, setIsUserNearBottom] = useState(true);

    // Navbar overlap fix (dynamic, preserves existing scale)
    const navbarRef = useRef(null);
    const [navHeight, setNavHeight] = useState(0);

    const pauseCurrentAudio = useCallback(() => {
        if (currentAudioId && audioRefs.current.has(currentAudioId)) {
            const a = audioRefs.current.get(currentAudioId);
            try { a.pause(); } catch (_) { }
        }
    }, [currentAudioId]);

    // 1. Fetch Threads
    const fetchThreads = async () => {
        try {
            const response = await api.get('/chat/threads/');
            setThreads(response.data);
            setLoadingThreads(false);
        } catch (error) {
            console.error("Failed to fetch threads", error);
            setLoadingThreads(false);
        }
    };

    useEffect(() => {
        fetchThreads();
        // Poll threads list occasionaly to update last messages
        const interval = setInterval(fetchThreads, 10000);
        return () => clearInterval(interval);
    }, []);

    // 2. Handle Active Thread Logic
    useEffect(() => {
        if (threadId) {
            const thread = threads.find(t => t.id === parseInt(threadId));
            if (thread) {
                setActiveThread(thread);
                fetchMessages(thread.id);
            } else if (!loadingThreads && threads.length > 0) {
                // Thread ID in URL but not in list (maybe new or mismatch), try fetching specifically or just wait
                // For now, assume it will load or user redirects
            }
        } else {
            setActiveThread(null);
            setMessages([]);
        }
    }, [threadId, threads]); // Dep on threads ensures if threads load late, we select it

    // 3. Fetch Messages
    const fetchMessages = async (id) => {
        if (!id) return;
        try {
            // Don't set global loading on polling
            const response = await api.get(`/chat/threads/${id}/messages/`);
            setMessages(response.data);
            scrollToBottom();
        } catch (error) {
            console.error("Failed to fetch messages", error);
        }
    };

    // WebSocket Connection
    useEffect(() => {
        if (!activeThread?.id) return;

        // Close existing socket
        if (socketRef.current) {
            socketRef.current.close();
        }

        let cancelled = false;
        (async () => {
            // Ensure we have an access token; refresh if needed
            let token = localStorage.getItem('access');
            if (!token) {
                const refresh = localStorage.getItem('refresh');
                if (refresh) {
                    try {
                        const resp = await api.post('/token/refresh/', { refresh });
                        if (resp.data?.access) {
                            token = resp.data.access;
                            localStorage.setItem('access', token);
                        }
                    } catch (e) {
                        console.warn('WS token refresh failed');
                    }
                }
            }

            if (cancelled) return;

            // Connect new socket with JWT in query string (JwtAuthMiddleware expects ?token=)
            const tokenQS = token ? `?token=${encodeURIComponent(token)}` : '';
            const socket = new WebSocket(`${WS_BASE}/ws/chat/${activeThread.id}/${tokenQS}`.replace('/?', '?'));

            socket.onopen = () => {
                console.log('WebSocket Connected');
            };

            socket.onmessage = (event) => {
                const payload = JSON.parse(event.data);
                switch (payload.type) {
                    case 'message_received': {
                        const message = payload.data;
                        setMessages(prev => {
                            if (prev.find(m => m.id === message.id)) return prev;
                            return [...prev, message];
                        });
                        if (isUserNearBottom) scrollToBottom();
                        break;
                    }
                    case 'user_typing':
                    case 'message_read':
                    case 'presence_update':
                    case 'message_deleted':
                    case 'message_edited':
                    case 'message_reaction':
                    default:
                        break;
                }
            };

            socket.onerror = (error) => {
                console.error('WebSocket Error:', error);
            };

            socketRef.current = socket;
        })();

        return () => {
            cancelled = true;
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, [activeThread]);

    // Track scroll position to avoid jumping if user scrolls up
    useEffect(() => {
        const el = messageListRef.current;
        if (!el) return;
        const onScroll = () => {
            const threshold = 80; // px from bottom considered "near bottom"
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
            setIsUserNearBottom(atBottom);
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => el.removeEventListener('scroll', onScroll);
    }, [activeThread]);

    // Auto-scroll on new messages when near bottom
    useEffect(() => {
        if (isUserNearBottom) scrollToBottom();
    }, [messages, isUserNearBottom]);

    // 4. Send Message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !fileInputRef.current?.files[0]) || !activeThread) return;

        try {
            const formData = new FormData();
            formData.append('text', newMessage);
            if (fileInputRef.current?.files[0]) {
                const file = fileInputRef.current.files[0];
                if (file.type.startsWith('image/')) {
                    formData.append('image', file);
                } else if (file.type.startsWith('video/')) {
                    formData.append('video', file);
                }
            }

            const response = await api.post(`/chat/threads/${activeThread.id}/messages/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setMessages([...messages, response.data]);
            setNewMessage("");
            if (fileInputRef.current) fileInputRef.current.value = "";
            scrollToBottom();

            // Refresh threads to show updated last message
            fetchThreads();

        } catch (error) {
            console.error("Failed to send message", error);
        }
    };

    // 5. User Search & Create Thread
    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchTerm(query);
        if (query.length > 2) {
            const res = await api.get(`/accounts/search/?q=${query}`); // Assuming this exists or similar
            // Mocking or using existing search endpoint if available. 
            // We'll use a specific User Search logic here if needed. 
            // Let's assume we can search via a generic search endpoint.
            // If not, I'll fallback to just filtering known users or need new endpoint?
            // Accounts app usually has lists.
            // I'll assume /social/search leads to user search
        }
    };

    // Quick user add (Simulated for this step, ideally uses real search)
    const createThread = async (targetUserId) => {
        try {
            const response = await api.post('/chat/threads/', { target_user_id: targetUserId });
            const thread = response.data;
            setThreads([thread, ...threads.filter(t => t.id !== thread.id)]);
            navigate(`/messages/${thread.id}`);
            setSearchTerm("");
            setSearchResults([]);
        } catch (error) {
            console.error("Create thread failed", error);
        }
    };



    // AI Features
    const handleSummarize = async () => {
        if (!activeThread) return;
        try {
            const res = await api.get(`/chat/threads/${activeThread.id}/summarize/`);
            setChatSummary(res.data.summary);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSmartReply = async () => {
        if (!activeThread) return;
        try {
            const res = await api.get(`/chat/threads/${activeThread.id}/suggest_replies/`);
            setSuggestions(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleTranslate = async (msgId) => {
        try {
            const res = await api.post(`/chat/messages/${msgId}/translate/`);
            // Update message in state with translation - simplistic approach
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, translatedText: res.data.translated_text } : m));
        } catch (err) {
            console.error(err);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const file = new File([audioBlob], "voice_note.webm", { type: 'audio/webm' });

                // Send immediately
                const formData = new FormData();
                formData.append('audio', file);

                try {
                    const response = await api.post(`/chat/threads/${activeThread.id}/messages/`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    setMessages(prev => [...prev, response.data]);
                    scrollToBottom();
                } catch (err) {
                    console.error("Failed to send audio", err);
                }

                // Stop tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Could not start recording", err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleReaction = async (msgId, emoji) => {
        try {
            await api.post(`/chat/messages/${msgId}/react/`, { emoji });
            // Optimistic update or refetch
            fetchMessages(activeThread.id);
        } catch (err) {
            console.error(err);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: 'end' });
    };

    const handleStoryClick = async (targetUserId) => {
        try {
            // Fetch latest feed (stories might have changed)
            const res = await api.get('/stories/feed/');
            const feed = res.data;
            setStoryFeedData(feed);

            // Find index
            const index = feed.findIndex(u => u.user_id === parseInt(targetUserId));
            if (index !== -1) {
                setViewingStoryUserIndex(index);
            } else {
                alert("This story is no longer available.");
            }
        } catch (err) {
            console.error("Failed to open story", err);
        }
    };

    // Measure navbar height
    useEffect(() => {
        const measure = () => setNavHeight(navbarRef.current?.offsetHeight || 0);
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    const BASE_PT = 112; // Tailwind pt-28 (28 * 4)
    const containerStyle = navHeight > BASE_PT ? { paddingTop: navHeight } : undefined;

    return (
        <div className="h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col overflow-hidden relative">
            <div ref={navbarRef}><Navbar /></div>

            {/* Story Viewer Overlay */}
            {viewingStoryUserIndex !== null && storyFeedData.length > 0 && (
                <StoryViewer
                    initialUserIndex={viewingStoryUserIndex}
                    storyUsers={storyFeedData}
                    onClose={() => setViewingStoryUserIndex(null)}
                />
            )}

            <div className="flex-1 w-full mx-auto p-5 pt-24 flex gap-6 min-h-0" style={containerStyle}>

                {/* Threads List Sidebar */}
                <div className={`${activeThread ? 'hidden lg:flex' : 'flex'} h-full flex-col w-full lg:w-[320px] bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 overflow-hidden`}>
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="text-xl font-bold mb-4">Messages</h2>
                        {/* Simple Search Input - To implement functionalities later */}
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="w-full bg-gray-100 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        // On real implementation, attach onChange to user search API
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loadingThreads ? (
                            <div className="p-4 text-center text-gray-400">Loading chats...</div>
                        ) : threads.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">No conversations yet.</div>
                        ) : (
                            threads.map(thread => {
                                const other = thread.other_participant;
                                return (
                                    <div
                                        key={thread.id}
                                        onClick={() => navigate(`/messages/${thread.id}`)}
                                        className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors ${activeThread?.id === thread.id ? 'bg-purple-50' : ''}`}
                                    >
                                        <div className="relative">
                                            <img src={other.profile_picture || other.avatar || `https://ui-avatars.com/api/?name=${other.username}`} className="w-12 h-12 rounded-full object-cover" />
                                            {thread.unread_count > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>}
                                        </div>
                                        <div className="ml-4 flex-1">
                                            <div className="flex justify-between items-baseline">
                                                <h3 className="font-bold text-gray-900">{other.username}</h3>
                                                <span className="text-xs text-gray-400">
                                                    {thread.last_message ? new Date(thread.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 truncate">
                                                {thread.last_message ? (() => {
                                                    const lm = thread.last_message;
                                                    const lmSenderId = (lm?.sender?.id ?? lm?.sender ?? lm?.sender_id ?? lm?.senderId);
                                                    const mine = String(lmSenderId) === String(user?.id);
                                                    return `${mine ? 'You: ' : ''}${lm.text || 'Sent an image'}`;
                                                })() : <span className="text-purple-500 italic">Start chatting</span>}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Chat Window */}
                <div className={`${!activeThread ? 'hidden lg:flex' : 'flex'} h-full flex-col w-full lg:flex-1 bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 overflow-hidden`}>
                    {activeThread ? (
                        <>
                            {/* Header */}
                            <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => navigate('/messages')} className="lg:hidden text-gray-600 hover:text-gray-900">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <div className="relative">
                                        <img
                                            src={activeThread.other_participant.profile_picture || activeThread.other_participant.avatar || `https://ui-avatars.com/api/?name=${activeThread.other_participant.username}`}
                                            className="w-11 h-11 rounded-full object-cover ring-2 ring-gray-100"
                                            alt="avatar"
                                        />
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-[16px]">{activeThread.other_participant.username}</h3>
                                        <p className="text-xs text-gray-500">Active now</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleSummarize}
                                        className="text-gray-400 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-full transition-colors"
                                        title="Summarize conversation"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </button>
                                    <button className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div ref={messageListRef} className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-2 bg-gradient-to-b from-gray-50 to-white">
                                {messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <svg className="w-20 h-20 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        <p className="text-sm">No messages yet. Start the conversation!</p>
                                    </div>
                                ) : (
                                    <MessageList
                                        messages={messages}
                                        user={user}
                                        activeThread={activeThread}
                                        onStoryClick={handleStoryClick}
                                        audioRefs={audioRefs}
                                        currentAudioId={currentAudioId}
                                        setCurrentAudioId={setCurrentAudioId}
                                        pauseCurrentAudio={pauseCurrentAudio}
                                    />
                                )}

                                {/* AI Summary */}
                                {chatSummary && (
                                    <div className="p-4 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-2xl shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                </div>
                                                <h4 className="font-bold text-purple-900 text-sm">AI Summary</h4>
                                            </div>
                                            <button onClick={() => setChatSummary(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed">{chatSummary}</p>
                                    </div>
                                )}
                                <div ref={messagesEndRef}></div>
                            </div>


                            {/* Input Footer */}
                            <form onSubmit={handleSendMessage} className="flex-none p-3 md:p-4 bg-white border-t border-gray-200 sticky bottom-0">
                                <div className="flex items-center gap-3">
                                    {/* Attach File */}
                                    <label className="cursor-pointer text-gray-400 hover:text-purple-600 transition-colors p-2 hover:bg-purple-50 rounded-full">
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" />
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                    </label>

                                    {/* Text Input */}
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Type a message..."
                                            className="w-full bg-gray-100 rounded-full px-4 md:px-5 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-[15px]"
                                        />
                                    </div>

                                    {/* Voice Recording */}
                                    <button
                                        type="button"
                                        onClick={isRecording ? stopRecording : startRecording}
                                        className={`p-3 rounded-full transition-all ${isRecording
                                            ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200'
                                            : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
                                            }`}
                                        title={isRecording ? "Stop recording" : "Record voice message"}
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                        </svg>
                                    </button>

                                    {/* Send Button */}
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() && !fileInputRef.current?.files[0]}
                                        className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-3 rounded-full hover:from-purple-600 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-200 disabled:shadow-none"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/30">
                            <div className="bg-purple-100 p-6 rounded-full mb-6 animate-pulse">
                                <svg className="w-16 h-16 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Your Messages</h3>
                            <p>Select a chat or start a new conversation.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Utilities
function formatClock(ts) {
    try {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) { return ''; }
}

// Virtualized, grouped message list
const MessageList = memo(function MessageList({ messages, user, activeThread, onStoryClick, audioRefs, currentAudioId, setCurrentAudioId, pauseCurrentAudio }) {
    // Virtualize only when exceeding threshold
    const THRESHOLD = 500;
    const visible = useMemo(() => (
        messages.length > THRESHOLD ? messages.slice(messages.length - THRESHOLD) : messages
    ), [messages]);

    // Group consecutive messages by sender
    const grouped = useMemo(() => {
        const getSenderId = (m) => {
            if (!m) return undefined;
            if (m.sender && typeof m.sender === 'object' && m.sender !== null) {
                return m.sender.id;
            }
            if (typeof m.sender === 'number' || typeof m.sender === 'string') {
                return m.sender;
            }
            if (m.senderId !== undefined && m.senderId !== null) return m.senderId;
            if (m.sender_id !== undefined && m.sender_id !== null) return m.sender_id;
            return undefined;
        };
        const out = [];
        for (let i = 0; i < visible.length; i++) {
            const msg = visible[i];
            const prev = visible[i - 1];
            const next = visible[i + 1];
            const samePrev = !!prev && getSenderId(prev) === getSenderId(msg);
            const sameNext = !!next && getSenderId(next) === getSenderId(msg);
            out.push({
                msg,
                isMe: String(getSenderId(msg)) === String(user?.id),
                showAvatar: !(getSenderId(msg) === user?.id) && !samePrev, // only show for incoming at group start
                showTimestamp: !sameNext, // show at end of group
                mergeTop: samePrev,
                mergeBottom: sameNext
            });
        }
        return out;
    }, [visible, user]);

    return (
        <div className="space-y-3 px-2">
            {grouped.map(({ msg, isMe, showAvatar, showTimestamp, mergeTop, mergeBottom }) => (
                <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMe={isMe}
                    showAvatar={showAvatar}
                    showTimestamp={showTimestamp}
                    mergeTop={mergeTop}
                    mergeBottom={mergeBottom}
                    other={activeThread.other_participant}
                    onStoryClick={onStoryClick}
                    audioRefs={audioRefs}
                    currentAudioId={currentAudioId}
                    setCurrentAudioId={setCurrentAudioId}
                    pauseCurrentAudio={pauseCurrentAudio}
                />
            ))}
        </div>
    );
});

const MessageBubble = memo(function MessageBubble({ msg, isMe, showAvatar, showTimestamp, mergeTop, mergeBottom, other, onStoryClick, audioRefs, currentAudioId, setCurrentAudioId, pauseCurrentAudio }) {
    const bubbleBase = isMe
        ? 'bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 text-white shadow-sm'
        : 'bg-gray-100 text-gray-900 shadow-sm';
    // Inner-side corners (right for me, left for others) get smaller radius when grouped
    const radius = isMe
        ? `rounded-2xl ${mergeTop ? 'rounded-tr-md' : ''} ${mergeBottom ? 'rounded-br-md' : ''}`
        : `rounded-2xl ${mergeTop ? 'rounded-tl-md' : ''} ${mergeBottom ? 'rounded-bl-md' : ''}`;
    const align = isMe ? 'justify-end' : 'justify-start';

    return (
        <div className={`flex ${align} items-end gap-2 group`}>
            {/* Incoming avatar (group start only) */}
            {!isMe && showAvatar && (
                <img
                    loading="lazy"
                    src={(msg?.sender && (msg.sender.avatar || msg.sender.profile_picture))
                        || other.profile_picture || other.avatar || `https://ui-avatars.com/api/?name=${other.username}`}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    alt="avatar"
                />
            )}

            <div className={`max-w-[70%] ${isMe ? 'order-1 ml-auto' : 'order-2 mr-auto'}`}>
                {msg.audio ? (
                    <div className="mb-1">
                        <WaveformAudio
                            id={`audio-${msg.id}`}
                            src={msg.audio}
                            isMe={isMe}
                            audioRefs={audioRefs}
                            activeId={currentAudioId}
                            setActiveId={setCurrentAudioId}
                            pauseOthers={pauseCurrentAudio}
                        />
                    </div>
                ) : (
                    <div
                        className={`${bubbleBase} ${radius} px-3 md:px-4 py-2.5 transition-transform duration-150 will-change-transform hover:scale-[1.01] ${isMe ? 'ring-0' : ''}`}
                    >
                        {/* Media */}
                        {msg.image && (
                            <img loading="lazy" src={msg.image} className="w-full rounded-xl mb-2 max-w-sm" alt="attachment" />
                        )}
                        {msg.video && (
                            <video preload="metadata" src={msg.video} controls className="w-full rounded-xl mb-2 max-w-sm" />
                        )}

                        {/* Text or Story Link */}
                        {msg.text && !msg.is_toxic && (
                            (msg.text.includes('[Story Link]') || msg.text.includes('[StoryLink:')) ? (
                                <div className="flex flex-col">
                                    <p className="text-sm leading-relaxed mb-2">
                                        {msg.text.split(/\[Story ?Link.*\]/)[0]}
                                    </p>
                                    <div
                                        className={`rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-colors ${isMe ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-50 hover:bg-gray-100'}`}
                                        onClick={() => {
                                            const idMatch = msg.text.match(/\[StoryLink:(\d+)\]/);
                                            const userMatch = msg.text.match(/Check out this story by (.*?)!/);
                                            if (idMatch) onStoryClick(idMatch[1]);
                                            else if (userMatch) {
                                                // Fallback: open feed and try match
                                                onStoryClick(Number.NaN);
                                            }
                                        }}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px]">
                                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-xs font-semibold ${isMe ? 'text-white' : 'text-gray-900'}`}>View Story</p>
                                            <p className={`text-[10px] ${isMe ? 'text-purple-100' : 'text-gray-500'}`}>Tap to watch</p>
                                        </div>
                                        <svg className={`w-4 h-4 ${isMe ? 'text-white/70' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[15px] leading-relaxed break-words">{msg.text}</p>
                            )
                        )}

                        {/* Toxic */}
                        {msg.is_toxic && (
                            <div className="flex items-center gap-2 text-xs">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span className="opacity-70">Message hidden due to content policy</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Timestamp at group end */}
                {showTimestamp && (
                    <div className={`text-[10px] mt-1.5 ${isMe ? 'text-purple-100' : 'text-gray-400'}`}>
                        {formatClock(msg.created_at)}
                    </div>
                )}

                {/* Translation */}
                {msg.translatedText && (
                    <div className={`mt-1 px-3 py-1.5 rounded-lg text-xs italic ${isMe ? 'bg-purple-50 text-purple-900' : 'bg-gray-100 text-gray-700'}`}>
                        {msg.translatedText}
                    </div>
                )}
            </div>

            {/* Outgoing avatar (optional small) */}
            {isMe && showAvatar === false && (
                <div className="w-6 h-6 rounded-full" />
            )}
        </div>
    );
});

const WaveformAudio = memo(function WaveformAudio({ id, src, isMe, audioRefs, activeId, setActiveId, pauseOthers }) {
    const audioEl = useRef(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(true);

    // Precise waveform pattern for a pro look
    const waveBars = useMemo(() => [
        15, 25, 18, 30, 22, 45, 35, 60, 45, 80, 55, 90, 60, 75, 50,
        65, 45, 55, 35, 45, 30, 40, 25, 35, 20, 25, 15, 20, 15, 15
    ], []);

    useEffect(() => {
        if (audioEl.current) {
            audioRefs.current.set(id, audioEl.current);
            const el = audioEl.current;
            const onLoaded = () => { setDuration(el.duration); setLoading(false); };
            const onTime = () => setCurrentTime(el.currentTime);
            const onPlay = () => setIsPlaying(true);
            const onPause = () => setIsPlaying(false);
            const onEnded = () => { setIsPlaying(false); setCurrentTime(0); setActiveId(null); };

            el.addEventListener('loadedmetadata', onLoaded);
            el.addEventListener('timeupdate', onTime);
            el.addEventListener('play', onPlay);
            el.addEventListener('pause', onPause);
            el.addEventListener('ended', onEnded);

            return () => {
                el.removeEventListener('loadedmetadata', onLoaded);
                el.removeEventListener('timeupdate', onTime);
                el.removeEventListener('play', onPlay);
                el.removeEventListener('pause', onPause);
                el.removeEventListener('ended', onEnded);
            };
        }
    }, [id, audioRefs, setActiveId]);

    // Cleanup ref on unmount
    useEffect(() => () => {
        if (audioRefs.current) audioRefs.current.delete(id);
    }, [id, audioRefs]);

    const togglePlay = () => {
        if (!audioEl.current) return;
        if (isPlaying) {
            audioEl.current.pause();
        } else {
            pauseOthers();
            audioEl.current.play();
            setActiveId(id);
        }
    };

    const handleSeek = (e) => {
        if (!audioEl.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const seekTime = (x / rect.width) * duration;
        audioEl.current.currentTime = seekTime;
    };

    const formatTime = (t) => {
        if (!t || isNaN(t)) return "0:00";
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Styling constants - Updated for Professional Look
    // "Me": Deep Indigo/Purple Gradient (Premium)
    // "Other": Clean White
    const containerClasses = isMe
        ? "bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] border-transparent text-white shadow-md shadow-indigo-200"
        : "bg-white border border-gray-100 text-gray-800 shadow-sm";

    const buttonClasses = isMe
        ? "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
        : "bg-[#6366f1] text-white hover:bg-[#4f46e5] shadow-md shadow-indigo-200";

    const barActiveColor = isMe ? "bg-white" : "bg-[#6366f1]";
    const barInactiveColor = isMe ? "bg-white/30" : "bg-gray-200";

    return (
        <div className={`flex items-center gap-3 p-3 rounded-[20px] w-full min-w-[260px] transition-all ${containerClasses}`}>

            {/* Play/Pause Button */}
            <button
                onClick={togglePlay}
                disabled={loading}
                className={`
                    w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95
                    ${buttonClasses}
                `}
            >
                {loading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : isPlaying ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                ) : (
                    <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                )}
            </button>

            <div className="flex-1 flex flex-col gap-1 min-w-0">
                {/* Waveform Canvas Area */}
                <div
                    className="h-8 flex items-center gap-[2px] cursor-pointer group select-none relative"
                    onClick={handleSeek}
                >
                    {waveBars.map((baseHeight, i) => {
                        const progress = currentTime / (duration || 1);
                        const position = i / waveBars.length;
                        const isPlayed = position <= progress;

                        // Dynamic height animation
                        let h = baseHeight;
                        if (isPlaying) {
                            // Simple phase shift animation
                            const variance = Math.sin((Date.now() / 150) + i) * 20;
                            h = Math.max(15, Math.min(100, baseHeight + variance));
                        }

                        return (
                            <div
                                key={i}
                                className={`
                                    w-1 rounded-full transition-all duration-75
                                    ${isPlayed ? barActiveColor : barInactiveColor}
                                `}
                                style={{
                                    height: `${h}%`,
                                    minHeight: '4px'
                                }}
                            />
                        );
                    })}
                </div>

                {/* Footer Metadata */}
                <div className={`flex justify-between text-[10px] font-medium opacity-80 px-1`}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            <audio ref={audioEl} src={src} className="hidden" />
        </div>
    );
});

export default Messages;
