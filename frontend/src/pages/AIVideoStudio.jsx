import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Layout from '../components/layout/Layout';
import VideoUploader from '../components/video/VideoUploader';
import VideoPreview from '../components/video/VideoPreview';
import CaptionEditor from '../components/CaptionEditor';
import AIAssistant from '../components/ai/AIAssistant';

const AIVideoStudio = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState('upload');
    const [video, setVideo] = useState(null);
    const [videoFile, setVideoFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [captions, setCaptions] = useState([]);
    const [showLanguageSelect, setShowLanguageSelect] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [aiMessages, setAiMessages] = useState(() => {
        const saved = localStorage.getItem('ai_studio_messages');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return parsed.length > 0 ? parsed : [
                    {
                        type: 'ai',
                        text: "👋 Hi! I'm your AI Media Assistant. Let's create an amazing video post together!",
                        timestamp: new Date()
                    },
                    {
                        type: 'ai',
                        text: "Upload your video to get started. I'll help you with captions and scheduling!",
                        timestamp: new Date()
                    }
                ];
            } catch (e) {
                console.error("Error parsing saved messages", e);
            }
        }
        return [
            {
                type: 'ai',
                text: "👋 Hi! I'm your AI Media Assistant. Let's create an amazing video post together!",
                timestamp: new Date()
            },
            {
                type: 'ai',
                text: "Upload your video to get started. I'll help you with captions and scheduling!",
                timestamp: new Date()
            }
        ];
    });

    // Save messages to localStorage when they change
    useEffect(() => {
        localStorage.setItem('ai_studio_messages', JSON.stringify(aiMessages));
    }, [aiMessages]);

    const addAIMessage = (text, type = 'ai') => {
        setAiMessages(prev => [...prev, {
            type,
            text,
            timestamp: new Date()
        }]);
    };

    const clearHistory = () => {
        const defaults = [
            {
                type: 'ai',
                text: "👋 Hi! I'm your AI Media Assistant. Let's create an amazing video post together!",
                timestamp: new Date()
            },
            {
                type: 'ai',
                text: "Upload your video to get started. I'll help you with captions and scheduling!",
                timestamp: new Date()
            }
        ];
        setAiMessages(defaults);
        localStorage.setItem('ai_studio_messages', JSON.stringify(defaults));
    };

    const handleVideoSelect = async (file) => {
        setVideoFile(file);
        addAIMessage(`Great! I see you've selected "${file.name}". Let me upload it for you...`, 'ai');

        const formData = new FormData();
        formData.append('video_file', file);
        formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
        formData.append('description', '');

        try {
            setProcessing(true);
            const response = await api.post('/videos/upload/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(progress);
                }
            });

            console.log('Upload response:', response.data);
            setVideo(response.data);
            setCurrentStep('preview');
            addAIMessage("✅ Upload complete! Your video looks great. Would you like me to generate captions?", 'ai');
            setProcessing(false);
        } catch (error) {
            console.error('Upload failed:', error);
            addAIMessage("❌ Oops! Upload failed. Please try again.", 'ai');
            setProcessing(false);
        }
    };

    const handleGenerateCaptions = async (language = 'auto') => {
        if (!video || !video.id) {
            addAIMessage("❌ Error: Video not ready. Please try uploading again.", 'ai');
            return;
        }

        setShowLanguageSelect(false);
        const langName = language === 'auto' ? 'Auto-detect' : language === 'en' ? 'English' : language === 'ml' ? 'Malayalam' : language === 'hi' ? 'Hindi' : language === 'ta' ? 'Tamil' : language;
        addAIMessage(`🎬 Generating captions (${langName}) with AI Whisper... This may take 1-2 minutes.`, 'ai');
        setProcessing(true);

        try {
            // Always regenerate fresh — pass regenerate:true to delete old captions
            const response = await api.post(`/videos/${video.id}/captions/generate/`, {
                language: language,
                regenerate: true
            });

            const data = response.data;

            if (data.captions && data.captions.length > 0) {
                addAIMessage(`✅ Generated ${data.captions_count} captions in ${data.language || langName}!`, 'ai');
                setCaptions(data.captions);
                setCurrentStep('captions');
                addAIMessage("Perfect! You can review captions below, then publish or schedule.", 'ai');
            } else {
                // Fetch from DB as fallback
                const captionsResponse = await api.get(`/videos/${video.id}/captions/`);
                const fetchedCaptions = captionsResponse.data?.captions || [];
                setCaptions(fetchedCaptions);
                if (fetchedCaptions.length > 0) {
                    addAIMessage(`✅ Generated ${fetchedCaptions.length} captions!`, 'ai');
                    setCurrentStep('captions');
                } else {
                    addAIMessage("⚠️ No captions were generated. The video may have no speech.", 'ai');
                }
            }
        } catch (error) {
            console.error('Caption generation failed:', error);
            const errMsg = error.response?.data?.error || error.message || 'Unknown error';
            addAIMessage(`❌ Caption generation failed: ${errMsg}`, 'ai');
        } finally {
            setProcessing(false);
        }
    };

    const handleSchedulePost = () => {
        setCurrentStep('schedule');
        addAIMessage("📅 When would you like to publish your video? You can publish now or schedule for later.", 'ai');
    };

    const handlePublish = async (scheduled = false) => {
        if (!video) return;

        // Validate captions exist
        if (!captions || captions.length === 0) {
            addAIMessage("❌ Please generate captions before publishing. Captions are required!", 'ai');
            return;
        }

        const publishData = {};

        if (scheduled && scheduleDate && scheduleTime) {
            const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
            publishData.scheduled_at = scheduledDateTime.toISOString();
            addAIMessage(`📅 Scheduling your video for ${scheduledDateTime.toLocaleString()}...`, 'ai');
        } else {
            addAIMessage("🚀 Publishing your video now...", 'ai');
        }

        setProcessing(true);

        try {
            const response = await api.post(`/videos/${video.id}/publish/`, publishData);

            if (scheduled) {
                addAIMessage(`🎉 Success! Your video is scheduled for ${new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString()}! Check your profile to see the countdown.`, 'ai');
            } else {
                addAIMessage("🎉 Success! Your video is now live!", 'ai');
            }

            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (error) {
            console.error('Publish failed:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Publish failed';
            addAIMessage(`❌ ${errorMsg}`, 'ai');
            setProcessing(false);
        }
    };

    const suggestionChips = {
        upload: [],
        preview: [
            { label: '🇬🇧 English Captions (any language → English)', action: () => handleGenerateCaptions('en') },
            { label: '� Original Language Captions', action: () => handleGenerateCaptions('auto') },
            { label: '�� Malayalam (original)', action: () => handleGenerateCaptions('ml') },
            { label: '🇮🇳 Hindi (original)', action: () => handleGenerateCaptions('hi') },
        ],
        captions: [
            { label: '🚀 Publish Now', action: () => handlePublish(false) },
            { label: '📅 Schedule Post', action: () => setCurrentStep('schedule') },
            { label: '🇬🇧 Re-generate English', action: () => handleGenerateCaptions('en') },
            { label: '🔄 Re-generate Original', action: () => handleGenerateCaptions('auto') },
        ],
        schedule: []
    };

    // Language selection chips (shown when user explicitly wants to choose)
    const languageChips = [
        { label: '🇬🇧 English (translate)', code: 'en' },
        { label: '� Auto-detect (original)', code: 'auto' },
        { label: '🇮🇳 Malayalam', code: 'ml' },
        { label: '🇮🇳 Hindi', code: 'hi' },
        { label: '🇮🇳 Tamil', code: 'ta' },

    ];

    // Get minimum datetime for scheduling (current time + 5 minutes)
    const getMinDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        return now.toISOString().slice(0, 16);
    };

    const handleUserMessage = (text) => {
        // Add user message
        addAIMessage(text, 'user');

        // Simulate thinking and response
        setProcessing(true);
        setTimeout(() => {
            const lowerText = text.toLowerCase();
            let response = "I'm processing your request. How else can I assist with your video project?";

            if (lowerText.includes('upload')) {
                response = "You can upload a video by clicking the 'Drag & drop' area on the right. I'll handle the rest!";
            } else if (lowerText.includes('caption') || lowerText.includes('subtitle')) {
                response = "Once you upload a video, I can generate highly accurate captions for you in multiple languages.";
            } else if (lowerText.includes('schedule') || lowerText.includes('time')) {
                response = "I can help you schedule your posts for peak engagement times. Just upload a video to see the options!";
            } else if (lowerText.includes('hello') || lowerText.includes('hi')) {
                response = "Hello! I'm your AI Media Assistant. Ready to help you create some viral content?";
            }

            addAIMessage(response, 'ai');
            setProcessing(false);
        }, 1000);
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 pb-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl">
                            <span className="text-4xl">🤖</span>
                        </div>
                        <div className="text-left">
                            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                                AI Video Studio
                            </h1>
                            <p className="text-gray-500 font-medium">Your intelligent video assistant</p>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Left: AI Assistant Chat */}
                    <div className="order-2 lg:order-1">
                        <AIAssistant
                            messages={aiMessages}
                            suggestions={showLanguageSelect ? languageChips.map(lang => ({
                                label: lang.label,
                                action: () => handleGenerateCaptions(lang.code)
                            })) : suggestionChips[currentStep]}
                            processing={processing}
                            onSendMessage={handleUserMessage}
                            onClear={clearHistory}
                        />
                    </div>

                    {/* Right: Main Content */}
                    <div className="order-1 lg:order-2">
                        <div className="bg-white/70 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl p-8">
                            {currentStep === 'upload' && (
                                <VideoUploader
                                    onVideoSelect={handleVideoSelect}
                                    progress={uploadProgress}
                                    processing={processing}
                                />
                            )}

                            {currentStep === 'preview' && video && (
                                <VideoPreview
                                    video={video}
                                    videoFile={videoFile}
                                    captions={captions}
                                />
                            )}

                            {currentStep === 'captions' && (
                                <div className="space-y-6">
                                    <CaptionEditor
                                        videoId={video?.id}
                                        captions={captions}
                                        onCaptionsUpdate={setCaptions}
                                    />

                                    {/* Publish Options */}
                                    <div className="border-t pt-6">
                                        <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                                            Ready to Publish?
                                        </h3>
                                        {captions.length === 0 && (
                                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                                                <p className="text-sm text-amber-800 font-medium">
                                                    ⚠️ Please generate captions before publishing
                                                </p>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => handlePublish(false)}
                                                disabled={processing || captions.length === 0}
                                                className="px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-2xl hover:shadow-green-500/50 transition-all duration-300 active:scale-95 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                🚀 Publish Now
                                            </button>
                                            <button
                                                onClick={() => setCurrentStep('schedule')}
                                                disabled={processing || captions.length === 0}
                                                className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 active:scale-95 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                📅 Schedule Post
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 'schedule' && (
                                <div className="text-center py-12">
                                    <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                                        <span className="text-6xl">📅</span>
                                    </div>
                                    <h2 className="text-3xl font-black text-gray-900 mb-4">Schedule Your Post</h2>
                                    <p className="text-gray-600 mb-8">Choose when to publish your video</p>

                                    <div className="max-w-md mx-auto space-y-6">
                                        {/* Schedule Options */}
                                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 space-y-4">
                                            <div>
                                                <label className="block text-left text-sm font-semibold text-gray-700 mb-2">
                                                    📅 Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={scheduleDate}
                                                    onChange={(e) => setScheduleDate(e.target.value)}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-left text-sm font-semibold text-gray-700 mb-2">
                                                    ⏰ Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={scheduleTime}
                                                    onChange={(e) => setScheduleTime(e.target.value)}
                                                    className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                                                />
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => handlePublish(true)}
                                                disabled={processing || !scheduleDate || !scheduleTime}
                                                className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 active:scale-95 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {processing ? '📅 Scheduling...' : '📅 Schedule Post'}
                                            </button>

                                            <button
                                                onClick={() => handlePublish(false)}
                                                disabled={processing}
                                                className="w-full px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-2xl hover:shadow-green-500/50 transition-all duration-300 active:scale-95 transform hover:scale-105 disabled:opacity-50"
                                            >
                                                {processing ? '🚀 Publishing...' : '🚀 Publish Now'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AIVideoStudio;
