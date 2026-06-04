const { promisePool } = require('../config/database');  // ← This path is correct from middleware folder

async function isAdminAuthenticated(req, res, next) {
    if (!req.session?.adminId) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not authenticated. Please login.' 
        });
    }
    
    try {
        const [admins] = await promisePool.query(
            'SELECT id, username, email, first_name, last_name, role, is_active FROM admin_users WHERE id = ? AND is_active = TRUE',
            [req.session.adminId]
        );
        
        if (admins.length === 0) {
            req.session.destroy(() => {});
            return res.status(401).json({ 
                success: false, 
                message: 'Session expired. Please login again.' 
            });
        }
        
        req.admin = admins[0];
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }
        if (!allowedRoles.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
            });
        }
        next();
    };
}

const isSuperAdmin = requireRole('super_admin');
const isPlatformAdmin = requireRole('super_admin', 'platform_admin');
const isCounselorManager = requireRole('super_admin', 'platform_admin', 'counselor_manager');
const isModerator = requireRole('super_admin', 'platform_admin', 'counselor_manager', 'content_moderator');

module.exports = { 
    isAdminAuthenticated, 
    isSuperAdmin, 
    isPlatformAdmin, 
    isCounselorManager, 
    isModerator 
};