const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/database');
const { isAdminAuthenticated, isPlatformAdmin } = require('../../middleware/adminAuth');

// ============================================
// GET /api/admin/users
// Get all users with filters
// ============================================
router.get('/', isAdminAuthenticated, isPlatformAdmin, async (req, res) => {
    try {
        const { user_type, is_verified, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT id, email, first_name, last_name, university, user_type, 
                   is_anonymous, is_verified, created_at, last_login
            FROM users
            WHERE 1=1
        `;
        const params = [];

        if (user_type && user_type !== 'all') {
            query += ' AND user_type = ?';
            params.push(user_type);
        }

        if (is_verified !== undefined && is_verified !== 'all') {
            query += ' AND is_verified = ?';
            params.push(is_verified === 'true');
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [users] = await promisePool.query(query, params);

        // Get user type counts
        const [typeCounts] = await promisePool.query(
            'SELECT user_type, COUNT(*) as count FROM users GROUP BY user_type'
        );

        res.json({
            success: true,
            users,
            typeCounts,
            total: users.length
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// GET /api/admin/users/:id
// Get single user by ID
// ============================================
router.get('/:id', isAdminAuthenticated, isPlatformAdmin, async (req, res) => {
    try {
        const [users] = await promisePool.query(
            `SELECT id, email, first_name, last_name, university, user_type, 
                    is_anonymous, is_verified, profile_picture, created_at, last_login
             FROM users 
             WHERE id = ?`,
            [req.params.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: users[0]
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// PUT /api/admin/users/:id/verify
// Verify a staff user
// ============================================
router.put('/:id/verify', isAdminAuthenticated, isPlatformAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        const [users] = await promisePool.query('SELECT * FROM users WHERE id = ?', [userId]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await promisePool.query('UPDATE users SET is_verified = TRUE WHERE id = ?', [userId]);

        // Audit log
        await promisePool.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, new_value, ip_address) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.session.adminId, 'VERIFY_USER', 'user', userId, JSON.stringify({ is_verified: true }), req.ip]
        );

        res.json({
            success: true,
            message: 'User verified successfully'
        });

    } catch (error) {
        console.error('Verify user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// DELETE /api/admin/users/:id
// Delete user (Platform Admin only)
// ============================================
router.delete('/:id', isAdminAuthenticated, isPlatformAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        const [users] = await promisePool.query('SELECT * FROM users WHERE id = ?', [userId]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await promisePool.query('DELETE FROM users WHERE id = ?', [userId]);

        // Audit log
        await promisePool.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, old_value, ip_address) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.session.adminId, 'DELETE_USER', 'user', userId, JSON.stringify(users[0]), req.ip]
        );

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;