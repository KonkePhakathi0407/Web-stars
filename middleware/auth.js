const { promisePool } = require('../config/database');

async function protectUser(req, res, next) {
    // Check if user is logged in via session
    if (!req.session?.user_id) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not authenticated. Please login.' 
        });
    }
    
    try {
        // Verify user exists in database
        const [users] = await promisePool.query(
            'SELECT id, email, first_name, last_name, role FROM users WHERE id = ?',
            [req.session.user_id]
        );
        
        if (users.length === 0) {
            req.session.destroy(() => {});
            return res.status(401).json({ 
                success: false, 
                message: 'Session expired. Please login again.' 
            });
        }
        
        req.user = users[0];
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
}

// Alias for backward compatibility
async function isAuthenticated(req, res, next) {
    return protectUser(req, res, next);
}

module.exports = { 
    protectUser,
    isAuthenticated 
};