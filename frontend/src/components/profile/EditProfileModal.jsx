import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';
import ImageCropperModal from '../common/ImageCropperModal';

const EditProfileModal = ({ isOpen, onClose, user, onUpdate }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        date_of_birth: '',
        bio: '',
        interests: '',
        profession: '',
        location: '',
        website: '',
        gender: '',
        is_private: false,
        profile_pic: null,
        cover_photo: null
    });
    const [loading, setLoading] = useState(false);

    // Cropper State
    const [cropper, setCropper] = useState({
        isOpen: false,
        imageSrc: null,
        field: null // 'profile_pic' or 'cover_photo'
    });

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.first_name || '',
                lastName: user.last_name || '',
                date_of_birth: user.date_of_birth || '',
                bio: user.profile?.bio || user.bio || '',
                interests: user.profile?.interests || user.interests || '',
                profession: user.profile?.profession || '',
                location: user.profile?.location || '',
                website: user.profile?.website || '',
                gender: user.profile?.gender || '',
                is_private: user.profile?.is_private || false,
                profile_pic: null,
                cover_photo: null
            });
        }
    }, [user]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const field = e.target.name;
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setCropper({
                    isOpen: true,
                    imageSrc: reader.result,
                    field: field
                });
            });
            reader.readAsDataURL(file);
            // reset value so same file can be selected again
            e.target.value = '';
        }
    };

    const handleCropSave = (croppedBlob) => {
        if (!cropper.field) return;

        // Create a File from Blob
        const fileName = `${cropper.field}_cropped.jpg`;
        const file = new File([croppedBlob], fileName, { type: 'image/jpeg' });

        setFormData(prev => ({ ...prev, [cropper.field]: file }));
        setCropper({ isOpen: false, imageSrc: null, field: null });

        toast.success('Image cropped successfully!');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            console.log("Submitting form data...", formData);
            const data = new FormData();
            data.append('first_name', formData.firstName || '');
            data.append('last_name', formData.lastName || '');
            if (formData.date_of_birth) data.append('date_of_birth', formData.date_of_birth);

            data.append('bio', formData.bio || '');
            data.append('interests', formData.interests || '');
            data.append('profession', formData.profession || '');
            data.append('location', formData.location || '');
            data.append('website', (formData.website || '').trim());

            data.append('gender', formData.gender || '');
            // Explicitly convert boolean to string for FormData
            data.append('is_private', formData.is_private ? 'true' : 'false');

            if (formData.profile_pic instanceof File) {
                data.append('profile_pic', formData.profile_pic);
            }
            if (formData.cover_photo instanceof File) {
                data.append('cover_photo', formData.cover_photo);
            }

            // Log for debugging
            for (let pair of data.entries()) {
                console.log(pair[0], pair[1]);
            }
            if (localStorage.getItem('access')) {
                console.log("Auth Token is present");
            } else {
                console.warn("Auth Token is MISSING!");
            }

            // Using multipart/form-data via axios (automatically handled if passing FormData)
            const response = await api.put('/accounts/profile/update/', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            console.log("Update success:", response.data);

            if (onUpdate && typeof onUpdate === 'function') {
                onUpdate(response.data);
            }

            toast.success('Profile updated successfully!');
            onClose();
        } catch (err) {
            console.error('Update failed', err);
            const msg = err.response?.data?.detail
                || (err.response?.data && Object.values(err.response.data)[0])
                || err.message
                || 'Failed to update profile.';

            toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
            // Backup alert just in case toast is missed
            // alert(`Update Failed: ${JSON.stringify(msg)}`); 
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            {/* Main Edit Modal */}
            <div className={`bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden scale-100 animate-in fade-in zoom-in-95 duration-200 ${cropper.isOpen ? 'hidden' : ''}`}>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-xl text-gray-900">Edit Profile</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                    {/* Images */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Profile Photo</label>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors relative overflow-hidden group">
                                {formData.profile_pic ? (
                                    <div className="absolute inset-0">
                                        <img src={URL.createObjectURL(formData.profile_pic)} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white text-xs font-bold">Change</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg className="w-8 h-8 mb-2 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" /></svg>
                                        <p className="text-xs text-gray-500 font-semibold mb-1">Click to upload</p>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    name="profile_pic"
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </label>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cover Photo</label>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors relative overflow-hidden group">
                                {formData.cover_photo ? (
                                    <div className="absolute inset-0">
                                        <img src={URL.createObjectURL(formData.cover_photo)} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white text-xs font-bold">Change</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg className="w-8 h-8 mb-2 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" /></svg>
                                        <p className="text-xs text-gray-500 font-semibold mb-1">Click to upload</p>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    name="cover_photo"
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">First Name</label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Last Name</label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    {/* New Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Profession</label>
                            <input
                                type="text"
                                name="profession"
                                value={formData.profession}
                                onChange={handleChange}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Location</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date of Birth</label>
                            <input
                                type="date"
                                name="date_of_birth"
                                value={formData.date_of_birth}
                                onChange={handleChange}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Gender</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                            >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Website</label>
                        <input
                            type="url"
                            name="website"
                            value={formData.website}
                            onChange={handleChange}
                            placeholder="https://example.com"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Bio</label>
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            rows="3"
                            placeholder="Tell us about yourself..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Interests</label>
                        <div className="flex flex-wrap gap-2">
                            {['Fitness', 'Travel', 'Learning', 'Photography', 'Mental Health', 'Music'].map((interest) => {
                                const isSelected = formData.interests.split(',').map(s => s.trim()).includes(interest);
                                return (
                                    <button
                                        key={interest}
                                        type="button"
                                        onClick={() => {
                                            const current = formData.interests ? formData.interests.split(',').map(s => s.trim()).filter(Boolean) : [];
                                            let updated;
                                            if (current.includes(interest)) {
                                                updated = current.filter(i => i !== interest);
                                            } else {
                                                updated = [...current, interest];
                                            }
                                            setFormData({ ...formData, interests: updated.join(',') });
                                        }}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${isSelected
                                                ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-200'
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300 hover:bg-purple-50'
                                            }`}
                                    >
                                        {interest}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Select topics to personalize your Side-Quests.</p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                            <h4 className="font-bold text-gray-900 text-sm">Private Account</h4>
                            <p className="text-xs text-gray-500">Only followers can see your posts and stories</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="is_private"
                                checked={formData.is_private}
                                onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-gray-500 font-bold hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-70"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Cropper Modal */}
            {cropper.isOpen && (
                <ImageCropperModal
                    imageSrc={cropper.imageSrc}
                    aspect={cropper.field === 'profile_pic' ? 1 : 2.5}
                    onCancel={() => setCropper({ isOpen: false, imageSrc: null, field: null })}
                    onCrop={handleCropSave}
                    loading={false}
                />
            )}
        </div>
    );
};

export default EditProfileModal;
