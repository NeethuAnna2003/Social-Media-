/**
 * Utility functions for handling sensitive word filtering in comments
 */

/**
 * Highlights sensitive words in red within a text string
 * @param {string} text - The comment text
 * @param {string[]} matchedWords - Array of words to highlight
 * @returns {string} HTML string with highlighted words
 */
export const highlightSensitiveWords = (text, matchedWords) => {
    if (!text || !matchedWords || matchedWords.length === 0) {
        return text;
    }

    let highlightedText = text;

    // Escape special regex characters in words
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    matchedWords.forEach(word => {
        // Case-insensitive word boundary matching
        // \b ensures we match whole words only (prevents "fat" from matching "fatal")
        const escapedWord = escapeRegex(word);
        const regex = new RegExp(`\\b(${escapedWord})\\b`, 'gi');

        highlightedText = highlightedText.replace(
            regex,
            '<span style="color: #ef4444; font-weight: 600; background-color: rgba(239, 68, 68, 0.1); padding: 2px 4px; border-radius: 3px;">$1</span>'
        );
    });

    return highlightedText;
};

/**
 * Check if a comment has a filter warning
 * @param {object} comment - The comment object
 * @returns {boolean} True if comment has filter warning
 */
export const hasFilterWarning = (comment) => {
    return comment?.filter_warning?.show === true;
};

/**
 * Get filter warning message
 * @param {object} comment - The comment object
 * @returns {object|null} Filter warning object or null
 */
export const getFilterWarning = (comment) => {
    if (!hasFilterWarning(comment)) {
        return null;
    }
    return comment.filter_warning;
};

/**
 * Format comment text with highlighting if needed
 * @param {object} comment - The comment object
 * @returns {object} Object with { html: string, isHighlighted: boolean }
 */
export const formatCommentText = (comment) => {
    const warning = getFilterWarning(comment);

    if (warning && warning.matched_words) {
        return {
            html: highlightSensitiveWords(comment.text, warning.matched_words),
            isHighlighted: true,
        };
    }

    return {
        html: comment.text,
        isHighlighted: false,
    };
};

/**
 * React component helper: Render comment with highlighting
 * Usage in JSX:
 * 
 * const { html, isHighlighted } = formatCommentText(comment);
 * 
 * {isHighlighted ? (
 *   <div dangerouslySetInnerHTML={{ __html: html }} />
 * ) : (
 *   <div>{html}</div>
 * )}
 */
