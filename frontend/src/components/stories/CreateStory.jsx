import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/axios';
import { XMarkIcon } from '@heroicons/react/24/outline';

const FILTERS = [
    { name: 'Normal', css: 'none' },
    { name: 'Warm', css: 'sepia(0.3) saturate(1.4) contrast(1.1)' },
    { name: 'Cool', css: 'hue-rotate(30deg) saturate(1.1) brightness(1.1)' },
    { name: 'Vintage', css: 'sepia(0.5) contrast(1.2) brightness(0.9) saturate(0.8)' },
    { name: 'Dramatic', css: 'grayscale(1) contrast(1.4) brightness(1.2)' },
];

const CreateStory = ({ onClose, onSuccess, initialFile, initialText, newsUrl }) => {
    // Core State
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [mediaType, setMediaType] = useState('image');
    const [mounted, setMounted] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Studio State
    const [activeTool, setActiveTool] = useState(null); // 'filters', 'adjust', 'text', 'crop'
    const [fitMode, setFitMode] = useState('contain'); // 'contain' | 'cover'
    const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
    const [adjustments, setAdjustments] = useState({ brightness: 100, contrast: 100, saturation: 100 });
    const [textLayers, setTextLayers] = useState([]);
    const [caption, setCaption] = useState('');
    const [linkUrl, setLinkUrl] = useState(newsUrl || '');

    // Interaction State
    const [dragId, setDragId] = useState(null);
    const canvasRef = useRef(null); // For the UI display
    const imageRef = useRef(null); // Reference to the actual image element

    useEffect(() => {
        setMounted(true);
        // Auto-add text if provided (e.g. news headline)
        if (initialText) {
            const newText = {
                id: Date.now(),
                content: initialText,
                x: 50, y: 80, // Bottom-ish
                color: '#ffffff',
                fontSize: 28
            };
            setTextLayers([newText]);
        }
    }, [initialText]);

    useEffect(() => {
        if (initialFile) {
            handleFileSelection(initialFile);
        }
    }, [initialFile]);

    useEffect(() => {
        if (newsUrl) {
            setLinkUrl(newsUrl);
        }
    }, [newsUrl]);

    const handleFileSelection = (selected) => {
        if (selected) {
            setFile(selected);
            setMediaType(selected.type.startsWith('video') ? 'video' : 'image');
            setPreview(URL.createObjectURL(selected));
        }
    };

    // --- Text Interaction ---
    const handleAddText = () => {
        const newText = {
            id: Date.now(),
            content: 'Double click to edit',
            x: 50, y: 50, // Percent
            color: '#ffffff',
            fontSize: 24
        };
        setTextLayers([...textLayers, newText]);
        setActiveTool(null);
    };

    const handleTextDragStart = (id, e) => {
        e.stopPropagation();
        setDragId(id);
    };

    const handleCanvasMouseMove = (e) => {
        if (dragId && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            setTextLayers(layers => layers.map(l =>
                l.id === dragId ? { ...l, x, y } : l
            ));
        }
    };

    const handleCanvasMouseUp = () => {
        setDragId(null);
    };



    // --- Image Processing (The 'Engine') ---
    const processImageForUpload = useCallback(async () => {
        if (!imageRef.current || mediaType === 'video') return file; // Return original if video (complex to process in browser)

        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = imageRef.current;

            // Set natural dimensions
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            // Apply Filters
            // Note: ctx.filter support is good in modern browsers (Chrome/FF/Edge)
            const brightness = `brightness(${adjustments.brightness}%)`;
            const contrast = `contrast(${adjustments.contrast}%)`;
            const saturate = `saturate(${adjustments.saturation}%)`;
            const preset = selectedFilter.css !== 'none' ? selectedFilter.css : '';

            ctx.filter = `${brightness} ${contrast} ${saturate} ${preset}`;

            // Draw Image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none'; // Reset for text

            // Draw Text Layers
            textLayers.forEach(layer => {
                const x = (layer.x / 100) * canvas.width;
                const y = (layer.y / 100) * canvas.height;
                const fontSize = (layer.fontSize / 1000) * canvas.width * 2; // Approximate scaling

                ctx.font = `bold ${Math.max(20, fontSize)}px sans-serif`;
                ctx.fillStyle = layer.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                // Multiline support for long headlines
                const words = layer.content.split(' ');
                let line = '';
                const lineHeight = fontSize * 1.2;
                let currentY = y;

                // Simple wrapping logic can be added here if needed, 
                // for now just draw single line to avoid complexity
                ctx.fillText(layer.content, x, y);
            });

            // Export to Blob
            canvas.toBlob((blob) => {
                resolve(blob);
            }, file.type, 0.95);
        });
    }, [file, mediaType, adjustments, selectedFilter, textLayers]);

    const handleSubmit = async () => {
        if (!file) return;
        setUploading(true);

        try {
            // Process the image if it's an image
            const fileToUpload = await processImageForUpload();

            const formData = new FormData();
            formData.append('media', fileToUpload, file.name); // Use refined file
            if (caption) formData.append('caption', caption);

            if (linkUrl) {
                console.log('Adding link_url to story:', linkUrl);
                formData.append('link_url', linkUrl);
            }

            await api.post('/stories/create/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onSuccess();
        } catch (err) {
            console.error("Failed to upload story", err);
            alert("Failed to upload story");
        } finally {
            setUploading(false);
        }
    };

    if (!mounted) return null;

    // --- Sub-Components ---

    const ToolIcon = ({ id, label, icon, active, onClick }) => (
        <button
            onClick={onClick}
            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 group relative ${active ? 'bg-indigo-600 text-white shadow-md scale-105' : 'bg-gray-100 text-gray-900 hover:bg-gray-200 hover:text-indigo-600 border border-gray-200 shadow-sm'
                }`}
            title={label}
        >
            {icon}
            <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {label}
            </span>
        </button>
    );

    const ControlPanel = () => {
        if (!activeTool) return null;
        return (
            <div className="absolute top-4 left-20 bottom-24 w-64 bg-white/95 backdrop-blur-xl border border-gray-100 shadow-2xl rounded-2xl p-4 overflow-y-auto animate-in slide-in-from-left-4 duration-300 z-30 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{activeTool}</h3>
                    <button onClick={() => setActiveTool(null)} className="text-gray-400 hover:text-gray-900">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {activeTool === 'filters' && (
                    <div className="grid grid-cols-2 gap-3">
                        {FILTERS.map(filter => (
                            <button
                                key={filter.name}
                                onClick={() => setSelectedFilter(filter)}
                                className={`relative aspect-[4/5] rounded-lg overflow-hidden border-2 transition-all group ${selectedFilter.name === filter.name ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-transparent hover:border-gray-200'}`}
                            >
                                <div
                                    className="w-full h-full bg-gray-200"
                                    style={{
                                        backgroundImage: `url(${preview})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        filter: filter.css
                                    }}
                                />
                                <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] font-bold py-1 text-center backdrop-blur-sm group-hover:bg-indigo-600/80 transition-colors">{filter.name}</span>
                            </button>
                        ))}
                    </div>
                )}
                {activeTool === 'adjust' && (
                    <div className="space-y-6">
                        {[
                            { label: 'Brightness', key: 'brightness', min: 50, max: 150 },
                            { label: 'Contrast', key: 'contrast', min: 50, max: 150 },
                            { label: 'Saturation', key: 'saturation', min: 0, max: 200 }
                        ].map(adj => (
                            <div key={adj.key}>
                                <div className="flex justify-between text-xs font-medium text-gray-700 mb-2">
                                    <span>{adj.label}</span>
                                    <span>{adjustments[adj.key]}%</span>
                                </div>
                                <input
                                    type="range" min={adj.min} max={adj.max}
                                    value={adjustments[adj.key]}
                                    onChange={(e) => setAdjustments(prev => ({ ...prev, [adj.key]: parseInt(e.target.value) }))}
                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>
                        ))}
                    </div>
                )}
                {activeTool === 'text' && (
                    <div className="space-y-4">
                        <button
                            onClick={handleAddText}
                            className="w-full py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 border border-indigo-100"
                        >
                            <span className="text-lg">Aa</span> Add Text Layer
                        </button>
                        <p className="text-xs text-gray-400 text-center">
                            Drag text to move.<br />Double click to edit.
                        </p>
                    </div>
                )}
            </div>
        );
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-[#F9FAFB] flex flex-col h-screen w-screen text-gray-900 font-sans selection:bg-indigo-100">

            {/* 1. Top Bar */}
            <div className="h-16 flex items-center justify-between px-6 bg-white border-b border-gray-100 z-40 relative shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <span className="text-sm font-bold tracking-wide text-gray-900 uppercase">Story Studio</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Toggle Fit/Fill */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setFitMode('contain')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${fitMode === 'contain' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Fit
                        </button>
                        <button
                            onClick={() => setFitMode('cover')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${fitMode === 'cover' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Fill
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* 2. Left Toolbar */}
                <div className="w-20 flex-none flex flex-col items-center py-6 gap-4 bg-white border-r border-gray-100 z-40 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                    <ToolIcon
                        id="filters" label="Filters" active={activeTool === 'filters'} onClick={() => setActiveTool(activeTool === 'filters' ? null : 'filters')}
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
                    />
                    <ToolIcon
                        id="adjust" label="Adjust" active={activeTool === 'adjust'} onClick={() => setActiveTool(activeTool === 'adjust' ? null : 'adjust')}
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>}
                    />
                    <ToolIcon
                        id="text" label="Text" active={activeTool === 'text'} onClick={() => setActiveTool(activeTool === 'text' ? null : 'text')}
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16m-7 6h7" /></svg>}
                    />

                </div>

                {/* Floating Control Panel */}
                <ControlPanel />

                {/* 3. Center Canvas Area */}
                <div className="flex-1 bg-gray-50/50 flex items-center justify-center p-8 relative overflow-hidden" onClick={() => setActiveTool(null)}>
                    {/* The Canvas UI */}
                    <div
                        ref={canvasRef}
                        className="relative w-full max-w-sm h-full max-h-[85vh] aspect-[9/16] bg-white rounded-3xl shadow-2xl overflow-hidden ring-1 ring-gray-900/5 transition-all duration-300 select-none"
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                    >
                        {preview ? (
                            <div className="w-full h-full relative overflow-hidden">
                                {mediaType === 'video' ? (
                                    <video
                                        ref={imageRef} // Capture ref for video processing if generic
                                        src={preview}
                                        className={`w-full h-full transition-all duration-300 ${fitMode === 'contain' ? 'object-contain' : 'object-cover'}`}
                                        style={{
                                            filter: `${selectedFilter.css} brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`
                                        }}
                                        autoPlay loop muted playsInline
                                    />
                                ) : (
                                    <img
                                        ref={imageRef}
                                        src={preview}
                                        alt="Preview"
                                        className={`w-full h-full transition-all duration-300 ${fitMode === 'contain' ? 'object-contain' : 'object-cover'}`}
                                        style={{
                                            filter: `${selectedFilter.css} brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`
                                        }}
                                        draggable={false}
                                    />
                                )}

                                {/* Draggable Text Overlay */}
                                {textLayers.map(layer => (
                                    <div
                                        key={layer.id}
                                        onMouseDown={(e) => handleTextDragStart(layer.id, e)}
                                        className={`absolute font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] cursor-move select-none hover:scale-105 transition-transform ${dragId === layer.id ? 'opacity-80 scale-105' : ''}`}
                                        style={{
                                            top: `${layer.y}%`,
                                            left: `${layer.x}%`,
                                            transform: 'translate(-50%, -50%)',
                                            color: layer.color,
                                            fontSize: '1.5rem',
                                            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                        }}
                                    >
                                        {layer.content}
                                    </div>
                                ))}


                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                <span>No Media</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 4. Bottom Action Bar */}
            <div className="h-20 bg-white border-t border-gray-100 px-8 flex items-center justify-between z-50">
                <div className="flex-1 max-w-lg">
                    <input
                        type="text"
                        placeholder="Add a caption..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="w-full bg-gray-50 hover:bg-white focus:bg-white text-gray-900 placeholder-gray-400 px-5 py-3 rounded-full border border-transparent hover:border-gray-200 focus:border-indigo-500 outline-none transition-all font-medium"
                    />
                </div>

                <div className="flex items-center gap-4 ml-6">
                    <button
                        onClick={() => setFile(null)}
                        className="px-6 py-3 rounded-full text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        Discard
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={uploading}
                        className="px-8 py-3 rounded-full bg-black text-white font-bold text-sm hover:opacity-80 transition-opacity shadow-lg flex items-center gap-2 disabled:opacity-50"
                    >
                        {uploading ? 'Posting...' : 'Share Story'}
                    </button>
                </div>
            </div>

        </div>,
        document.body
    );
};

export default CreateStory;
