import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClockIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';
import CaptionOverlay from './video/CaptionOverlay';
import api from '../api/axios';

const CaptionEditor = ({ videoId: propVideoId, captions: propCaptions, onCaptionsUpdate }) => {
  const params = useParams();
  const navigate = useNavigate();
  // Use prop if available, otherwise param from route
  const videoId = propVideoId || params.videoId;

  // Determine if we are in "embedded" mode (inside AIVideoStudio) or standalone page
  const isEmbedded = !!propVideoId;

  const [video, setVideo] = useState(null);
  const [captions, setCaptions] = useState(propCaptions || []);
  const [loading, setLoading] = useState(!propVideoId); // If prop provided, we assume parent might handle loading or we fetch quickly
  const [generating, setGenerating] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('original');
  const [editingCaption, setEditingCaption] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);

  const languages = [
    { code: 'original', name: 'Original' },
    { code: 'en', name: 'English' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ta', name: 'Tamil' },
    { code: 'te', name: 'Telugu' },
    { code: 'kn', name: 'Kannada' },
  ];

  // Sync prop captions if they update from parent
  useEffect(() => {
    if (propCaptions) {
      setCaptions(propCaptions);
    }
  }, [propCaptions]);

  // Notify parent of updates
  const updateCaptionsState = (newCaptions) => {
    const verifiedCaptions = Array.isArray(newCaptions) ? newCaptions : [];
    setCaptions(verifiedCaptions);
    if (onCaptionsUpdate) {
      onCaptionsUpdate(verifiedCaptions);
    }
  };

  useEffect(() => {
    if (videoId && videoId !== 'undefined') {
      // Only fetch video data if we don't have it (or if standalone)
      // For embedded, parent usually fetches, but we might need video details for preview
      fetchVideoData();

      // If no initial captions passed, fetch them
      if (!propCaptions || propCaptions.length === 0) {
        fetchCaptions();
      }
    } else {
      setLoading(false);
      setError('No video selected or invalid video ID.');
    }
  }, [videoId]);

  // ... (rest of useEffects like selectedLanguage remain similar)
  useEffect(() => {
    if (selectedLanguage !== 'original') {
      fetchCaptions(selectedLanguage);
    } else {
      // Avoid re-fetching on init if we have props
      if (!propCaptions || selectedLanguage !== 'original') {
        fetchCaptions();
      }
    }
  }, [selectedLanguage]);

  const fetchVideoData = async () => {
    if (!videoId || videoId === 'undefined') {
      setError('Invalid video ID');
      setLoading(false);
      return;
    }

    try {
      // If embedded, we might want to skip full loading state if possible, 
      // but fetching video details (url) is needed for the player.
      setLoading(true);
      const response = await api.get(`/videos/${videoId}/`);
      setVideo(response.data);
    } catch (err) {
      console.error('Failed to fetch video data:', err);
      // Only show error if we heavily rely on this.
      // In embedded mode, maybe parent handles video existence.
      setError(err.response?.data?.error || 'Failed to fetch video');
    } finally {
      setLoading(false);
    }
  };

  const fetchCaptions = async (language = null) => {
    if (!videoId || videoId === 'undefined') return;

    try {
      // Don't set full loading if just switching languages, maybe a smaller indicator
      // But for now keeping it simple
      const url = language
        ? `/videos/${videoId}/captions/?language=${language}`
        : `/videos/${videoId}/captions/`;

      const response = await api.get(url);
      updateCaptionsState(response.data.captions || []);
    } catch (err) {
      console.error('Failed to fetch captions:', err);
      // Don't block UI on caption fetch fail, just show empty
    }
  };

  const generateCaptions = async (language = 'auto', regenerate = true) => {
    setGenerating(true);
    setError(null);

    try {
      // Always regenerate fresh — delete old captions first
      const response = await api.post(`/videos/${videoId}/captions/generate/`, {
        language,
        regenerate: true
      });

      const data = response.data;
      console.log('Caption generation response:', data);

      if (data.captions && data.captions.length > 0) {
        console.log(`Received ${data.captions.length} captions in ${data.language}`);
        updateCaptionsState(data.captions);
        setSelectedLanguage('original');
        fetchVideoData();
      } else if (data.task_id) {
        monitorTask(data.task_id);
      } else {
        await fetchCaptions();
        setSelectedLanguage('original');
      }

    } catch (err) {
      console.error('Failed to generate captions:', err);
      setError(err.response?.data?.error || 'Failed to generate captions. Check server logs.');
    } finally {
      setGenerating(false);
    }
  };

  const translateCaptions = async (targetLanguage) => {
    setTranslating(true);
    setError(null);

    try {
      const response = await api.post(`/videos/${videoId}/captions/translate/`, {
        target_language: targetLanguage
      });

      const data = response.data;

      if (data.task_id) {
        monitorTask(data.task_id);
      } else {
        setSelectedLanguage(targetLanguage);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to translate');
    } finally {
      setTranslating(false);
    }
  };

  const monitorTask = async (taskId) => {
    const checkStatus = async () => {
      try {
        const response = await api.get(`/tasks/${taskId}/status/`);
        const data = response.data;

        setTaskStatus(data);

        if (data.ready) {
          if (data.successful) {
            fetchCaptions(); // Refresh list
            if (data.result?.language) {
              // Optional: switch view to that language
            }
          } else {
            setError(data.error || 'Task failed');
          }
        } else {
          setTimeout(checkStatus, 2000);
        }
      } catch (err) {
        setError('Failed to monitor progress');
      }
    };

    checkStatus();
  };

  const updateCaption = async (captionId, newText) => {
    try {
      await api.patch(`/videos/captions/${captionId}/`, {
        text: newText
      });

      updateCaptionsState(captions.map(cap =>
        cap.id === captionId ? { ...cap, text: newText } : cap
      ));

      setEditingCaption(null);
    } catch (err) {
      setError('Failed to save caption');
    }
  };

  const deleteCaption = async (captionId) => {
    try {
      await api.delete(`/videos/captions/${captionId}/`);
      updateCaptionsState(captions.filter(cap => cap.id !== captionId));
    } catch (err) {
      setError('Failed to delete caption');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePostVideo = async () => {
    if (!videoId || captions.length === 0) {
      setError('Please generate captions before posting');
      return;
    }

    try {
      setLoading(true);

      // Publish the video
      const response = await api.post(`/videos/${videoId}/publish/`);

      // Show success message
      alert('Video posted successfully with captions!');

      // Navigate to home/feed
      navigate('/');

    } catch (err) {
      console.error('Failed to post video:', err);
      setError(err.response?.data?.error || 'Failed to post video');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentCaption = () => {
    if (!Array.isArray(captions) || captions.length === 0) {
      console.log('No captions available');
      return null;
    }

    // Log for debugging
    console.log(`Current time: ${currentTime.toFixed(2)}s, Total captions: ${captions.length}`);

    // Find caption that matches current time
    const matchedCaption = captions.find(cap => {
      const start = parseFloat(cap.start_time);
      const end = parseFloat(cap.end_time);
      const matches = currentTime >= start && currentTime <= end;

      if (matches) {
        console.log(`✓ Matched caption: "${cap.text}" (${start}s - ${end}s)`);
      }

      return matches;
    });

    if (!matchedCaption && captions.length > 0) {
      console.log(`No caption match. First caption starts at ${captions[0].start_time}s`);
    }

    return matchedCaption || null;
  };

  // --- Render Helpers ---

  if (loading) {
    return (
      <div className={`${!isEmbedded ? 'min-h-screen bg-gray-900 text-white' : 'text-gray-800'} flex items-center justify-center py-12`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isEmbedded ? 'border-primary-600' : 'border-blue-500'} mx-auto mb-4`}></div>
          <p>Loading video data...</p>
        </div>
      </div>
    );
  }

  if (error && !video && !isEmbedded) {
    // Only show full page error if standalone
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 mb-4">
            <p className="text-red-400">{error}</p>
          </div>
          <button
            onClick={() => navigate('/studio')}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Back to Studio
          </button>
        </div>
      </div>
    );
  }

  // Layout classes based on mode
  const containerClass = isEmbedded
    ? "w-full text-left"
    : "min-h-screen bg-gray-900 text-white";

  const cardClass = isEmbedded
    ? "bg-white/50 border border-gray-200"
    : "bg-gray-800 border-gray-700";

  const textClass = isEmbedded ? "text-gray-800" : "text-white";
  const subTextClass = isEmbedded ? "text-gray-500" : "text-gray-400";

  return (
    <div className={containerClass}>
      {/* Header - Only show if standalone */}
      {!isEmbedded && (
        <div className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{video?.title}</h1>
                <p className="text-gray-400">Edit Captions</p>
              </div>
              <button
                onClick={() => navigate(`/videos/${videoId}`)}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg"
              >
                Back to Video
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`${isEmbedded ? '' : 'max-w-7xl mx-auto px-4 py-6'}`}>

        {/* Error Display (Embedded) */}
        {error && isEmbedded && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Video Preview with YouTube-style Caption Overlay */}
        <div className={`rounded-xl p-6 mb-6 ${cardClass}`}>
          <div className="aspect-video bg-black rounded-lg mb-4 relative overflow-hidden">
            {video?.video_file ? (
              <>
                <video
                  className="w-full h-full object-contain"
                  controls
                  src={video.video_file}
                  onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                >
                  Your browser does not support the video tag.
                </video>

                {/* YouTube-style Caption Overlay */}
                {/* YouTube-style Caption Overlay */}
                <CaptionOverlay text={getCurrentCaption()?.text} />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <p>Video not available</p>
              </div>
            )}
          </div>

          {/* Current Caption Display */}
          <div className={`${isEmbedded ? 'bg-gray-100' : 'bg-gray-700'} rounded-lg p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm ${subTextClass}`}>Current Caption</span>
              <span className="text-sm text-blue-500 font-mono">{formatTime(currentTime)}</span>
            </div>
            <div className={`text-lg font-medium ${textClass} min-h-[2rem]`}>
              {(() => {
                const currentCaption = getCurrentCaption();
                if (currentCaption) {
                  return <span className="leading-relaxed">{currentCaption.text}</span>;
                } else if (captions.length > 0) {
                  // Show helpful message if captions exist but none match current time
                  const firstCaption = captions[0];
                  if (currentTime < firstCaption.start_time) {
                    return <span className="text-gray-400 italic text-sm">Caption starts at {formatTime(firstCaption.start_time)}</span>;
                  } else {
                    return <span className="text-gray-400 italic text-sm">No caption at this time</span>;
                  }
                } else {
                  return <span className="text-gray-400 italic">No caption at this time</span>;
                }
              })()}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className={`rounded-xl p-6 mb-6 ${cardClass}`}>
          <div className="flex flex-col md:flex-row gap-6">

            {/* Left: Language & Generation */}
            <div className="flex-1 space-y-4">
              <h3 className={`text-lg font-semibold ${textClass} border-b pb-2 ${isEmbedded ? 'border-gray-200' : 'border-gray-700'}`}>
                Caption Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Generation Language */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${subTextClass}`}>
                    Audio Language (for AI)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedLanguage === 'original' ? 'auto' : 'ml'}
                      onChange={(e) => {
                        // Logic would go here
                      }}
                      className={`w-full rounded-lg px-3 py-2 border ${isEmbedded
                        ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                        : 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500'}`}
                      disabled={generating}
                    >
                      <option value="auto">Auto-detect (Recommended)</option>
                      <option value="en">English</option>
                      <option value="ml">Malayalam</option>
                      <option value="hi">Hindi</option>
                    </select>
                  </div>
                </div>

                {/* Display Language */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${subTextClass}`}>
                    Display / Translation
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className={`w-full rounded-lg px-3 py-2 border ${isEmbedded
                        ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                        : 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500'}`}
                    >
                      {languages.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => generateCaptions('auto', captions.length > 0)}
                  disabled={generating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm font-medium"
                >
                  {generating ? (
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  ) : (
                    <PencilIcon className="w-5 h-5" />
                  )}
                  {captions.length > 0 ? 'Regenerate Captions' : 'Generate Captions'}
                </button>

                {selectedLanguage !== 'original' && (
                  <button
                    onClick={() => translateCaptions(selectedLanguage)}
                    disabled={translating}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm font-medium"
                  >
                    {translating ? (
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    ) : (
                      <GlobeAltIcon className="w-5 h-5" />
                    )}
                    Translate to {languages.find(l => l.code === selectedLanguage)?.name}
                  </button>
                )}
              </div>
            </div>

            {/* Right: Info / Status */}
            <div className={`w-full md:w-64 p-4 rounded-lg flex flex-col gap-3 ${isEmbedded ? 'bg-gray-50 border border-gray-200' : 'bg-gray-800 border border-gray-700'}`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${subTextClass}`}>Detected Language</p>
                <p className={`text-lg font-medium ${textClass}`}>
                  {captions.length > 0 && captions[0].language
                    ? <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      {languages.find(l => l.code === captions[0].language)?.name || captions[0].language}
                    </span>
                    : <span className="text-gray-400 italic">Not detected yet</span>
                  }
                </p>
              </div>

              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${subTextClass}`}>Status</p>
                {taskStatus ? (
                  <div className="flex items-center gap-2">
                    {taskStatus.status === 'SUCCESS' ? (
                      <span className="text-green-600 font-medium">Completed</span>
                    ) : (
                      <span className="text-blue-600 font-medium animate-pulse">Processing...</span>
                    )}
                  </div>
                ) : (
                  <p className={`text-sm ${textClass}`}>
                    {captions.length > 0 ? `${captions.length} lines parsed` : 'Ready to generate'}
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Post Video Button */}
        {captions.length > 0 && (
          <div className="rounded-xl p-6 mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Ready to Post!
                </h3>
                <p className="text-sm text-gray-600">
                  Your video has {captions.length} caption{captions.length !== 1 ? 's' : ''} in{' '}
                  <span className="font-semibold">
                    {languages.find(l => l.code === (captions[0]?.language || 'en'))?.name || 'Original'}
                  </span>
                </p>
              </div>
              <button
                onClick={handlePostVideo}
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-3 rounded-xl flex items-center gap-3 transition-all shadow-lg hover:shadow-xl font-semibold text-lg disabled:cursor-not-allowed"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {loading ? 'Posting...' : 'Post Video with Captions'}
              </button>
            </div>
          </div>
        )}

        {/* Captions List */}
        <div className={`rounded-xl p-6 ${cardClass}`}>
          <h3 className={`text-lg font-semibold mb-4 ${textClass}`}>
            Captions ({captions.length})
          </h3>

          {loading ? (
            <p className={subTextClass}>Loading...</p>
          ) : captions.length === 0 ? (
            <div className="text-center py-12">
              <div className={`${isEmbedded ? 'bg-gray-50' : 'bg-gray-700'} rounded-lg p-8`}>
                <PencilIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className={`text-xl font-semibold mb-2 ${textClass}`}>No captions yet</h3>
                <p className={`${subTextClass} mb-4`}>
                  Generate captions with AI or add them manually
                </p>
                <button
                  onClick={() => generateCaptions('auto')}
                  disabled={generating}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md transition-colors"
                >
                  Generate Captions with AI
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {Array.isArray(captions) && captions.map((caption) => (
                <div
                  key={caption.id}
                  className={`rounded-lg p-4 border transition-all ${getCurrentCaption()?.id === caption.id
                    ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10'
                    : `border-transparent ${isEmbedded ? 'hover:bg-gray-50' : 'hover:bg-gray-700'} bg-opacity-50`
                    } ${isEmbedded ? 'bg-gray-50' : 'bg-gray-700'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-xs text-blue-500 font-mono font-medium">
                          {formatTime(caption.start_time)} - {formatTime(caption.end_time)}
                        </span>
                        <span className="text-xs bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                          {caption.language}
                        </span>
                      </div>

                      {editingCaption === caption.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={caption.text}
                            onChange={(e) => {
                              const newText = e.target.value;
                              updateCaptionsState(captions.map(cap =>
                                cap.id === caption.id ? { ...cap, text: newText } : cap
                              ));
                            }}
                            className={`rounded px-3 py-1 flex-1 border ${isEmbedded ? 'border-gray-300' : 'bg-gray-600 border-transparent text-white'}`}
                            autoFocus
                          />
                          <button
                            onClick={() => updateCaption(caption.id, caption.text)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingCaption(null)}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <p className={textClass}>{caption.text}</p>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4 opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingCaption(caption.id)}
                        className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                        title="Edit caption"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteCaption(caption.id)}
                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                        title="Delete caption"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaptionEditor;
