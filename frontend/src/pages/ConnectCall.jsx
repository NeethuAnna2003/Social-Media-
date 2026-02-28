import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ConnectCall = () => {
    const { userId } = useParams(); // Target User ID
    const { state } = useLocation();
    const { user } = useAuth();
    const navigate = useNavigate();

    const targetUser = state?.targetUser || { first_name: 'User', username: 'unknown' };

    const [callStatus, setCallStatus] = useState('initializing'); // initializing, waiting, connected, ended
    const [messages, setMessages] = useState([]); // For text chat if needed/system messages
    const [conversationStarter, setConversationStarter] = useState('');

    // WebRTC Refs
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const peerConnection = useRef(null);
    const ws = useRef(null);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    // AI Topics
    const topics = [
        `Ask ${targetUser.first_name} about their favorite project in ${targetUser.profile?.interests?.split(',')[0] || 'their field'}.`,
        "What's one thing you're excited about this week?",
        "If you could travel anywhere right now, where would you go?",
        `How did you get started with ${targetUser.profile?.interests?.split(',')[0] || 'your hobbies'}?`
    ];

    useEffect(() => {
        setConversationStarter(topics[Math.floor(Math.random() * topics.length)]);
        startCall();

        return () => {
            endCall();
        };
    }, []);

    const startCall = async () => {
        try {
            // 1. Get User Media
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); // Voice only as requested
            localStreamRef.current = stream;

            // 2. Setup WebSocket
            // Room ID: sort ids to ensure unique room for this pair
            const ids = [user.id, userId].sort();
            const roomId = `connect_${ids[0]}_${ids[1]}`;

            // Assuming simplified auth/no token in WS url for prototype, or handle in backend 
            ws.current = new WebSocket(`ws://${window.location.host}/ws/signal/${roomId}/`);

            ws.current.onopen = () => {
                console.log("WS Connected");
                setCallStatus('waiting');

                // If we are the "lower" ID (or logic to pick initiator), we offer?
                // Or just have 'Connect' button trigger offer manually if simpler.
                // Auto-offer collision is possible. 
                // Simple strategy: The one who navigated here sends a 'join' event. 
                // If other is present, we start. 

                // MVP: Just send Offer immediately if I am the initiator (which I am if I clicked connect)
                // But in this logic, both might think they are initiator if they click button.
                // Let's us 'impolite' peer strategy or simpler: random delay or ID comparison.
                // Since this page is loaded by clicking "Connect", we assume WE are initiating.
                createOffer();
            };

            ws.current.onmessage = handleSignalMessage;

        } catch (err) {
            console.error("Error starting call:", err);
            toast.error("Could not access microphone");
            setCallStatus('ended');
        }
    };

    const handleSignalMessage = async (event) => {
        const data = JSON.parse(event.data);
        if (!peerConnection.current) createPeerConnection(); // Ensure PC exists

        try {
            if (data.type === 'offer') {
                setCallStatus('connected'); // Technically establishing
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await peerConnection.current.createAnswer();
                await peerConnection.current.setLocalDescription(answer);
                ws.current.send(JSON.stringify({ type: 'answer', answer }));
            } else if (data.type === 'answer') {
                setCallStatus('connected');
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            } else if (data.type === 'candidate' && data.candidate) {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        } catch (e) {
            console.error("Signaling Error", e);
        }
    };

    const createPeerConnection = () => {
        if (peerConnection.current) return;

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                ws.current.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
            }
        };

        pc.ontrack = (event) => {
            // Voice call, so we attach audio
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current);
        });

        peerConnection.current = pc;
    };

    const createOffer = async () => {
        createPeerConnection();
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        ws.current.send(JSON.stringify({ type: 'offer', offer }));
    };

    const endCall = () => {
        if (ws.current) ws.current.close();
        if (peerConnection.current) peerConnection.current.close();
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
        setCallStatus('ended');
    };

    const handlePostCallAction = async (action) => {
        // Mock actions for 'follow', 'message'
        if (action === 'follow') {
            try {
                await api.post('/social/follow/', { username: targetUser.username });
                toast.success(`Followed ${targetUser.username}`);
            } catch (e) { toast.error("Failed to follow"); }
        } else if (action === 'block') {
            toast.error("Blocked user (Mock)");
        }
        navigate('/feed');
    };

    return (
        <div className="fixed inset-0 bg-gray-900 text-white flex flex-col items-center justify-center p-4">
            {/* Call Header */}
            <div className="absolute top-8 left-0 right-0 text-center">
                <p className="text-gray-400 text-sm uppercase tracking-widest mb-2 font-bold">Connectify Voice</p>
                <div className="flex items-center justify-center gap-2 text-green-400 bg-green-400/10 px-3 py-1 rounded-full w-fit mx-auto">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold">AI Moderation Active</span>
                </div>
            </div>

            {/* Profile Avatars Pulse */}
            <div className="relative flex items-center justify-center gap-12 mb-16">
                <div className="text-center relative">
                    <div className={`w-32 h-32 rounded-full overflow-hidden border-4 border-gray-700 mx-auto mb-4 relative z-10 ${callStatus === 'connected' ? 'shadow-[0_0_30px_rgba(147,51,234,0.5)]' : ''}`}>
                        <img src={targetUser.profile?.profile_pic || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-full h-full object-cover" />
                    </div>
                    {callStatus === 'waiting' && (
                        <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-20 z-0"></div>
                    )}
                    <h2 className="text-2xl font-bold">{targetUser.first_name}</h2>
                    <p className="text-purple-300">@{targetUser.username}</p>
                </div>
            </div>

            {/* Status Text */}
            <div className="text-center mb-12">
                {callStatus === 'waiting' && <p className="text-xl animate-pulse">Calling...</p>}
                {callStatus === 'connected' && <p className="text-xl font-bold text-green-400">Connected</p>}
                {callStatus === 'ended' && <p className="text-xl text-gray-500">Call Ended</p>}
            </div>

            {/* Conversation Starter */}
            {callStatus === 'connected' && (
                <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl max-w-md text-center mb-12 animate-fade-in">
                    <p className="text-xs text-purple-300 uppercase font-bold mb-2">AI Conversation Starter</p>
                    <p className="text-lg font-medium">"{conversationStarter}"</p>
                </div>
            )}

            {/* Controls */}
            {callStatus !== 'ended' ? (
                <div className="flex items-center gap-6">
                    <button className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </button>
                    <button onClick={endCall} className="p-5 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L8.228 8.028A1 1 0 007.279 7.28H5z" /></svg>
                    </button>
                </div>
            ) : (
                <div className="space-y-4 text-center">
                    <p className="mb-4 text-gray-400">How was your chat?</p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={() => handlePostCallAction('follow')} className="px-6 py-2 bg-purple-600 rounded-xl font-bold hover:bg-purple-700">Follow</button>
                        <button onClick={() => handlePostCallAction('block')} className="px-6 py-2 bg-gray-700 rounded-xl font-bold hover:bg-gray-600 text-red-400">Block</button>
                        <button onClick={() => navigate('/discover')} className="px-6 py-2 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100">Back</button>
                    </div>
                </div>
            )}

            {/* Hidden Audio Elements */}
            <audio ref={remoteVideoRef} autoPlay />
        </div>
    );
};

export default ConnectCall;
