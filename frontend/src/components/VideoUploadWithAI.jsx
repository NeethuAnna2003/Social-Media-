import React, { useState, useRef } from 'react';
import {
  ArrowUpTrayIcon,
  VideoCameraIcon,
  PlayIcon,
  MicrophoneIcon,
  GlobeAltIcon,
  SparklesIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import api from '../api/axios';

const VideoUploadWithAI = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [error, setError] = useState(null);
  const [showAIOptions, setShowAIOptions] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setError(null);
      setShowAIOptions(true);
    } else {
      setError('Please select a valid video file');
    }
  };

  const handleUpload = async () => {
    if (!videoFile) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('video_file', videoFile);
    formData.append('title', videoFile.name.replace(/\.[^/.]+$/, ""));

    try {
      const response = await api.post('/videos/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(progress);
        },
      });

      setUploadedVideo(response.data);
      setShowAIOptions(true);
      console.log('Video uploaded successfully:', response.data);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  const handleAICaptionGeneration = () => {
    if (uploadedVideo) {
      // Navigate to caption generation page
      window.location.href = `/videos/${uploadedVideo.id}/captions/ai-generate`;
    }
  };

  const handleAIThumbnailGeneration = () => {
    if (uploadedVideo) {
      // Navigate to thumbnail generation page
      window.location.href = `/videos/${uploadedVideo.id}/thumbnails/ai-generate`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          AI-Powered Video Processing
        </h1>

        {/* Upload Section */}
        <div className="bg-gray-800 rounded-xl p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <ArrowUpTrayIcon className="w-6 h-6 mr-2" />
            Upload Your Video
          </h2>

          <div
            className="border-2 border-dashed border-gray-600 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {videoFile ? (
              <div className="space-y-4">
                <VideoCameraIcon className="w-16 h-16 mx-auto text-blue-500" />
                <p className="text-lg font-medium">{videoFile.name}</p>
                <p className="text-gray-400">
                  Size: {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <VideoCameraIcon className="w-16 h-16 mx-auto text-gray-500" />
                <p className="text-lg font-medium">Click to select video file</p>
                <p className="text-gray-400">
                  Supports MP4, AVI, MOV, WebM and other video formats
                </p>
              </div>
            )}
          </div>

          {videoFile && (
            <div className="mt-6">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 py-3 rounded-lg font-medium transition-colors"
              >
                {uploading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Uploading... {uploadProgress}%
                  </span>
                ) : (
                  'Upload Video'
                )}
              </button>

              {uploading && (
                <div className="mt-4">
                  <div className="bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-500/20 border border-red-500 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* AI Options Section */}
        {uploadedVideo && (
          <div className="bg-gray-800 rounded-xl p-8">
            <h2 className="text-xl font-semibold mb-6">
              AI Processing Options
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* AI Caption Generator */}
              <div
                className="bg-gray-700 rounded-lg p-6 hover:bg-gray-650 transition-colors cursor-pointer"
                onClick={handleAICaptionGeneration}
              >
                <div className="flex items-center mb-4">
                  <MicrophoneIcon className="w-8 h-8 text-blue-500 mr-3" />
                  <h3 className="text-lg font-semibold">AI Caption Generator</h3>
                </div>
                <p className="text-gray-300 mb-4">
                  Automatically generate accurate captions for your video in multiple languages.
                  Detect spoken language and translate to any supported language.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                    Auto Language Detection
                  </span>
                  <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                    Multiple Languages
                  </span>
                  <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm">
                    Time-Synced
                  </span>
                </div>
              </div>

              {/* AI Thumbnail Generator */}
              <div
                className="bg-gray-700 rounded-lg p-6 hover:bg-gray-650 transition-colors cursor-pointer"
                onClick={handleAIThumbnailGeneration}
              >
                <div className="flex items-center mb-4">
                  <PhotoIcon className="w-8 h-8 text-green-500 mr-3" />
                  <h3 className="text-lg font-semibold">AI Thumbnail Generator</h3>
                </div>
                <p className="text-gray-300 mb-4">
                  Generate professional thumbnails using AI. Analyze video frames and create
                  eye-catching thumbnails with multiple design options.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-sm">
                    Frame Analysis
                  </span>
                  <span className="bg-pink-500/20 text-pink-400 px-3 py-1 rounded-full text-sm">
                    Multiple Templates
                  </span>
                  <span className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-sm">
                    AI-Powered
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500 rounded-lg">
              <p className="text-blue-400 text-sm">
                <strong>Video uploaded successfully!</strong> Choose an AI processing option above to continue.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploadWithAI;
