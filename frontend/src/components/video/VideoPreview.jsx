import { useEffect, useState } from 'react';
import CaptionOverlay from './CaptionOverlay';

const VideoPreview = ({ video, videoFile, captions = [] }) => {
    const [videoUrl, setVideoUrl] = useState('');

    useEffect(() => {
        if (videoFile) {
            const url = URL.createObjectURL(videoFile);
            setVideoUrl(url);
            return () => URL.revokeObjectURL(url);
        } else if (video?.video_file) {
            setVideoUrl(video.video_file);
        }
    }, [videoFile, video]);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const [currentCaption, setCurrentCaption] = useState(null);

    // Update caption on time update
    const handleTimeUpdate = (e) => {
        const time = e.target.currentTime;
        if (captions && captions.length > 0) {
            const match = captions.find(c => time >= c.start_time && time <= c.end_time);
            setCurrentCaption(match);
        } else {
            setCurrentCaption(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Video Player */}
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
                {videoUrl && (
                    <video
                        src={videoUrl}
                        controls
                        className="w-full h-full object-contain"
                        onTimeUpdate={handleTimeUpdate}
                    />
                )}

                {/* YouTube-style Caption Overlay */}
                <CaptionOverlay text={currentCaption?.text} />
            </div>

            {/* Video Info */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-100">
                <h3 className="text-xl font-black text-gray-900 mb-4">📹 Video Details</h3>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-600">Title:</span>
                        <span className="text-sm font-bold text-gray-900">{video?.title || 'Untitled'}</span>
                    </div>

                    {video?.duration > 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-600">Duration:</span>
                            <span className="text-sm font-bold text-gray-900">{formatDuration(video.duration)}</span>
                        </div>
                    )}

                    {video?.file_size > 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-600">File Size:</span>
                            <span className="text-sm font-bold text-gray-900">{formatFileSize(video.file_size)}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-600">Status:</span>
                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${video?.status === 'ready' ? 'bg-green-100 text-green-700' :
                            video?.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                video?.status === 'failed' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                            }`}>
                            {video?.status?.toUpperCase() || 'UPLOADING'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Processing Progress */}
            {video?.status === 'processing' && (
                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="font-bold text-blue-900">Processing your video...</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${video.processing_progress || 0}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoPreview;
