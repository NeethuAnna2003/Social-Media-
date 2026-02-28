import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

/**
 * SensitiveWordFilterManager Component
 * Allows users to manage their personal sensitive word filters
 */
const SensitiveWordFilterManager = () => {
    const navigate = useNavigate();
    const [words, setWords] = useState([]);
    const [requests, setRequests] = useState([]);
    const [newWords, setNewWords] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'requests'

    useEffect(() => {
        fetchActiveWords();
        fetchRequests();
    }, []);

    const fetchActiveWords = async () => {
        try {
            console.log('[Word Filter] Fetching active words...');
            const response = await api.get('/posts/filter/words/');
            console.log('[Word Filter] Active words response:', response.data);

            // Handle paginated response from DRF
            const data = response.data;
            if (data && typeof data === 'object' && 'results' in data) {
                setWords(Array.isArray(data.results) ? data.results : []);
            } else if (Array.isArray(data)) {
                setWords(data);
            } else {
                setWords([]);
            }
        } catch (error) {
            console.error('[Word Filter] Error fetching words:', error);
            console.error('[Word Filter] Error details:', error.response);
            setWords([]); // Set empty array on error
            if (error.response?.status !== 404) {
                toast.error('Failed to load your filters');
            }
        }
    };

    const fetchRequests = async () => {
        try {
            console.log('[Word Filter] Fetching requests...');
            const response = await api.get('/posts/filter/requests/');
            console.log('[Word Filter] Requests response:', response.data);
            console.log('[Word Filter] Is array?', Array.isArray(response.data));
            console.log('[Word Filter] Length:', response.data?.length);

            // Handle paginated response from DRF
            const data = response.data;
            if (data && typeof data === 'object' && 'results' in data) {
                // Paginated response
                console.log('[Word Filter] Paginated response detected, using results array');
                setRequests(Array.isArray(data.results) ? data.results : []);
            } else if (Array.isArray(data)) {
                // Direct array response
                console.log('[Word Filter] Direct array response');
                setRequests(data);
            } else {
                // Unexpected format
                console.warn('[Word Filter] Unexpected response format:', data);
                setRequests([]);
            }
        } catch (error) {
            console.error('[Word Filter] Error fetching requests:', error);
            console.error('[Word Filter] Error details:', error.response);
            setRequests([]); // Set empty array on error
        }
    };

    const handleSubmitRequest = async (e) => {
        e.preventDefault();

        if (!newWords.trim()) {
            toast.error('Please enter at least one word');
            return;
        }

        setLoading(true);
        try {
            const wordList = newWords
                .split(',')
                .map(w => w.trim())
                .filter(w => w.length > 0);

            await api.post('/posts/filter/requests/', {
                words: wordList,
                reason: reason.trim() || undefined,
            });

            toast.success('Request submitted! Waiting for admin approval.');
            setNewWords('');
            setReason('');
            fetchRequests();
        } catch (error) {
            console.error('Error submitting request:', error);
            toast.error(error.response?.data?.detail || 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleWord = async (wordId) => {
        try {
            await api.post(`/posts/filter/words/${wordId}/toggle/`);
            toast.success('Filter updated');
            fetchActiveWords();
        } catch (error) {
            console.error('Error toggling word:', error);
            toast.error('Failed to update filter');
        }
    };

    const handleDeleteWord = async (wordId) => {
        if (!window.confirm('Are you sure you want to delete this filter?')) {
            return;
        }

        try {
            await api.delete(`/posts/filter/words/${wordId}/`);
            toast.success('Filter deleted');
            fetchActiveWords();
        } catch (error) {
            console.error('Error deleting word:', error);
            toast.error('Failed to delete filter');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div className="sensitive-word-filter-manager max-w-4xl mx-auto p-6">
            {/* Back Button */}
            <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 text-gray-600 hover:text-purple-600 mb-4 transition-colors group"
            >
                <svg
                    className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Back to Profile</span>
            </button>

            <div className="header mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Sensitive Word Filters
                </h1>
                <p className="text-gray-600">
                    Manage words you want filtered from comments on your posts. All requests require admin approval.
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="tabs flex gap-4 border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`tab-button px-4 py-2 font-medium transition-colors ${activeTab === 'active'
                        ? 'text-purple-600 border-b-2 border-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Active Filters ({words.length})
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`tab-button px-4 py-2 font-medium transition-colors ${activeTab === 'requests'
                        ? 'text-purple-600 border-b-2 border-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    My Requests ({requests.length})
                </button>
            </div>

            {/* Submit New Request Form */}
            <div className="new-request-form bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Request New Filters
                </h2>
                <form onSubmit={handleSubmitRequest}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Words to Filter (comma-separated)
                        </label>
                        <input
                            type="text"
                            value={newWords}
                            onChange={(e) => setNewWords(e.target.value)}
                            placeholder="e.g., ugly, fat, stupid"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Separate multiple words with commas. These will only filter comments on YOUR posts.
                        </p>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason (Optional)
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Why do you want to filter these words?"
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Submitting...' : 'Submit Request'}
                    </button>
                </form>
            </div>

            {/* Active Filters Tab */}
            {activeTab === 'active' && (
                <div className="active-filters bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Active Filters
                    </h2>
                    {words.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                            No active filters. Submit a request to get started.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {words.map((word) => (
                                <div
                                    key={word.id}
                                    className="filter-item flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-semibold text-gray-900">
                                                {word.word}
                                            </span>
                                            {!word.is_active && (
                                                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                                                    Disabled
                                                </span>
                                            )}
                                        </div>
                                        {word.variations && word.variations.length > 0 && (
                                            <p className="text-sm text-gray-500 mt-1">
                                                Variations: {word.variations.join(', ')}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">
                                            Triggered {word.times_triggered} time{word.times_triggered !== 1 ? 's' : ''}
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleToggleWord(word.id)}
                                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${word.is_active
                                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                }`}
                                        >
                                            {word.is_active ? 'Disable' : 'Enable'}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteWord(word.id)}
                                            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
                <div className="requests bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        My Requests
                    </h2>
                    {requests.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                            No requests yet.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {requests.map((request) => (
                                <div
                                    key={request.id}
                                    className="request-item border border-gray-200 rounded-lg p-4"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-semibold text-gray-900">
                                                    {request.requested_words}
                                                </span>
                                                {getStatusBadge(request.status)}
                                            </div>
                                            {request.reason && (
                                                <p className="text-sm text-gray-600 mb-2">
                                                    <strong>Reason:</strong> {request.reason}
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-400">
                                                Submitted {new Date(request.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    {request.admin_notes && (
                                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                            <p className="text-sm text-gray-700">
                                                <strong>Admin Notes:</strong> {request.admin_notes}
                                            </p>
                                            {request.reviewed_by_username && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Reviewed by {request.reviewed_by_username} on{' '}
                                                    {new Date(request.reviewed_at).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SensitiveWordFilterManager;
