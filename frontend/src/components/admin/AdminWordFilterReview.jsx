import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

/**
 * AdminWordFilterReview Component
 * Admin interface for reviewing and approving/rejecting word filter requests
 */
const AdminWordFilterReview = () => {
    const [requests, setRequests] = useState([]);
    const [filteredComments, setFilteredComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'approved', 'rejected', 'analytics'
    const [reviewingRequest, setReviewingRequest] = useState(null);
    const [adminNotes, setAdminNotes] = useState('');

    useEffect(() => {
        fetchRequests(activeTab);
        if (activeTab === 'analytics') {
            fetchFilteredComments();
        }
    }, [activeTab]);

    const fetchRequests = async (status) => {
        setLoading(true);
        try {
            console.log('[Admin Word Filter] Fetching requests with status:', status);
            const response = await api.get(`/posts/filter/admin/requests/?status=${status}`);
            console.log('[Admin Word Filter] Response:', response.data);
            console.log('[Admin Word Filter] Is array?', Array.isArray(response.data));
            console.log('[Admin Word Filter] Length:', response.data?.length);

            // Handle paginated response from DRF
            const data = response.data;
            if (data && typeof data === 'object' && 'results' in data) {
                console.log('[Admin Word Filter] Paginated response, using results');
                setRequests(Array.isArray(data.results) ? data.results : []);
            } else if (Array.isArray(data)) {
                console.log('[Admin Word Filter] Direct array response');
                setRequests(data);
            } else {
                console.warn('[Admin Word Filter] Unexpected format:', data);
                setRequests([]);
            }
        } catch (error) {
            console.error('[Admin Word Filter] Error fetching requests:', error);
            console.error('[Admin Word Filter] Error details:', error.response);
            setRequests([]); // Set empty array on error
            if (error.response?.status !== 404) {
                toast.error('Failed to load requests');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchFilteredComments = async () => {
        try {
            console.log('[Admin Word Filter] Fetching filtered comments...');
            const response = await api.get('/posts/filter/admin/filtered-comments/');
            console.log('[Admin Word Filter] Filtered comments response:', response.data);

            // Handle paginated response from DRF
            const data = response.data;
            if (data && typeof data === 'object' && 'results' in data) {
                setFilteredComments(Array.isArray(data.results) ? data.results : []);
            } else if (Array.isArray(data)) {
                setFilteredComments(data);
            } else {
                setFilteredComments([]);
            }
        } catch (error) {
            console.error('[Admin Word Filter] Error fetching filtered comments:', error);
            setFilteredComments([]); // Set empty array on error
        }
    };

    const handleReview = async (requestId, action, notes = '') => {
        try {
            const response = await api.post(`/posts/filter/admin/requests/${requestId}/review/`, {
                action,
                admin_notes: notes.trim() || undefined,
            });

            toast.success(response.data.message);
            setReviewingRequest(null);
            setAdminNotes('');

            // Always refresh the pending tab after approval/rejection
            // This ensures the request is removed from pending view
            fetchRequests('pending');

            // If we're on a different tab, also refresh that tab
            if (activeTab !== 'pending') {
                fetchRequests(activeTab);
            }
        } catch (error) {
            console.error('Error reviewing request:', error);
            toast.error(error.response?.data?.detail || 'Failed to review request');
        }
    };

    const openReviewModal = (request) => {
        setReviewingRequest(request);
        setAdminNotes('');
    };

    const closeReviewModal = () => {
        setReviewingRequest(null);
        setAdminNotes('');
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div className="admin-word-filter-review p-6">
            <div className="header mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Word Filter Management
                </h1>
                <p className="text-gray-600">
                    Review and manage user requests for sensitive word filtering
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="tabs flex gap-4 border-b border-gray-200 mb-6">
                {['pending', 'approved', 'rejected', 'analytics'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`tab-button px-4 py-2 font-medium transition-colors ${activeTab === tab
                            ? 'text-purple-600 border-b-2 border-purple-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {tab !== 'analytics' && ` (${requests.length})`}
                    </button>
                ))}
            </div>

            {/* Requests List */}
            {activeTab !== 'analytics' && (
                <div className="requests-list space-y-4">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-purple-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading requests...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg shadow">
                            <p className="text-gray-500">No {activeTab} requests</p>
                        </div>
                    ) : (
                        requests.map((request) => (
                            <div
                                key={request.id}
                                className="request-card bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                @{request.username}
                                            </h3>
                                            {getStatusBadge(request.status)}
                                        </div>
                                        <div className="mb-3">
                                            <p className="text-sm text-gray-600 mb-1">
                                                <strong>Requested Words:</strong>
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {request.requested_words.split(',').map((word, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                                                    >
                                                        {word.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {request.reason && (
                                            <div className="mb-3">
                                                <p className="text-sm text-gray-600 mb-1">
                                                    <strong>Reason:</strong>
                                                </p>
                                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                                                    {request.reason}
                                                </p>
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-400">
                                            Submitted {new Date(request.created_at).toLocaleDateString()} at{' '}
                                            {new Date(request.created_at).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>

                                {request.admin_notes && (
                                    <div className="admin-notes bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                                        <p className="text-sm text-blue-900">
                                            <strong>Admin Notes:</strong> {request.admin_notes}
                                        </p>
                                        {request.reviewed_by_username && (
                                            <p className="text-xs text-blue-700 mt-1">
                                                Reviewed by {request.reviewed_by_username} on{' '}
                                                {new Date(request.reviewed_at).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {request.status === 'pending' && (
                                    <div className="actions space-y-2">
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleReview(request.id, 'approve')}
                                                style={{ color: '#ffffff' }}
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg"
                                            >
                                                ✓ Approve
                                            </button>
                                            <button
                                                onClick={() => handleReview(request.id, 'reject')}
                                                style={{ color: '#ffffff' }}
                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg"
                                            >
                                                ✗ Reject
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => openReviewModal(request)}
                                            className="w-full bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-200 transition-all text-sm"
                                        >
                                            📝 Add Notes & Review
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <div className="analytics bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Filtered Comments Analytics
                    </h2>
                    {filteredComments.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                            No filtered comments yet
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {filteredComments.map((filtered) => (
                                <div
                                    key={filtered.id}
                                    className="filtered-comment-card border border-gray-200 rounded-lg p-4"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-600 mb-1">
                                                <strong>Commenter:</strong> @{filtered.commenter_username}
                                            </p>
                                            <p className="text-sm text-gray-600 mb-1">
                                                <strong>Post Owner:</strong> @{filtered.post_owner_username}
                                            </p>
                                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded mb-2">
                                                {filtered.comment_text}
                                            </p>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                <span className="text-xs text-gray-500">Matched words:</span>
                                                {filtered.matched_words.map((word, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium"
                                                    >
                                                        {word}
                                                    </span>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                Filtered on {new Date(filtered.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Review Modal */}
            {reviewingRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            Review Request from @{reviewingRequest.username}
                        </h2>

                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">
                                <strong>Requested Words:</strong>
                            </p>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {reviewingRequest.requested_words.split(',').map((word, idx) => (
                                    <span
                                        key={idx}
                                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                                    >
                                        {word.trim()}
                                    </span>
                                ))}
                            </div>

                            {reviewingRequest.reason && (
                                <div className="mb-4">
                                    <p className="text-sm text-gray-600 mb-2">
                                        <strong>User's Reason:</strong>
                                    </p>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                                        {reviewingRequest.reason}
                                    </p>
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Admin Notes (Optional)
                                </label>
                                <textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Add notes about your decision..."
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => handleReview(reviewingRequest.id, 'approve', adminNotes)}
                                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all"
                            >
                                ✓ Approve Request
                            </button>
                            <button
                                onClick={() => handleReview(reviewingRequest.id, 'reject', adminNotes)}
                                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold py-3 rounded-lg hover:from-red-600 hover:to-red-700 transition-all"
                            >
                                ✗ Reject Request
                            </button>
                            <button
                                onClick={closeReviewModal}
                                className="px-6 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminWordFilterReview;
