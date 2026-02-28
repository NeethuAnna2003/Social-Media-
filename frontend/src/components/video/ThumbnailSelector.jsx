const ThumbnailSelector = ({ thumbnails = [], selected, onSelect }) => {
    // Ensure thumbnails is always an array
    const thumbnailsList = Array.isArray(thumbnails) ? thumbnails : [];

    const templateIcons = {
        clean: '✨',
        face: '😊',
        gradient: '🎨',
        creator: '🎬'
    };

    const templateNames = {
        clean: 'Clean Overlay',
        face: 'Face Focus',
        gradient: 'Gradient',
        creator: 'Creator Style'
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h3 className="text-2xl font-black text-gray-900 mb-2">🖼️ Choose Your Thumbnail</h3>
                <p className="text-gray-600 font-medium">AI-generated options ranked by quality</p>
            </div>

            {/* Thumbnails Grid */}
            {thumbnails.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                    <span className="text-6xl mb-4 block">🖼️</span>
                    <p className="text-gray-500 font-semibold">No thumbnails yet</p>
                    <p className="text-sm text-gray-400 mt-2">Generate thumbnails with AI</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {thumbnails.map((thumbnail) => (
                        <button
                            key={thumbnail.id}
                            onClick={() => onSelect(thumbnail)}
                            className={`relative group rounded-2xl overflow-hidden transition-all duration-300 ${selected?.id === thumbnail.id
                                ? 'ring-4 ring-purple-500 scale-105 shadow-2xl'
                                : 'hover:scale-105 hover:shadow-xl'
                                }`}
                        >
                            {/* Thumbnail Image */}
                            <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-700 relative">
                                {thumbnail.image ? (
                                    <img
                                        src={thumbnail.image}
                                        alt={`Thumbnail ${thumbnail.id}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white text-4xl">
                                        {templateIcons[thumbnail.template] || '🖼️'}
                                    </div>
                                )}

                                {/* Overlay on hover */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">
                                        {selected?.id === thumbnail.id ? '✓ Selected' : 'Select'}
                                    </span>
                                </div>

                                {/* Selected Badge */}
                                {selected?.id === thumbnail.id && (
                                    <div className="absolute top-3 right-3 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg">
                                        ✓ SELECTED
                                    </div>
                                )}
                            </div>

                            {/* Thumbnail Info */}
                            <div className="bg-white p-3 border-t-2 border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-black text-gray-900">
                                        {templateIcons[thumbnail.template]} {templateNames[thumbnail.template]}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-yellow-500">⭐</span>
                                        <span className="text-xs font-bold text-gray-600">
                                            {(thumbnail.quality_score * 100).toFixed(0)}
                                        </span>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-1">
                                    {thumbnail.has_face && (
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                                            😊 Face
                                        </span>
                                    )}
                                    {thumbnail.emotion_detected && (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                                            {thumbnail.emotion_detected}
                                        </span>
                                    )}
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                                        {thumbnail.frame_timestamp.toFixed(1)}s
                                    </span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Selected Thumbnail Details */}
            {selected && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-100">
                    <h4 className="font-black text-gray-900 mb-3">Selected Thumbnail Details</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600 font-semibold">Template:</span>
                            <span className="font-bold text-gray-900">
                                {templateIcons[selected.template]} {templateNames[selected.template]}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 font-semibold">Quality Score:</span>
                            <span className="font-bold text-gray-900">
                                {(selected.quality_score * 100).toFixed(0)}/100
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 font-semibold">Frame Time:</span>
                            <span className="font-bold text-gray-900">
                                {selected.frame_timestamp.toFixed(1)}s
                            </span>
                        </div>
                        {selected.overlay_text && (
                            <div className="flex justify-between">
                                <span className="text-gray-600 font-semibold">Suggested Text:</span>
                                <span className="font-bold text-gray-900">
                                    "{selected.overlay_text}"
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Upload Custom Option */}
            <button className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-600 font-bold hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50/30 transition-all">
                📤 Upload Custom Thumbnail
            </button>
        </div>
    );
};

export default ThumbnailSelector;
