import { useState } from 'react';
import api from '../../api/axios';

const CaptionEditor = ({ videoId, captions = [], onCaptionsUpdate }) => {
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('all');

    // Ensure captions is always an array
    const captionsList = Array.isArray(captions) ? captions : [];

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(1);
        return `${mins}:${secs.padStart(4, '0')}`;
    };

    const handleEdit = (caption) => {
        setEditingId(caption.id);
        setEditText(caption.text);
    };

    const handleSave = async (captionId) => {
        try {
            await api.patch(`/videos/captions/${captionId}/`, {
                text: editText
            });

            // Update local state
            const updated = captionsList.map(cap =>
                cap.id === captionId ? { ...cap, text: editText } : cap
            );
            onCaptionsUpdate(updated);

            setEditingId(null);
            setEditText('');
        } catch (error) {
            console.error('Failed to update caption:', error);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditText('');
    };

    const languages = [...new Set(captionsList.map(cap => cap.language))];
    const filteredCaptions = selectedLanguage === 'all'
        ? captionsList
        : captionsList.filter(cap => cap.language === selectedLanguage);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-gray-900">✏️ Edit Captions</h3>

                {/* Language Filter */}
                {languages.length > 1 && (
                    <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl font-bold text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    >
                        <option value="all">All Languages</option>
                        {languages.map(lang => (
                            <option key={lang} value={lang}>
                                {lang.toUpperCase()}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Captions List */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {filteredCaptions.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl">
                        <span className="text-6xl mb-4 block">📝</span>
                        <p className="text-gray-500 font-semibold">No captions yet</p>
                        <p className="text-sm text-gray-400 mt-2">Generate captions with AI or add them manually</p>
                    </div>
                ) : (
                    filteredCaptions.map((caption, index) => (
                        <div
                            key={caption.id}
                            className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 border-2 border-gray-100 hover:border-purple-200 transition-all"
                        >
                            <div className="flex items-start gap-4">
                                {/* Timeline */}
                                <div className="flex-shrink-0">
                                    <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-xs font-black">
                                        {formatTime(caption.start_time)}
                                    </div>
                                    <div className="text-center text-gray-400 text-xs my-1">↓</div>
                                    <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-xs font-black">
                                        {formatTime(caption.end_time)}
                                    </div>
                                </div>

                                {/* Caption Text */}
                                <div className="flex-1">
                                    {editingId === caption.id ? (
                                        <div className="space-y-2">
                                            <textarea
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl focus:outline-none focus:border-purple-500 font-medium resize-none"
                                                rows="3"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSave(caption.id)}
                                                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-bold text-sm hover:shadow-lg transition-all"
                                                >
                                                    ✓ Save
                                                </button>
                                                <button
                                                    onClick={handleCancel}
                                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-300 transition-all"
                                                >
                                                    ✕ Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-gray-900 font-medium leading-relaxed mb-2">
                                                {caption.text}
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-gray-400 uppercase">
                                                    {caption.language}
                                                </span>
                                                {caption.is_translated && (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">
                                                        Translated
                                                    </span>
                                                )}
                                                {caption.confidence && (
                                                    <span className="text-xs text-gray-400">
                                                        {Math.round(caption.confidence * 100)}% confident
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(caption)}
                                                    className="ml-auto text-xs text-purple-600 hover:text-purple-700 font-bold"
                                                >
                                                    ✏️ Edit
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Stats */}
            {filteredCaptions.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-4 border border-purple-100">
                    <div className="flex items-center justify-around text-center">
                        <div>
                            <div className="text-2xl font-black text-purple-600">{filteredCaptions.length}</div>
                            <div className="text-xs font-bold text-gray-600">Captions</div>
                        </div>
                        <div className="w-px h-8 bg-gray-300" />
                        <div>
                            <div className="text-2xl font-black text-blue-600">{languages.length}</div>
                            <div className="text-xs font-bold text-gray-600">Languages</div>
                        </div>
                        <div className="w-px h-8 bg-gray-300" />
                        <div>
                            <div className="text-2xl font-black text-green-600">
                                {Math.round(filteredCaptions.reduce((sum, cap) => sum + (cap.confidence || 0), 0) / filteredCaptions.length * 100)}%
                            </div>
                            <div className="text-xs font-bold text-gray-600">Avg Confidence</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CaptionEditor;
