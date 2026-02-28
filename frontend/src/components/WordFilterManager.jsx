import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './WordFilterManager.css';

/**
 * WordFilterManager Component
 * 
 * Allows users to:
 * - Request new prohibited words
 * - View their active word filters
 * - Toggle filters on/off
 * - Delete filters
 * - View request status
 */
const WordFilterManager = () => {
    const [activeWords, setActiveWords] = useState([]);
    const [requests, setRequests] = useState([]);
    const [newWords, setNewWords] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchActiveWords();
        fetchRequests();
    }, []);

    const fetchActiveWords = async () => {
        try {
            const response = await axios.get('/api/posts/word-filter/words/');
            setActiveWords(response.data);
        } catch (error) {
            console.error('Error fetching active words:', error);
        }
    };

    const fetchRequests = async () => {
        try {
            const response = await axios.get('/api/posts/word-filter/requests/');
            setRequests(response.data.results || response.data);
        } catch (error) {
            console.error('Error fetching requests:', error);
        }
    };

    const handleSubmitRequest = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const wordsArray = newWords.split(',').map(w => w.trim()).filter(w => w);

            if (wordsArray.length === 0) {
                setMessage({ type: 'error', text: 'Please enter at least one word' });
                setLoading(false);
                return;
            }

            await axios.post('/api/posts/word-filter/requests/', {
                words: wordsArray,
                reason: reason
            });

            setMessage({ type: 'success', text: 'Request submitted! Admin will review it shortly.' });
            setNewWords('');
            setReason('');
            fetchRequests();
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to submit request. Please try again.' });
            console.error('Error submitting request:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleWord = async (wordId) => {
        try {
            await axios.post(`/api/posts/word-filter/words/${wordId}/toggle/`);
            fetchActiveWords();
            setMessage({ type: 'success', text: 'Filter updated successfully' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to toggle filter' });
            console.error('Error toggling word:', error);
        }
    };

    const handleDeleteWord = async (wordId) => {
        if (!window.confirm('Are you sure you want to delete this filter?')) {
            return;
        }

        try {
            await axios.delete(`/api/posts/word-filter/words/${wordId}/delete/`);
            fetchActiveWords();
            setMessage({ type: 'success', text: 'Filter deleted successfully' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to delete filter' });
            console.error('Error deleting word:', error);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { class: 'status-pending', text: 'Pending Review' },
            approved: { class: 'status-approved', text: 'Approved' },
            rejected: { class: 'status-rejected', text: 'Rejected' }
        };
        return badges[status] || badges.pending;
    };

    return (
        <div className="word-filter-manager">
            <h2 className="manager-title">Comment Word Filter</h2>
            <p className="manager-description">
                Manage prohibited words on your posts. Comments containing these words will be hidden from you and others.
            </p>

            {/* Message Display */}
            {message && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* Request New Filters */}
            <div className="section request-section">
                <h3 className="section-title">Request New Filters</h3>
                <form onSubmit={handleSubmitRequest} className="request-form">
                    <div className="form-group">
                        <label htmlFor="words">Words to Filter (comma-separated)</label>
                        <input
                            type="text"
                            id="words"
                            value={newWords}
                            onChange={(e) => setNewWords(e.target.value)}
                            placeholder="e.g., word1, word2, word3"
                            className="form-input"
                            required
                        />
                        <small className="form-hint">
                            Enter words or phrases separated by commas
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="reason">Reason (Optional)</label>
                        <textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Why do you want to filter these words?"
                            className="form-textarea"
                            rows="3"
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit Request'}
                    </button>
                </form>
            </div>

            {/* Active Filters */}
            <div className="section active-filters-section">
                <h3 className="section-title">Active Filters ({activeWords.length})</h3>
                {activeWords.length === 0 ? (
                    <p className="empty-state">No active filters yet</p>
                ) : (
                    <div className="filters-grid">
                        {activeWords.map((word) => (
                            <div key={word.id} className={`filter-card ${!word.is_active ? 'inactive' : ''}`}>
                                <div className="filter-header">
                                    <span className="filter-word">{word.word}</span>
                                    <span className="filter-count">{word.times_triggered} hits</span>
                                </div>
                                <div className="filter-actions">
                                    <button
                                        onClick={() => handleToggleWord(word.id)}
                                        className={`btn btn-sm ${word.is_active ? 'btn-warning' : 'btn-success'}`}
                                    >
                                        {word.is_active ? 'Disable' : 'Enable'}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteWord(word.id)}
                                        className="btn btn-sm btn-danger"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Request History */}
            <div className="section requests-section">
                <h3 className="section-title">Request History</h3>
                {requests.length === 0 ? (
                    <p className="empty-state">No requests yet</p>
                ) : (
                    <div className="requests-list">
                        {requests.map((request) => {
                            const badge = getStatusBadge(request.status);
                            return (
                                <div key={request.id} className="request-card">
                                    <div className="request-header">
                                        <span className={`status-badge ${badge.class}`}>
                                            {badge.text}
                                        </span>
                                        <span className="request-date">
                                            {new Date(request.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="request-body">
                                        <p className="request-words">
                                            <strong>Words:</strong> {request.requested_words}
                                        </p>
                                        {request.reason && (
                                            <p className="request-reason">
                                                <strong>Reason:</strong> {request.reason}
                                            </p>
                                        )}
                                        {request.admin_notes && (
                                            <p className="admin-notes">
                                                <strong>Admin Notes:</strong> {request.admin_notes}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WordFilterManager;
