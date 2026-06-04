// Response helper
const sendResponse = (res, success, message, data = {}, statusCode = 200) => {
    res.status(statusCode).json({
        success,
        message,
        ...data
    });
};

// Get current date in YYYY-MM-DD format
const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
};

// Truncate text for preview
const truncateText = (text, length = 100) => {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
};

// Calculate word count
const wordCount = (text) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
};

module.exports = {
    sendResponse,
    getCurrentDate,
    truncateText,
    wordCount
};