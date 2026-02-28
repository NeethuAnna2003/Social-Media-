import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PhotoIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckIcon,
  SwatchIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const ThumbnailGenerator = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();

  const [video, setVideo] = useState(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('clean');
  const [error, setError] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [previewMode, setPreviewMode] = useState('grid');

  const templates = [
    { id: 'clean', name: 'Clean Title', description: 'Simple text overlay' },
    { id: 'face', name: 'Face-Focused', description: 'Emphasizes faces' },
    { id: 'gradient', name: 'Gradient', description: 'Modern gradient background' },
    { id: 'creator', name: 'Creator Style', description: 'Professional layout' },
  ];

  useEffect(() => {
    fetchVideoData();
    fetchThumbnails();
  }, [videoId]);

  const fetchVideoData = async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}/`);
      if (!response.ok) throw new Error('Failed to fetch video');
      const data = await response.json();
      setVideo(data);
      setSelectedThumbnail(data.thumbnail);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchThumbnails = async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}/thumbnails/`);
      if (!response.ok) throw new Error('Failed to fetch thumbnails');
      const data = await response.json();
      setThumbnails(data.thumbnails || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const generateThumbnails = async (templateList = null, regenerate = false) => {
    setGenerating(true);
    setError(null);

    try {
      const templatesToGenerate = templateList || [selectedTemplate];

      const response = await fetch(`/api/videos/${videoId}/thumbnails/generate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templates: templatesToGenerate,
          regenerate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate thumbnails');
      }

      if (data.task_id) {
        monitorTask(data.task_id);
      } else {
        fetchThumbnails();
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const monitorTask = async (taskId) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/videos/tasks/${taskId}/status/`);
        const data = await response.json();

        setTaskStatus(data);

        if (data.ready) {
          if (data.successful) {
            fetchThumbnails();
          } else {
            setError(data.error || 'Task failed');
          }
        } else {
          setTimeout(checkStatus, 2000);
        }
      } catch (err) {
        setError(err.message);
      }
    };

    checkStatus();
  };

  const selectThumbnail = async (thumbnailId) => {
    try {
      const response = await fetch(`/api/videos/${videoId}/thumbnails/select/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thumbnail_id: thumbnailId })
      });

      if (!response.ok) throw new Error('Failed to select thumbnail');

      const data = await response.json();
      setSelectedThumbnail(thumbnailId);

      // Update local state
      setThumbnails(prev => prev.map(thumb => ({
        ...thumb,
        is_selected: thumb.id === thumbnailId
      })));

    } catch (err) {
      setError(err.message);
    }
  };

  const downloadThumbnail = async (thumbnailId, templateName) => {
    try {
      const thumbnail = thumbnails.find(t => t.id === thumbnailId);
      if (!thumbnail || !thumbnail.image) return;

      // Create download link
      const link = document.createElement('a');
      link.href = thumbnail.image;
      link.download = `thumbnail_${templateName}_${videoId}.jpg`;
      link.click();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading video data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{video?.title}</h1>
              <p className="text-gray-400">Generate & Select Thumbnail</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewMode(previewMode === 'grid' ? 'list' : 'grid')}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2"
              >
                {previewMode === 'grid' ? <EyeIcon className="w-4 h-4" /> : <SwatchIcon className="w-4 h-4" />}
                {previewMode === 'grid' ? 'List View' : 'Grid View'}
              </button>
              <button
                onClick={() => navigate(`/videos/${videoId}`)}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg"
              >
                Back to Video
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Video Preview */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="aspect-video bg-black rounded-lg mb-4 flex items-center justify-center">
            {video?.video_file && (
              <video
                className="w-full h-full rounded-lg"
                controls
              >
                <source src={video.video_file} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            )}
          </div>

          {/* Current Selected Thumbnail */}
          {selectedThumbnail && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-2">Current Thumbnail</h3>
              <div className="flex items-center gap-4">
                <img
                  src={thumbnails.find(t => t.id === selectedThumbnail)?.image}
                  alt="Current thumbnail"
                  className="w-24 h-16 object-cover rounded"
                />
                <div>
                  <p className="text-sm text-gray-300">
                    Template: {thumbnails.find(t => t.id === selectedThumbnail)?.template}
                  </p>
                  <p className="text-xs text-gray-400">
                    Click on any thumbnail below to change
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Generation Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Generate Thumbnails</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {templates.map(template => (
              <div key={template.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{template.name}</h4>
                  <input
                    type="checkbox"
                    checked={selectedTemplate === template.id}
                    onChange={() => setSelectedTemplate(template.id)}
                    className="rounded"
                  />
                </div>
                <p className="text-sm text-gray-400">{template.description}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => generateThumbnails([selectedTemplate], thumbnails.length > 0)}
              disabled={generating}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-2 rounded-lg flex items-center gap-2"
            >
              {generating ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <SwatchIcon className="w-4 h-4" />
              )}
              {thumbnails.length > 0 ? 'Regenerate' : 'Generate'} {templates.find(t => t.id === selectedTemplate)?.name}
            </button>

            <button
              onClick={() => generateThumbnails(templates.map(t => t.id), thumbnails.length > 0)}
              disabled={generating}
              className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 px-6 py-2 rounded-lg flex items-center gap-2"
            >
              {generating ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <SwatchIcon className="w-4 h-4" />
              )}
              Generate All Templates
            </button>
          </div>
        </div>

        {/* Status */}
        {taskStatus && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4">
              <ArrowPathIcon className={`w-5 h-5 ${taskStatus.ready ? '' : 'animate-spin'}`} />
              <div>
                <p className="font-medium">Processing Status</p>
                <p className="text-sm text-gray-400">
                  {taskStatus.ready ?
                    (taskStatus.successful ? 'Completed successfully' : 'Failed') :
                    'Processing in background...'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Thumbnails Grid */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            Generated Thumbnails ({thumbnails.length})
          </h3>

          {thumbnails.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-700 rounded-lg p-8">
                <PhotoIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No thumbnails yet</h3>
                <p className="text-gray-400 mb-4">
                  Generate AI thumbnails to get started
                </p>
                <button
                  onClick={() => generateThumbnails()}
                  disabled={generating}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-2 rounded-lg"
                >
                  Generate Thumbnails with AI
                </button>
              </div>
            </div>
          ) : (
            <div className={previewMode === 'grid' ?
              "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" :
              "space-y-4"
            }>
              {Array.isArray(thumbnails) && thumbnails.map((thumbnail) => (
                <div
                  key={thumbnail.id}
                  className={`bg-gray-700 rounded-lg overflow-hidden border-2 ${thumbnail.is_selected ? 'border-blue-500' : 'border-transparent'
                    } hover:border-gray-600 transition-colors`}
                >
                  <div className="relative aspect-video">
                    <img
                      src={thumbnail.image}
                      alt={`${thumbnail.template} thumbnail`}
                      className="w-full h-full object-cover"
                    />

                    {/* Overlay Info */}
                    <div className="absolute top-2 left-2 bg-black/50 rounded px-2 py-1 text-xs">
                      {thumbnail.template}
                    </div>

                    <div className="absolute top-2 right-2">
                      {thumbnail.is_selected && (
                        <div className="bg-blue-500 rounded-full p-1">
                          <CheckIcon className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="absolute bottom-2 left-2 bg-black/50 rounded px-2 py-1 text-xs flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" />
                      {Math.floor(thumbnail.frame_timestamp)}s
                    </div>

                    {/* Quality Score */}
                    {thumbnail.quality_score && (
                      <div className="absolute bottom-2 right-2 bg-black/50 rounded px-2 py-1 text-xs">
                        {Math.round(thumbnail.quality_score * 100)}%
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">{thumbnail.template} Template</h4>
                      <div className="flex items-center gap-2">
                        {thumbnail.has_face && (
                          <span className="text-xs bg-green-600 px-2 py-1 rounded">Face</span>
                        )}
                        {thumbnail.emotion_detected && (
                          <span className="text-xs bg-blue-600 px-2 py-1 rounded">
                            {thumbnail.emotion_detected}
                          </span>
                        )}
                      </div>
                    </div>

                    {thumbnail.overlay_text && (
                      <p className="text-sm text-gray-400 mb-3">
                        "{thumbnail.overlay_text}"
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => selectThumbnail(thumbnail.id)}
                        disabled={thumbnail.is_selected}
                        className={`flex-1 px-3 py-1 rounded text-sm ${thumbnail.is_selected
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                      >
                        {thumbnail.is_selected ? 'Selected' : 'Select'}
                      </button>

                      <button
                        onClick={() => downloadThumbnail(thumbnail.id, thumbnail.template)}
                        className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-sm"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
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

export default ThumbnailGenerator;
