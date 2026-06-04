const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { promisePool } = require('../../config/database');  // ← FIXED: ../../ not ../
const { isAdminAuthenticated, isSuperAdmin } = require('../../middleware/adminAuth');  // ← FIXED path

// ============================================
// GET /api/admin/admins
// Get all admins (Super Admin only)
// ============================================
router.get('/', isAdminAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const [admins] = await promisePool.query(
            `SELECT id, username, email, first_name, last_name, role, is_active, 
                    profile_picture, last_login, created_at 
             FROM admin_users
             ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            admins,
            total: admins.length
        });

    } catch (error) {
        console.error('Get admins error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// GET /api/admin/admins/:id
// Get single admin by ID
// ============================================
router.get('/:id', isAdminAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const [admins] = await promisePool.query(
            `SELECT id, username, email, first_name, last_name, role, is_active, 
                    profile_picture, last_login, created_at 
             FROM admin_users
             WHERE id = ?`,
            [req.params.id]
        );

        if (admins.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        res.json({
            success: true,
            admin: admins[0]
        });

    } catch (error) {
        console.error('Get admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// POST /api/admin/admins
// Create new admin (Super Admin only)
// ============================================
router.post('/', isAdminAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const { username, email, password, first_name, last_name, role } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email and password are required'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters'
            });
        }

        // Check if admin already exists
        const [existing] = await promisePool.query(
            'SELECT id FROM admin_users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new admin
        const [result] = await promisePool.query(
            `INSERT INTO admin_users (username, email, password_hash, first_name, last_name, role) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [username, email, hashedPassword, first_name || null, last_name || null, role || 'platform_admin']
        );

        // Audit log
        await promisePool.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, new_value, ip_address) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.session.adminId, 'CREATE_ADMIN', 'admin', result.insertId, JSON.stringify({ username, email, role }), req.ip]
        );

        res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            adminId: result.insertId
        });

    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// PUT /api/admin/admins/:id
