// Centralized error handling middleware
module.exports = (err, req, res, next) => {
    // Log the error (optional: use your logger utility)
    if (process.env.NODE_ENV !== 'test') {
        // Only log if not in test environment
        try {
            const logger = require('../utils/logger');
            logger.error(err.stack || err.message);
        } catch (e) {
            // Fallback to console if logger fails
            console.error(err.stack || err.message);
        }
    }

    // Set status code
    const status = err.status || 500;
    // Send error response
    res.status(status).json({
        success: false,
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};
