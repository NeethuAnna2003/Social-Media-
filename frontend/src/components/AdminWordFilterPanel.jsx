import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminWordFilterPanel.css';

/**
 * AdminWordFilterPanel Component
 * 
 * Admin dashboard for reviewing and managing prohibited word requests.
 * Allows admins to:
 * - View all pending/approved/rejected requests
 * - Approve or reject requests with notes
 * - View all filtered comments across the platform
 */
const AdminWordFilterPanel = () => {
    const [requests, setRequests] = useState([]);
    const [filteredComments, setFilteredComments] = useState([]);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [reviewingId, setReviewingId] = useState(null);
    const [reviewNotes, setReviewNotes] = useState('');

    useEffect(() => {
        fetchRequests();
        fetchFilteredComments();
    }, [statusFilter]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/posts/admin/word-filter/requests/?status=${statusFilter}`);
            setRequests(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching requests:', error);
            setMessage({ type: 'error', text: 'Failed to load requests' });
        } finally {
            setLoading(false);
        }
    };

    const fetchFilteredComments = async () => {
        try {
            const response = await axios.get('/api/posts/admin/word-filter/filtered-comments/');
            setFilteredComments(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching filtered comments:', error);
        }
    };

    const handleReview = async (requestId, action) => {
        try {
            await axios.post(`/api/posts/admin/word-filter/requests/${requestId}/review/`, {
                action: action,
                admin_notes: reviewNotes
            });

            setMessage({
                type: 'success',
                text: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`
            });
            setReviewingId(null);
            setReviewNotes('');
            fetchRequests();
        } catch (error) {
            console.error('Error reviewing request:', error);
            setMessage({ type: 'error', text: 'Failed to review request' });
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { class: 'status-pending', text: 'Pending', icon: '⏳' },
            approved: { class: 'status-approved', text: 'Approved', icon: '✅' },
            rejected: { class: 'status-rejected', text: 'Rejected', icon: '❌' }
        };
        return badges[status] || badges.pending;
    };

    return (
        <div className="admin-word-filter-panel">
            <div className="panel-header">
                <h1 className="panel-title">Word Filter Administration</h1>
                <p className="panel-subtitle">Review and manage prohibited word requests</p>
            </div>

            {/* Message Display */}
            {message && (
                <div className={`admin-message ${message.type}`}>
                    {message.text}
                    <button onClick={() => setMessage(null)} className="close-message">×</button>
                </div>
            )}

            {/* Statistics */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-content">
                        <div className="stat-value">{requests.length}</div>
                        <div className="stat-label">Total Requests</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🚫</div>
                    <div className="stat-content">
                        <div className="stat-value">{filteredComments.length}</div>
                        <div className="stat-label">Filtered Comments</div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
                <button
                    className={`tab ${statusFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('pending')}
                >
                    ⏳ Pending
                </button>
                <button
                    className={`tab ${statusFilter === 'approved' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('approved')}
                >
                    ✅ Approved
                </button>
                <button
                    className={`tab ${statusFilter === 'rejected' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('rejected')}
                >
                    ❌ Rejected
                </button>
            </div>

            {/* Requests List */}
            <div className="requests-section">
                <h2 className="section-title">
                    {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Requests
                </h2>

                {loading ? (
                    <div className="loading-state">Loading...</div>
                ) : requests.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📭</div>
                        <p>No {statusFilter} requests</p>
                    </div>
                ) : (
                    <div className="admin-requests-list">
                        {requests.map((request) => {
                            const badge = getStatusBadge(request.status);
                            const isReviewing = reviewingId === request.id;

                            return (
                                <div key={request.id} className="admin-request-card">
                                    <div className="request-header">
                                        <div className="request-user">
                                            <span className="user-icon">👤</span>
                                            <span className="username">{request.username}</span>
                                        </div>
                                        <span className={`status-badge ${badge.class}`}>
                                            {badge.icon} {badge.text}
                                        </span>
                                    </div>

                                    <div className="request-content">
                                        <div className="request-field">
                                            <strong>Requested Words:</strong>
                                            <div className="words-list">
                                                {request.requested_words.split(',').map((word, idx) => (
                                                    <span key={idx} className="word-tag">{word.trim()}</span>
                                                ))}
                                            </div>
                                        </div>

                                        {request.reason && (
                                            <div className="request-field">
                                                <strong>Reason:</strong>
                                                <p className="reason-text">{request.reason}</p>
                                            </div>
                                        )}

                                        {request.admin_notes && (
                                            <div className="request-field admin-notes-field">
                                                <strong>Admin Notes:</strong>
                                                <p className="notes-text">{request.admin_notes}</p>
                                            </div>
                                        )}

                                        <div className="request-meta">
                                            <span className="meta-item">
                                                📅 {new Date(request.created_at).toLocaleString()}
                                            </span>
                                            {request.reviewed_by_username && (
                                                <span className="meta-item">
                                                    👨‍💼 Reviewed by {request.reviewed_by_username}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Review Actions (only for pending) */}
                                    {request.status === 'pending' && (
                                        <div className="review-section">
                                            {isReviewing ? (
                                                <div className="review-form">
                                                    <textarea
                                                        value={reviewNotes}
                                                        onChange={(e) => setReviewNotes(e.target.value)}
                                                        placeholder="Add notes about your decision (optional)"
                                                        className="review-textarea"
                                                        rows="3"
                                                    />
                                                    <div className="review-actions">
                                                        <button
                                                            onClick={() => handleReview(request.id, 'approve')}
                                                            className="btn btn-approve"
                                                        >
                                                            ✅ Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleReview(request.id, 'reject')}
                                                            className="btn btn-reject"
                                                        >
                                                            ❌ Reject
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setReviewingId(null);
                                                                setReviewNotes('');
                                                            }}
                                                            className="btn btn-cancel"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setReviewingId(request.id)}
                                                    className="btn btn-review"
                                                >
                                                    📝 Review Request
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Filtered Comments Section */}
            <div className="filtered-comments-section">
                <h2 className="section-title">Recent Filtered Comments</h2>
                {filteredComments.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">💬</div>
                        <p>No filtered comments yet</p>
                    </div>
                ) : (
                    <div className="filtered-comments-list">
                        {filteredComments.slice(0, 10).map((filtered) => (
                            <div key={filtered.id} className="filtered-comment-card">
                                <div className="comment-header">
                                    <span className="commenter">
                                        👤 {filtered.commenter_username}
                                    </span>
                                    <span className="arrow">→</span>
                                    <span className="post-owner">
                                        📌 {filtered.post_owner_username}'s post
                                    </span>
                                </div>
                                <div className="comment-text">{filtered.comment_text}</div>
                                <div className="matched-words-section">
                                    <strong>Matched words:</strong>
                                    {filtered.matched_words.map((word, idx) => (
                                        <span key={idx} className="matched-word">{word}</span>
                                    ))}
                                </div>
                                <div className="comment-date">
                                    {new Date(filtered.created_at).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminWordFilterPanel;
