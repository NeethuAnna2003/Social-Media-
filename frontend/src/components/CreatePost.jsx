import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/canvasUtils';

const CreatePost = ({ onPostCreated, postToEdit = null, onCancel = null }) => {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]); // Array of { file, preview, type, id }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // Hashtag suggestions
  const [showHashtags, setShowHashtags] = useState(false);
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [suggestedHashtags, setSuggestedHashtags] = useState([]);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await api.get('/analytics/trending-hashtags/');
        if (res.data.hashtags) {
          setSuggestedHashtags(res.data.hashtags);
        }
      } catch (err) {
        console.error("Failed to fetch trending hashtags", err);
      }
    };
    fetchTrending();
  }, []);

  // Image Editor State
  const [editingMediaIndex, setEditingMediaIndex] = useState(null);
  const [tempImageSrc, setTempImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sepia: 0,
    grayscale: 0,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // AI State
  const [aiLoading, setAiLoading] = useState(false);
  const [sentiment, setSentiment] = useState(null);
  const [toxicity, setToxicity] = useState(null);



  const generateAIHashtags = async () => {
    if (!content.trim()) return toast.error("Write something first!");
    setAiLoading(true);
    try {
      const res = await api.post('/ai/generate-hashtags/', { text: content });
      // check current hashtags
      const currentText = content;
      const newTags = res.data.hashtags.filter(t => !currentText.includes(t));

      if (newTags.length === 0) {
        toast('No new hashtags found.');
      } else {
        setContent(prev => prev.trim() + ' ' + newTags.join(' '));
        toast.success("AI Hashtags Added!");
      }
    } catch (err) {
      console.error(err);
      toast.error("AI Service Unavailable");
    } finally {
      setAiLoading(false);
    }
  };

  const generateAICaption = async () => {
    setAiLoading(true);
    try {
      let response;
      const firstImage = mediaFiles.find(m => m.type === 'image' && m.file);

      if (firstImage) {
        const formData = new FormData();
        formData.append('image', firstImage.file);
        formData.append('context', content);
        response = await api.post('/ai/generate-caption/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await api.post('/ai/generate-caption/', { context: content });
      }

      if (response.data.caption) {
        setContent(prev => (prev.trim() ? prev + '\n' + response.data.caption : response.data.caption));
        toast.success("AI Caption Added!");
        // Check analysis
        setTimeout(() => checkAIAnalysis(), 500);
      }
    } catch (err) {
      console.error(err);
      toast.error("AI Caption unavailable. Try uploading an image!");
    } finally {
      setAiLoading(false);
    }
  };

  const checkAIAnalysis = async () => {
    if (!content.trim()) return;
    try {
      // Check Sentiment
      const sentRes = await api.post('/ai/sentiment/', { text: content });
      setSentiment(sentRes.data.sentiment);

      // Check Toxicity
      const toxRes = await api.post('/ai/toxicity/', { text: content });
      setToxicity(toxRes.data);

      if (toxRes.data.is_toxic) {
        toast.error("Your post contains toxic language.");
      }
    } catch (err) {
      console.error("AI Analysis Failed", err);
    }
  };

  // Initialize

  // Initialize
  useEffect(() => {
    if (postToEdit) {
      setContent(postToEdit.content || postToEdit.text || '');
      if (postToEdit.image) {
        setMediaFiles([{ file: null, preview: postToEdit.image, type: 'image', id: 'legacy' }]);
      }
      if (postToEdit.media && Array.isArray(postToEdit.media)) {
        const files = postToEdit.media.map((m, idx) => ({
          file: null,
          preview: m.file,
          type: m.media_type,
          id: m.id || `server-${idx}`
        }));
        setMediaFiles(prev => [...prev, ...files]);
      }
    } else {
      setContent('');
      setMediaFiles([]);
    }
  }, [postToEdit]);

  // Hashtag Logic
  const handleContentChange = (e) => {
    const text = e.target.value;
    setContent(text);
    const words = text.split(/\s+/);
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith('#') && lastWord.length > 1) {
      setHashtagQuery(lastWord.slice(1).toLowerCase());
      setShowHashtags(true);
    } else {
      setShowHashtags(false);
    }
  };

  const addHashtag = (tag) => {
    const words = content.split(/\s+/);
    words.pop();
    const newText = [...words, `#${tag} `].join(' ');
    setContent(newText);
    setShowHashtags(false);
  };

  // File Handling
  const handleFileChange = async (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newMedia = [];

      for (const file of files) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`File ${file.name} is too large (max 50MB)`);
          continue;
        }

        const fileType = file.type.startsWith('video/') ? 'video' : 'image';
        if (fileType === 'video') {
          try {
            const duration = await getVideoDuration(file);
            if (duration > 60) {
              toast.error(`Video ${file.name} exceeds 60s limit.`);
              continue;
            }
          } catch (err) {
            console.error(err);
            continue;
          }
        }

        newMedia.push({
          file,
          preview: URL.createObjectURL(file),
          type: fileType,
          id: Date.now() + Math.random()
        });
      }
      setMediaFiles(prev => [...prev, ...newMedia]);
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getVideoDuration = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => reject("Invalid video file");
      video.src = URL.createObjectURL(file);
    });
  };

  const removeMedia = (index) => {
    setMediaFiles(prev => {
      const newFiles = [...prev];
      const removed = newFiles.splice(index, 1)[0];
      if (removed.file) URL.revokeObjectURL(removed.preview);
      return newFiles;
    });
  };

  // Editor Logic
  const openEditor = (index) => {
    const media = mediaFiles[index];
    if (media.type !== 'image') return;
    setTempImageSrc(media.preview);
    setEditingMediaIndex(index);
    setZoom(1);
    setRotation(0);
    setFilters({ brightness: 100, contrast: 100, saturation: 100, sepia: 0, grayscale: 0 });
    setCrop({ x: 0, y: 0 });
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const saveEditedImage = async () => {
    // Prevent concurrent exports
    if (editingMediaIndex === null || isExporting) return;

    // Validation
    if (!croppedAreaPixels) {
      toast.error('Please select a crop area');
      return;
    }

    if (!tempImageSrc) {
      toast.error('No image loaded');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      // Export with high quality
      const croppedImageBlob = await getCroppedImg(
        tempImageSrc,
        croppedAreaPixels,
        rotation,
        filters,
        0.95 // High quality JPEG
      );

      // Validate exported blob
      if (!croppedImageBlob || croppedImageBlob.size === 0) {
        throw new Error('Export produced empty image');
      }

      // Log export info for debugging
      console.log('Image exported:', {
        size: `${(croppedImageBlob.size / 1024).toFixed(2)} KB`,
        type: croppedImageBlob.type,
        dimensions: `${croppedAreaPixels.width}x${croppedAreaPixels.height}`
      });

      setMediaFiles(prev => {
        const newFiles = [...prev];
        // Revoke old URL if it was a blob
        if (newFiles[editingMediaIndex].file) {
          URL.revokeObjectURL(newFiles[editingMediaIndex].preview);
        }

        newFiles[editingMediaIndex] = {
          ...newFiles[editingMediaIndex],
          file: croppedImageBlob,
          preview: URL.createObjectURL(croppedImageBlob),
          type: 'image'
        };
        return newFiles;
      });

      cancelEdit();
      toast.success(`Image updated! (${(croppedImageBlob.size / 1024).toFixed(0)} KB)`);

    } catch (e) {
      console.error('Image export error:', e);
      setExportError(e.message || 'Failed to process image');
      toast.error(e.message || 'Failed to process image');
    } finally {
      setIsExporting(false);
    }
  };

  const cancelEdit = () => {
    if (isExporting) {
      toast.error('Please wait for export to complete');
      return;
    }
    setEditingMediaIndex(null);
    setTempImageSrc(null);
    setCroppedAreaPixels(null);
    setExportError(null);
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && mediaFiles.length === 0) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('text', content);



      mediaFiles.forEach(media => {
        if (media.file) {
          formData.append('uploaded_media', media.file);
        }
      });

      let response;
      if (postToEdit) {
        response = await api.patch(`/posts/${postToEdit._id || postToEdit.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Post updated!');
      } else {
        response = await api.post('/posts/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Post published!');
      }

      if (onPostCreated) onPostCreated(response.data);

      if (!postToEdit) {
        setContent('');
        setMediaFiles([]);

      }

    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Icons
  const PhotoIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
    </svg>
  );

  const EditIcon = () => (
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );

  const PlusIcon = () => (
    <svg className="w-8 h-8 text-gray-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
    </svg>
  );

  return (
    <>
      <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] shadow-depth-1 hover:shadow-depth-2 border border-white/40 p-6 mb-10 relative transition-all duration-500 group perspective-1000">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="p-0.5 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-400 shadow-sm">
              <img
                src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'User'}`}
                alt="Profile"
                className="w-11 h-11 rounded-full object-cover border-2 border-white"
              />
            </div>
          </div>
          <div className="flex-grow relative">
            <textarea
              value={content}
              onChange={handleContentChange}
              onBlur={() => {
                if (content.length > 10) checkAIAnalysis();
              }}
              placeholder="What's sparking your mind today?"
              className="w-full bg-transparent border-none focus:ring-0 text-lg placeholder-gray-400 text-gray-800 resize-none min-h-[60px] leading-relaxed"
              rows={2}
            />

            {/* AI Tools Bar - Floating Chips */}
            <div className="flex flex-wrap items-center gap-2 mt-3 mb-2 px-1">
              <button
                onClick={generateAICaption}
                disabled={aiLoading}
                className="group flex items-center space-x-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50/50 hover:bg-white hover:shadow-depth-1 px-3 py-1.5 rounded-full transition-all border border-indigo-100/50"
              >
                {aiLoading ? (
                  <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <span className="group-hover:scale-105 transition-transform">✨ Auto-Caption</span>
                )}
              </button>
              <button
                onClick={generateAIHashtags}
                disabled={!content.trim() || aiLoading}
                className="group flex items-center space-x-1.5 text-[11px] font-bold text-purple-600 bg-purple-50/50 hover:bg-white hover:shadow-depth-1 px-3 py-1.5 rounded-full transition-all border border-purple-100/50"
              >
                {aiLoading ? (
                  <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <span className="group-hover:scale-105 transition-transform"># Suggest Tags</span>
                )}
              </button>


              {sentiment && (
                <div className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${sentiment === 'Positive' ? 'bg-green-100/80 text-green-700' :
                  sentiment === 'Negative' ? 'bg-red-100/80 text-red-700' : 'bg-gray-100/80 text-gray-600'
                  }`}>
                  {sentiment}
                </div>
              )}

              {toxicity && toxicity.is_toxic && (
                <div className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-red-500 text-white animate-pulse shadow-md">
                  ⚠️ Toxicity
                </div>
              )}
            </div>

            {/* Hashtag Suggestions */}
            {showHashtags && (
              <div className="absolute top-full left-0 bg-white/90 backdrop-blur-xl border border-white shadow-depth-2 rounded-2xl z-30 w-64 max-h-48 overflow-y-auto mt-2 custom-scrollbar">
                {suggestedHashtags
                  .filter(tag => tag.name.toLowerCase().includes(hashtagQuery))
                  .map((tag, idx) => (
                    <button
                      key={tag.name + idx}
                      onClick={() => addHashtag(tag.name)}
                      className="block w-full text-left px-4 py-2 hover:bg-indigo-50 text-sm text-indigo-600 font-medium transition-colors flex justify-between"
                    >
                      <span className="font-bold">#{tag.name}</span>
                      <span className="text-xs text-indigo-300">{tag.usage_count}</span>
                    </button>
                  ))}
              </div>
            )}

            {/* Media Previews Grid */}
            {mediaFiles.length > 0 && (
              <div className={`mt-4 grid gap-3 overflow-hidden rounded-2xl animate-fade-in ${mediaFiles.length >= 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {mediaFiles.map((media, index) => (
                  <div key={media.id || index} className="relative group aspect-square bg-gray-50 rounded-xl overflow-hidden shadow-inner">
                    {media.type === 'video' ? (
                      <video src={media.preview} className="w-full h-full object-cover" />
                    ) : (
                      <img src={media.preview} alt="preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    )}

                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3">
                      {media.type === 'image' && (
                        <button
                          onClick={() => openEditor(index)}
                          className="p-2 bg-white/90 rounded-full hover:bg-white hover:scale-110 text-gray-900 transition-all shadow-lg"
                          title="Edit Image"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => removeMedia(index)}
                        className="p-2 bg-red-500/90 rounded-full hover:bg-red-600 hover:scale-110 text-white transition-all shadow-lg"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </div>

                    {media.type === 'video' && (
                      <div className="absolute bottom-2 left-2 text-[10px] text-white bg-black/40 px-2 py-0.5 rounded font-bold backdrop-blur-md">
                        VIDEO
                      </div>
                    )}
                  </div>
                ))}

                {/* Add More Tile */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center aspect-square bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group"
                >
                  <PlusIcon />
                </button>
              </div>
            )}


          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100/50">
          <div className="flex space-x-2">
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*"
              className="hidden"
            />
            {!mediaFiles.length && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group flex items-center space-x-2 text-gray-500 hover:text-indigo-600 bg-transparent hover:bg-indigo-50/50 px-4 py-2 rounded-full transition-colors font-medium text-sm"
              >
                <div className="group-hover:scale-110 transition-transform duration-300"><PhotoIcon /></div>
                <span>Media</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-6 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-bold text-sm"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={(!content.trim() && mediaFiles.length === 0) || isSubmitting}
              className={`
                px-6 py-2.5 rounded-full font-bold text-sm text-white transition-all transform hover:-translate-y-0.5
                ${(!content.trim() && mediaFiles.length === 0) || isSubmitting
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50'
                }
            `}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Posting...
                </span>
              ) : 'Post'}
            </button>
          </div>
        </div>
      </div>



      {/* Image Editor Modal - Increased Z-Index */}
      {editingMediaIndex !== null && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fade-in perspective-1000">

          <div className="w-full max-w-5xl h-full max-h-[90vh] bg-[#0F172A] rounded-3xl flex flex-col shadow-2xl border border-white/10 overflow-hidden transform animate-zoom-in-95">

            {/* Header */}
            <div className="flex-shrink-0 p-5 border-b border-white/5 flex justify-between items-center text-white bg-[#0F172A] z-10">
              <h3 className="text-lg font-bold tracking-tight">Studio Editor</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveEditedImage}
                  disabled={isExporting || !croppedAreaPixels}
                  className={`md:hidden text-sm font-bold flex items-center gap-1.5 ${isExporting || !croppedAreaPixels
                    ? 'text-gray-500 cursor-not-allowed'
                    : 'text-indigo-400 hover:text-indigo-300'
                    }`}
                >
                  {isExporting ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={isExporting}
                  className={`p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>

            {/* Content Area - Flex Grow */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">

              {/* Canvas Container */}
              <div className="flex-1 relative bg-black/50 overflow-hidden order-2 md:order-1 h-[50vh] md:h-auto flex items-center justify-center">
                <div className="relative w-full h-full">
                  <Cropper
                    image={tempImageSrc}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={4 / 4}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    style={{
                      containerStyle: {
                        background: 'transparent',
                        filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) sepia(${filters.sepia}%) grayscale(${filters.grayscale}%)`
                      }
                    }}
                  />

                  {/* Export Loading Overlay */}
                  {isExporting && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 flex flex-col items-center gap-4 border border-white/20">
                        <div className="relative">
                          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-white text-lg mb-1">Processing Image...</p>
                          <p className="text-indigo-300 text-sm">Applying filters and transformations</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Export Error Display */}
                  {exportError && !isExporting && (
                    <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl flex items-center gap-3 animate-slide-up">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-medium flex-1">{exportError}</p>
                      <button onClick={() => setExportError(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Controls - Scrollable */}
              <div className="w-full md:w-80 bg-[#1E293B] border-t md:border-t-0 md:border-l border-white/5 p-6 overflow-y-auto order-1 md:order-2 flex-shrink-0 z-20 max-h-[40vh] md:max-h-none custom-scrollbar">
                <div className="space-y-8 text-gray-300 pb-4">

                  <div className="space-y-5">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Transform</h4>
                    <div className="space-y-1">
                      <label className="text-xs font-bold flex justify-between mb-2">Zoom <span className="text-indigo-300">{zoom}x</span></label>
                      <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-indigo-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer hover:bg-gray-600 transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold flex justify-between mb-2">Rotate <span className="text-indigo-300">{rotation}°</span></label>
                      <input type="range" min="0" max="360" value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="w-full accent-indigo-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer hover:bg-gray-600 transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-5">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Filters</h4>
                    {[
                      { label: 'Brightness', prop: 'brightness', min: 0, max: 200 },
                      { label: 'Contrast', prop: 'contrast', min: 0, max: 200 },
                      { label: 'Saturation', prop: 'saturation', min: 0, max: 200 },
                      { label: 'Sepia', prop: 'sepia', min: 0, max: 100 },
                      { label: 'Grayscale', prop: 'grayscale', min: 0, max: 100 },
                    ].map(f => (
                      <div key={f.prop} className="space-y-1">
                        <label className="text-xs font-bold flex justify-between mb-2">{f.label} <span className="text-indigo-300">{filters[f.prop]}%</span></label>
                        <input
                          type="range" min={f.min} max={f.max}
                          value={filters[f.prop]}
                          onChange={(e) => setFilters({ ...filters, [f.prop]: Number(e.target.value) })}
                          className="w-full accent-indigo-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer hover:bg-gray-600 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Desktop Only */}
            <div className="flex-shrink-0 p-5 bg-[#0F172A] border-t border-white/5 hidden md:flex justify-between items-center space-x-3 z-30">
              {/* Validation Info */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {!croppedAreaPixels && (
                  <div className="flex items-center gap-1.5 text-yellow-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Adjust crop area</span>
                  </div>
                )}
                {croppedAreaPixels && (
                  <div className="flex items-center gap-1.5 text-green-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Ready to export</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={cancelEdit}
                  disabled={isExporting}
                  className={`px-6 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-bold text-sm ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditedImage}
                  disabled={isExporting || !croppedAreaPixels}
                  className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${isExporting || !croppedAreaPixels
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95'
                    }`}
                >
                  {isExporting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Exporting...
                    </>
                  ) : (
                    'Apply Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreatePost;
