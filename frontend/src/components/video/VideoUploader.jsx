import { useState } from 'react';

const VideoUploader = ({ onVideoSelect, progress, processing }) => {
    const [isDragActive, setIsDragActive] = useState(false);

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            // Validate file type
            const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
            if (validTypes.includes(file.type)) {
                onVideoSelect(file);
            } else {
                alert('Please upload a valid video file (MP4, MOV, AVI, MKV, WebM)');
            }
        }
    };

    const handleFileInput = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onVideoSelect(files[0]);
        }
    };

    return (
        <div className="space-y-6">
            <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => !processing && document.getElementById('video-file-input').click()}
                className={`relative border-4 border-dashed rounded-3xl p-12 text-center transition-all duration-300 cursor-pointer ${isDragActive
                        ? 'border-purple-500 bg-purple-50/50 scale-105'
                        : processing
                            ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                            : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/30'
                    }`}
            >
                <input
                    id="video-file-input"
                    type="file"
                    accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,.mp4,.mov,.avi,.mkv,.webm"
                    onChange={handleFileInput}
                    disabled={processing}
                    className="hidden"
                />

                <div className="space-y-4">
                    {/* Icon */}
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl blur-xl opacity-50" />
                        <div className="relative w-24 h-24 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                    </div>

                    {/* Text */}
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">
                            {isDragActive ? '📹 Drop your video here!' : '📤 Upload Your Video'}
                        </h3>
                        <p className="text-gray-600 font-medium">
                            {processing
                                ? 'Uploading...'
                                : 'Drag & drop or click to browse'}
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            Supports: MP4, MOV, AVI, MKV, WebM (Max 2GB)
                        </p>
                    </div>

                    {/* Progress Bar */}
                    {processing && progress > 0 && (
                        <div className="max-w-md mx-auto">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-purple-600">Uploading...</span>
                                <span className="text-sm font-bold text-purple-600">{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-purple-50/50 rounded-2xl p-4 text-center border border-purple-100">
                    <div className="text-3xl mb-2">⚡</div>
                    <div className="text-xs font-bold text-gray-700">Fast Upload</div>
                </div>
                <div className="bg-blue-50/50 rounded-2xl p-4 text-center border border-blue-100">
                    <div className="text-3xl mb-2">🤖</div>
                    <div className="text-xs font-bold text-gray-700">AI Powered</div>
                </div>
                <div className="bg-green-50/50 rounded-2xl p-4 text-center border border-green-100">
                    <div className="text-3xl mb-2">✨</div>
                    <div className="text-xs font-bold text-gray-700">Auto Captions</div>
                </div>
            </div>
        </div>
    );
};

export default VideoUploader;
