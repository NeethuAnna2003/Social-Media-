import React from 'react';
import { formatCommentText, getFilterWarning } from '../utils/commentFilterUtils';

/**
 * FilteredCommentWarning Component
 * Displays a warning banner when a comment is filtered
 */
const FilteredCommentWarning = ({ warning }) => {
    if (!warning || !warning.show) return null;

    return (
        <div className="filtered-comment-warning">
            <div className="warning-banner">
                <span className="warning-icon">⚠️</span>
                <span className="warning-message">{warning.message}</span>
            </div>
            <style jsx>{`
        .filtered-comment-warning {
          margin-bottom: 8px;
        }
        
        .warning-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(251, 146, 60, 0.1));
          border-left: 3px solid #ef4444;
          border-radius: 6px;
          font-size: 13px;
          color: #991b1b;
        }
        
        .warning-icon {
          font-size: 16px;
          flex-shrink: 0;
        }
        
        .warning-message {
          font-weight: 500;
          line-height: 1.4;
        }
      `}</style>
        </div>
    );
};

/**
 * CommentText Component
 * Renders comment text with sensitive word highlighting if applicable
 */
const CommentText = ({ comment }) => {
    const { html, isHighlighted } = formatCommentText(comment);

    return (
        <div className="comment-text-wrapper">
            {isHighlighted ? (
                <div
                    className="comment-text highlighted"
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            ) : (
                <div className="comment-text">{html}</div>
            )}
            <style jsx>{`
        .comment-text-wrapper {
          margin-top: 4px;
        }
        
        .comment-text {
          color: #374151;
          font-size: 14px;
          line-height: 1.6;
          word-wrap: break-word;
        }
        
        .comment-text.highlighted {
          /* Sensitive words are highlighted inline via dangerouslySetInnerHTML */
          /* The highlighting is applied by commentFilterUtils.js */
        }
      `}</style>
        </div>
    );
};

/**
 * FilteredComment Component
 * Complete comment component with filter warning and highlighting
 * 
 * Usage:
 * <FilteredComment comment={comment} />
 */
const FilteredComment = ({ comment }) => {
    const warning = getFilterWarning(comment);

    return (
        <div className="filtered-comment">
            {/* User info */}
            <div className="comment-header">
                <img
                    src={comment.user.profile_picture || '/default-avatar.png'}
                    alt={comment.user.username}
                    className="user-avatar"
                />
                <div className="user-info">
                    <span className="username">{comment.user.username}</span>
                    <span className="timestamp">
                        {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                </div>
            </div>

            {/* Filter warning (only shown to commenter) */}
            <FilteredCommentWarning warning={warning} />

            {/* Comment text with highlighting */}
            <CommentText comment={comment} />

            <style jsx>{`
        .filtered-comment {
          padding: 12px;
          background: white;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        
        .comment-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        
        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .user-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .username {
          font-weight: 600;
          font-size: 14px;
          color: #111827;
        }
        
        .timestamp {
          font-size: 12px;
          color: #6b7280;
        }
      `}</style>
        </div>
    );
};

export default FilteredComment;
export { FilteredCommentWarning, CommentText };
