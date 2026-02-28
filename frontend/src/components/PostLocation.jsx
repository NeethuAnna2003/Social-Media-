import React from 'react';
import './PostLocation.css';

/**
 * PostLocation Component
 * 
 * Displays detected location information for a post.
 * Shows location with pin emoji if detected.
 * 
 * @param {Object} locationData - Location data from post
 * @param {string} locationData.display_location - Formatted location string
 * @param {boolean} locationData.is_detected - Whether location was detected
 * @param {string} locationData.detection_status - Status of detection
 */
const PostLocation = ({ locationData }) => {
    // Don't render if no location data or not detected
    if (!locationData || !locationData.is_detected) {
        return null;
    }

    // Show loading state if still processing
    if (locationData.detection_status === 'processing') {
        return (
            <div className="post-location processing">
                <span className="location-icon">📍</span>
                <span className="location-text">Detecting location...</span>
            </div>
        );
    }

    // Show detected location
    return (
        <div className="post-location">
            <span className="location-text">{locationData.display_location}</span>
        </div>
    );
};

export default PostLocation;
