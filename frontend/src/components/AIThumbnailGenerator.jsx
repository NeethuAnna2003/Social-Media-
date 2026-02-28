import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PhotoIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  CheckIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  SwatchIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import api from '../api/axios';

const AIThumbnailGenerator = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [thumbnails, setThumbnails] = useState([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [selectedTemplates, setSelectedTemplates] = useState(['clean', 'face', 'gradient']);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [taskId, setTaskId] = useState(null);

  const templates = [
    { id: 'clean', name: 'Clean', icon: Squares2X2Icon, description: 'Simple, professional layout' },
    { id: 'face', name: 'Face Focus', icon: PhotoIcon, description: 'Highlights faces in the video' },
    { id: 'gradient', name: 'Gradient', icon: SwatchIcon, description: 'Modern gradient backgrounds' },
    { id: 'creator', name: 'Creator Style', icon: StarIcon, description: 'Social media optimized' }
  ];

  useEffect(() => {
    fetchVideoData();
  }, [videoId]);

  useEffect(() => {
    if (taskId) {
      const interval = setInterval(() => {
        checkTaskStatus();
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [taskId]);

  const fetchVideoData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/videos/${videoId}/`);
      setVideo(response.data);

      // Check if thumbnails already exist
      const thumbnailsResponse = await api.get(`/videos/${videoId}/thumbnails/`);
      if (thumbnailsResponse.data.thumbnails && Array.isArray(thumbnailsResponse.data.thumbnails) && thumbnailsResponse.data.thumbnails.length > 0) {
        setThumbnails(thumbnailsResponse.data.thumbnails);
      }
    } catch (err) {
      console.error('Failed to fetch video:', err);
      setError(err.response?.data?.error || 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplate = (templateId) => {
    setSelectedTemplates(prev => {
      if (prev.includes(templateId)) {
        return prev.filter(id => id !== templateId);
      } else {
        return [...prev, templateId];
      }
    });
  };

  const generateThumbnails = async () => {
    if (selectedTemplates.length === 0) {
      setError('Please select at least one template');
      return;
    }

    setGenerating(true);
    setError(null);
    setProgress(0);

    try {
      const response = await api.post(`/videos/${videoId}/thumbnails/generate/`, {
        templates: selectedTemplates
      });

      console.log('Thumbnail generation response:', response.data);

      if (response.data.task_id) {
        setTaskId(response.data.task_id);
      } else {
        // Immediate result (unlikely for thumbnails)
        setThumbnails(response.data.thumbnails || []);
        setProgress(100);
      }
    } catch (err) {
      console.error('Thumbnail generation failed:', err);
      setError(err.response?.data?.error || 'Failed to generate thumbnails');
    } finally {
      setGenerating(false);
    }
  };

  const checkTaskStatus = async () => {
    try {
      const response = await api.get(`/tasks/${taskId}/status/`);
      setProgress(response.data.progress || 0);

      if (response.data.status === 'completed') {
        setThumbnails(response.data.thumbnails || []);
        setProgress(100);
        setTaskId(null);
        setGenerating(false);
      } else if (response.data.status === 'failed') {
        setError(response.data.error_message || 'Thumbnail generation failed');
        setTaskId(null);
        setGenerating(false);
      }
    } catch (err) {
      console.error('Failed to check task status:', err);
      setTaskId(null);
      setGenerating(false);
    }
  };

  const selectThumbnail = async (thumbnailId) => {
    try {
      await api.post(`/videos/${videoId}/thumbnails/select/`, {
        thumbnail_id: thumbnailId
      });

      setSelectedThumbnail(thumbnailId);
      console.log('Thumbnail selected successfully');
    } catch (err) {
      console.error('Failed to select thumbnail:', err);
      setError(err.response?.data?.error || 'Failed to select thumbnail');
    }
  };

  const downloadThumbnail = (thumbnailUrl, filename) => {
    const link = document.createElement('a');
    link.href = thumbnailUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <h1 className="text-3xl font-bold mb-2">AI Thumbnail Generator</h1>
          <p className="text-gray-400">
            Generate professional thumbnails using AI-powered frame analysis and design templates
          </p>
        </div>

        {/* Video Info */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Video Information</h2>
          <div className="flex items-center space-x-6">
            <div className="w-32 h-20 bg-gray-700 rounded-lg flex items-center justify-center">
              <PhotoIcon className="w-8 h-8 text-gray-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium">{video?.title}</h3>
              <p className="text-gray-400">
                Duration: {video?.duration ? Math.floor(video.duration / 60) : 0}:{(video?.duration || 0) % 60 < 10 ? '0' : ''}{(video?.duration || 0) % 60}
              </p>
              <p className="text-gray-400">
                Status: <span className="capitalize">{video?.status || 'Unknown'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Template Selection */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Choose Design Templates</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {templates.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  onClick={() => toggleTemplate(template.id)}
                  className={`p-4 rounded-lg border transition-all ${selectedTemplates.includes(template.id)
                    ? 'bg-blue-600 border-blue-500'
                    : 'bg-gray-700 border-gray-600 hover:bg-gray-650'
                    }`}
                >
                  <Icon className="w-8 h-8 mx-auto mb-2" />
                  <h3 className="font-medium text-sm">{template.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">{template.description}</p>
                  {selectedTemplates.includes(template.id) && (
                    <CheckIcon className="w-4 h-4 mx-auto mt-2 text-blue-400" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-gray-300">
              {selectedTemplates.length} template{selectedTemplates.length !== 1 ? 's' : ''} selected
            </p>
            <button
              onClick={generateThumbnails}
              disabled={generating || selectedTemplates.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-8 py-3 rounded-lg font-medium transition-colors flex items-center"
            >
              {generating ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  Generate Thumbnails
                </>
              )}
            </button>
          </div>

          {/* Progress Bar */}
          {(generating || progress > 0) && (
            <div className="mt-6">
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
            <div className="mt-4 bg-red-500/20 border border-red-500 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Generated Thumbnails */}
        {Array.isArray(thumbnails) && thumbnails.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">
              Generated Thumbnails ({thumbnails.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {thumbnails.map((thumbnail) => (
                <div
                  key={thumbnail.id}
                  className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedThumbnail === thumbnail.id
                    ? 'border-blue-500'
                    : 'border-gray-600 hover:border-gray-500'
                    }`}
                  onClick={() => selectThumbnail(thumbnail.id)}
                >
                  <img
                    src={thumbnail.thumbnail_image}
                    alt={`Thumbnail ${thumbnail.template}`}
                    className="w-full h-48 object-cover"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="text-center">
                      {selectedThumbnail === thumbnail.id ? (
                        <CheckIcon className="w-12 h-12 text-green-500 mx-auto mb-2" />
                      ) : (
                        <div className="bg-white/20 rounded-full p-3 mb-2">
                          <PhotoIcon className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <p className="text-white text-sm font-medium capitalize">
                        {thumbnail.template} Template
                      </p>
                    </div>
                  </div>

                  {/* Template Badge */}
                  <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded">
                    <p className="text-white text-xs capitalize">{thumbnail.template}</p>
                  </div>

                  {/* Selected Badge */}
                  {selectedThumbnail === thumbnail.id && (
                    <div className="absolute top-2 left-2 bg-blue-600 px-2 py-1 rounded">
                      <p className="text-white text-xs">Selected</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-gray-400">
                Click on any thumbnail to select it as your video thumbnail
              </p>
              {selectedThumbnail && (
                <button
                  onClick={() => downloadThumbnail(
                    thumbnails.find(t => t.id === selectedThumbnail)?.thumbnail_image,
                    `thumbnail-${video?.title || 'video'}.jpg`
                  )}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  Download Selected
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIThumbnailGenerator;