// Update admin (Super Admin only)
// ============================================
router.put('/:id', isAdminAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const { first_name, last_name, role, is_active } = req.body;
        const adminId = parseInt(req.params.id);

        // Prevent deactivating own account
        if (adminId === req.session.adminId && is_active === false) {
            return res.status(400).json({
                success: false,
                message: 'Cannot deactivate your own account'
            });
        }

        // Get old data for audit
        const [oldData] = await promisePool.query('SELECT * FROM admin_users WHERE id = ?', [adminId]);

        if (oldData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Update admin
        await promisePool.query(
            `UPDATE admin_users 
             SET first_name = ?, last_name = ?, role = ?, is_active = ? 
             WHERE id = ?`,
            [first_name || null, last_name || null, role, is_active, adminId]
        );

        // Audit log
        await promisePool.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, old_value, new_value, ip_address) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.session.adminId, 'UPDATE_ADMIN', 'admin', adminId, JSON.stringify(oldData[0]), JSON.stringify(req.body), req.ip]
        );

        res.json({
            success: true,
            message: 'Admin updated successfully'
        });

    } catch (error) {
        console.error('Update admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// DELETE /api/admin/admins/:id
// Delete admin (Super Admin only)
// ============================================
router.delete('/:id', isAdminAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const adminId = parseInt(req.params.id);

        // Prevent deleting own account
        if (adminId === req.session.adminId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }

        // Get old data for audit
        const [oldData] = await promisePool.query('SELECT * FROM admin_users WHERE id = ?', [adminId]);

        if (oldData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Delete admin and related records
        await promisePool.query('DELETE FROM admin_users WHERE id = ?', [adminId]);
        await promisePool.query('DELETE FROM admin_sessions WHERE admin_id = ?', [adminId]);

        // Audit log
        await promisePool.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, old_value, ip_address) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.session.adminId, 'DELETE_ADMIN', 'admin', adminId, JSON.stringify(oldData[0]), req.ip]
        );

        res.json({
            success: true,
            message: 'Admin deleted successfully'
        });

    } catch (error) {
        console.error('Delete admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// POST /api/admin/admins/:id/reset-password
// Reset admin password (Super Admin only)
// ============================================
router.post('/:id/reset-password', isAdminAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const { new_password } = req.body;
        const adminId = req.params.id;

        if (!new_password || new_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters'
            });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);

        await promisePool.query(
            'UPDATE admin_users SET password_hash = ? WHERE id = ?',
            [hashedPassword, adminId]
        );

        // Audit log
        await promisePool.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, ip_address) 
             VALUES (?, ?, ?, ?, ?)`,
            [req.session.adminId, 'RESET_ADMIN_PASSWORD', 'admin', adminId, req.ip]
        );

        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// GET /api/admin/admins/me/profile
// Get own profile (any authenticated admin)
// ============================================
router.get('/me/profile', isAdminAuthenticated, async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            `SELECT id, username, email, first_name, last_name, role, 
                    profile_picture, last_login, created_at
             FROM admin_users WHERE id = ?`,
            [req.session.adminId]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, admin: rows[0] });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// PUT /api/admin/admins/me/profile
// Update own name / email
// ============================================
router.put('/me/profile', isAdminAuthenticated, async (req, res) => {
    try {
        const { first_name, last_name, email } = req.body;
        if (!first_name || !last_name || !email) {
            return res.status(400).json({ success: false, message: 'first_name, last_name and email are required' });
        }
        const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }
        // Check email not taken by someone else
        const [taken] = await promisePool.query('SELECT id FROM admin_users WHERE email = ? AND id != ?', [email, req.session.adminId]);
        if (taken.length > 0) return res.status(409).json({ success: false, message: 'Email already in use' });

        await promisePool.query(
            'UPDATE admin_users SET first_name = ?, last_name = ?, email = ? WHERE id = ?',
            [first_name, last_name, email, req.session.adminId]
        );
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// POST /api/admin/admins/me/profile-picture
// Upload own profile picture (base64)
// ============================================
router.post('/me/profile-picture', isAdminAuthenticated, async (req, res) => {
    try {
        const { image_data } = req.body;
        if (!image_data) return res.status(400).json({ success: false, message: 'image_data required' });
        if (image_data.length > 2 * 1024 * 1024) {
            return res.status(413).json({ success: false, message: 'Image too large (max 2MB)' });
        }
        await promisePool.query('UPDATE admin_users SET profile_picture = ? WHERE id = ?', [image_data, req.session.adminId]);
        res.json({ success: true, message: 'Profile picture updated', profile_picture: image_data });
    } catch (error) {
        console.error('Upload picture error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// POST /api/admin/admins/me/change-password
// Change own password (requires current password)
// ============================================
router.post('/me/change-password', isAdminAuthenticated, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) {
            return res.status(400).json({ success: false, message: 'current_password and new_password required' });
        }
        if (new_password.length < 8) {
            return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
        }
        const [rows] = await promisePool.query('SELECT password_hash FROM admin_users WHERE id = ?', [req.session.adminId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Account not found' });

        const valid = await bcrypt.compare(current_password, rows[0].password_hash);
        if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

        const newHash = await bcrypt.hash(new_password, 10);
        await promisePool.query('UPDATE admin_users SET password_hash = ? WHERE id = ?', [newHash, req.session.adminId]);
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// GET /api/admin/admins/me/sessions
// Get active sessions for current admin
// ============================================
router.get('/me/sessions', isAdminAuthenticated, async (req, res) => {
    try {
        const [sessions] = await promisePool.query(
            `SELECT id, device_type, browser, ip_address, is_current, created_at
             FROM admin_sessions WHERE admin_id = ? ORDER BY created_at DESC LIMIT 10`,
            [req.session.adminId]
        );
        res.json({ success: true, sessions });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// DELETE /api/admin/admins/me/sessions/:sessionId
// Revoke a specific session
// ============================================
router.delete('/me/sessions/:sessionId', isAdminAuthenticated, async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            'SELECT id, is_current FROM admin_sessions WHERE id = ? AND admin_id = ?',
            [req.params.sessionId, req.session.adminId]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Session not found' });
        if (rows[0].is_current) return res.status(400).json({ success: false, message: 'Cannot revoke your current session' });

        await promisePool.query('DELETE FROM admin_sessions WHERE id = ?', [req.params.sessionId]);
        res.json({ success: true, message: 'Session revoked' });
    } catch (error) {
        console.error('Revoke session error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// DELETE /api/admin/admins/me
// Delete own account and log out
// ============================================
router.delete('/me', isAdminAuthenticated, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) return res.status(400).json({ success: false, message: 'Password confirmation required' });

        const [rows] = await promisePool.query('SELECT password_hash FROM admin_users WHERE id = ?', [req.session.adminId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Account not found' });

        const valid = await bcrypt.compare(password, rows[0].password_hash);
        if (!valid) return res.status(401).json({ success: false, message: 'Incorrect password' });

        const adminId = req.session.adminId;
        await promisePool.query('DELETE FROM admin_sessions WHERE admin_id = ?', [adminId]);
        await promisePool.query('DELETE FROM admin_users WHERE id = ?', [adminId]);

        req.session.destroy(() => {});
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// GET /api/admin/admins/me/notifications
// Get unread notifications count + list
// ============================================
router.get('/me/notifications', isAdminAuthenticated, async (req, res) => {
    try {
        const [crisisRows] = await promisePool.query(
            `SELECT id, alert_ref as ref, severity, status, received_at as created_at, 'crisis' as type
             FROM crisis_alerts_admin
             WHERE status != 'resolved' ORDER BY received_at DESC LIMIT 5`
        ).catch(() => [[]]);

        const notifications = crisisRows.map(r => ({
            id: r.id,
            type: r.type,
            title: `Crisis Alert`,
            message: `${r.severity?.toUpperCase() || 'HIGH'} severity alert (${r.ref || r.id})`,
            created_at: r.created_at,
            read: false
        }));

        res.json({ success: true, count: notifications.length, notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.json({ success: true, count: 0, notifications: [] });
    }
});

module.exports = router;
