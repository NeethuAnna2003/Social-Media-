import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MicrophoneIcon,
  GlobeAltIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  ClockIcon,
  PencilIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import api from '../api/axios';

const AICaptionGenerator = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detectingLanguage, setDetectingLanguage] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [captions, setCaptions] = useState([]);
  const [currentCaption, setCurrentCaption] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
    { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
    { code: 'te', name: 'Telugu', flag: '🇮🇳' },
    { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
    { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
    { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
    { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
    { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
  ];

  useEffect(() => {
    if (videoId && videoId !== 'undefined') {
      fetchVideoData();
    } else {
      setLoading(false);
      setError('No video selected. Please upload a video first.');
    }
  }, [videoId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && isPlaying) {
        setCurrentTime(videoRef.current.currentTime);
        updateCurrentCaption();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, captions]);

  const fetchVideoData = async () => {
    if (!videoId || videoId === 'undefined') {
      setError('Invalid video ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/videos/${videoId}/`);
      setVideo(response.data);

      // If no captions exist, auto-detect language
      if (!response.data.captions || response.data.captions.length === 0) {
        detectLanguage();
      } else {
        setCaptions(response.data.captions);
        setDetectedLanguage(response.data.original_language || 'en');
        setSelectedLanguage(response.data.original_language || 'en');
        setShowPreview(true);
      }

      console.log('Video data loaded:', response.data);
    } catch (err) {
      console.error('Failed to fetch video:', err);
      setError(err.response?.data?.error || 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const detectLanguage = async () => {
    setDetectingLanguage(true);
    setError(null);

    try {
      const response = await api.post(`/videos/${videoId}/detect-language/`);

      if (response.data.task_id) {
        monitorDetectionProgress(response.data.task_id);
      }
    } catch (err) {
      console.error('Language detection failed:', err);
      setError(err.response?.data?.error || 'Failed to detect language');
      setDetectingLanguage(false);
    }
  };

  const monitorDetectionProgress = (taskId) => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/tasks/${taskId}/status/`);

        if (response.data.status === 'SUCCESS') {
          clearInterval(interval);
          const result = response.data.result;

          if (result.status === 'success') {
            const lang = result.language || 'en';
            setDetectedLanguage(lang);
            setSelectedLanguage(lang);
            if (result.captions) {
              setCaptions(result.captions);
              setShowPreview(true);
            }
          } else {
            setError(result.error || 'Detection failed');
          }
          setDetectingLanguage(false);
        } else if (response.data.status === 'FAILURE') {
          clearInterval(interval);
          setError('Language detection failed');
          setDetectingLanguage(false);
        }
      } catch (err) {
        console.error('Detection monitoring failed:', err);
        clearInterval(interval);
        setDetectingLanguage(false);
      }
    }, 2000);
  };

  const generateCaptions = async () => {
    setGenerating(true);
    setError(null);
    setProgress(0);

    try {
      const response = await api.post(`/videos/${videoId}/captions/generate/`, {
        language: selectedLanguage,
        detect_language: !detectedLanguage
      });

      console.log('Caption generation response:', response.data);

      if (response.data.task_id) {
        monitorProgress(response.data.task_id);
      }
    } catch (err) {
      console.error('Caption generation failed:', err);
      setError(err.response?.data?.error || 'Failed to generate captions');
      setGenerating(false);
    }
  };

  const monitorProgress = (taskId) => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/tasks/${taskId}/status/`);
        // Mock progress for now since backend doesn't stream it easily in async result until done
        setProgress(prev => Math.min(prev + 10, 90));

        if (response.data.status === 'SUCCESS') {
          clearInterval(interval);
          const result = response.data.result;

          if (result.status === 'success') {
            setCaptions(result.captions || []);
            setShowPreview(true);
            setProgress(100);
          } else {
            setError(result.error || 'Generation failed');
          }
          setGenerating(false);
        } else if (response.data.status === 'FAILURE') {
          clearInterval(interval);
          setError(response.data.error || 'Caption generation failed');
          setGenerating(false);
        }
      } catch (err) {
        console.error('Progress monitoring failed:', err);
        clearInterval(interval);
        setGenerating(false);
      }
    }, 2000);
  };

  const updateCurrentCaption = () => {
    if (!videoRef.current || captions.length === 0) return;

    const currentTime = videoRef.current.currentTime;
    const current = captions.find(
      caption => currentTime >= caption.start_time && currentTime <= caption.end_time
    );
    setCurrentCaption(current);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seekToCaption = (caption) => {
    if (videoRef.current) {
      videoRef.current.currentTime = caption.start_time;
      setCurrentTime(caption.start_time);
      updateCurrentCaption();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const publishWithCaptions = async () => {
    if (!videoId) return;
    if (!captions || captions.length === 0) {
      setError('Please generate captions before publishing.');
      return;
    }

    try {
      setPublishing(true);
      setError(null);

      // Determine caption mode accurately
      const originalLang = video?.original_language || (Array.isArray(captions) ? (captions.find(c => !c.is_translated)?.language || captions[0]?.language) : null);
      const isOriginal = originalLang ? (selectedLanguage === originalLang) : true;
      const payload = {
        caption_enabled: true,
        caption_language_mode: isOriginal ? 'original' : 'translated',
      };
      if (!isOriginal) {
        payload.translation_language = selectedLanguage;
      }

      // Enable captions on the video
      await api.patch(`/videos/${videoId}/`, payload);

      // Publish the video
      await api.post(`/videos/${videoId}/publish/`);

      // Navigate to feed
      navigate('/');
    } catch (err) {
      console.error('Failed to publish video with captions:', err);
      setError(err.response?.data?.error || 'Failed to publish video');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>Loading video...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Caption Generator</h1>
          <p className="text-gray-400">
            Generate accurate captions for your video with AI-powered language detection
          </p>
        </div>

        {/* Video Preview */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Video Preview</h2>
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={video?.video_file}
              className="w-full h-auto max-h-96"
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                }
              }}
            />

            {/* Premium TikTok-style Caption Overlay */}
            {currentCaption && showPreview && (
              <div className="absolute bottom-20 left-4 right-4 flex justify-center pointer-events-none">
                <div className="max-w-[80%] text-center transition-all duration-200 ease-in-out transform">
                  <p
                    className="text-white text-2xl md:text-3xl font-black leading-tight tracking-wide"
                    style={{
                      textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
                    }}
                  >
                    {currentCaption.text}
                  </p>
                </div>
              </div>
            )}

            {/* Video Controls */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center space-x-4">
              <button
                onClick={togglePlayPause}
                className="bg-white/20 hover:bg-white/30 rounded-full p-3 transition-colors"
              >
                {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
              </button>
              <div className="flex-1 bg-white/20 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: videoRef.current
                      ? `${(currentTime / videoRef.current.duration) * 100}%`
                      : '0%'
                  }}
                ></div>
              </div>
              <span className="text-white text-sm">
                {formatTime(currentTime)} / {videoRef.current ? formatTime(videoRef.current.duration) : '00:00'}
              </span>
            </div>
          </div>
        </div>

        {/* Language Detection & Selection */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <GlobeAltIcon className="w-6 h-6 mr-2" />
            Language Configuration
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Language Detection */}
            <div>
              <h3 className="text-lg font-medium mb-3">Detect Spoken Language</h3>
              <button
                onClick={detectLanguage}
                disabled={detectingLanguage}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
              >
                {detectingLanguage ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
                    Detecting...
                  </>
                ) : (
                  <>
                    <MicrophoneIcon className="w-5 h-5 mr-2" />
                    Detect Language
                  </>
                )}
              </button>

              {detectedLanguage && (
                <div className="mt-4 p-4 bg-green-500/20 border border-green-500 rounded-lg">
                  <p className="text-green-400 font-medium">
                    Detected: {languages.find(l => l.code === detectedLanguage)?.name || detectedLanguage}
                  </p>
                </div>
              )}
            </div>

            {/* Language Selection */}
            <div>
              <h3 className="text-lg font-medium mb-3">Select Caption Language</h3>
              <div className="grid grid-cols-2 gap-3">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={`p-3 rounded-lg border transition-colors ${selectedLanguage === lang.code
                      ? 'bg-blue-600 border-blue-500'
                      : 'bg-gray-700 border-gray-600 hover:bg-gray-650'
                      }`}
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">{lang.flag}</span>
                      <div className="text-left">
                        <p className="font-medium">{lang.name}</p>
                        <p className="text-xs text-gray-400">{lang.code.toUpperCase()}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Caption Generation */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Generate Captions</h2>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-300">
                Generate captions for your video in <strong>{languages.find(l => l.code === selectedLanguage)?.name}</strong>
              </p>
              <p className="text-gray-400 text-sm">
                This will process the entire video and create time-synced captions
              </p>
            </div>
            <button
              onClick={generateCaptions}
              disabled={generating}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-8 py-3 rounded-lg font-medium transition-colors flex items-center"
            >
              {generating ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <MicrophoneIcon className="w-5 h-5 mr-2" />
                  Generate Captions
                </>
              )}
            </button>
          </div>

          {/* Progress Bar */}
          {(generating || progress > 0) && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Progress</span>
                <span className="text-sm text-gray-400">{progress}%</span>
              </div>
              <div className="bg-gray-700 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Captions Preview */}
        {showPreview && captions.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">
              Generated Captions ({captions.length})
            </h2>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {captions.map((caption, index) => (
                <div
                  key={caption.id || index}
                  className={`bg-gray-700 rounded-lg p-4 border cursor-pointer transition-colors ${currentCaption?.id === caption.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-600 hover:border-gray-500'
                    }`}
                  onClick={() => seekToCaption(caption)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-white font-medium mb-2">{caption.text}</p>
                      <div className="flex items-center text-sm text-gray-400">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        <span>{formatTime(caption.start_time)} - {formatTime(caption.end_time)}</span>
                        <span className="mx-2">•</span>
                        <span>Confidence: {Math.round(caption.confidence * 100)}%</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Edit functionality can be added here
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-gray-400">
                Click on any caption to jump to that time in the video
              </p>
              <button
                onClick={() => navigate(`/videos/${videoId}/captions/edit`)}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Edit Captions
              </button>
            </div>

            {/* Publish CTA */}
            <div className="mt-4 flex items-center justify-end">
              <button
                onClick={publishWithCaptions}
                disabled={publishing}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                {publishing ? 'Publishing…' : 'Publish with Captions'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AICaptionGenerator;
