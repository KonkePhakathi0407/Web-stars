const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/database');
const { isAdminAuthenticated } = require('../../middleware/adminAuth');

// ── GET /api/admin/crisis  — list all alerts ──────────────────────────────────
router.get('/', isAdminAuthenticated, async (req, res) => {
    try {
        const { status, severity, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT 
                ca.id,
                ca.user_id,
                ca.severity,
                ca.status,
                ca.location,
                ca.message,
                ca.share_details,
                ca.received_at,
                ca.handled_by,
                ca.admin_response,
                ca.responded_at,
                u.first_name,
                u.last_name,
                u.email,
                u.university
            FROM crisis_alerts ca
            LEFT JOIN users u ON ca.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            query += ' AND ca.status = ?';
            params.push(status);
        }
        if (severity && severity !== 'all') {
            query += ' AND ca.severity = ?';
            params.push(severity);
        }

        query += ' ORDER BY ca.received_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [alerts] = await promisePool.query(query, params);

        // Get counts per status
        const [counts] = await promisePool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(status = 'open')     as open_count,
                SUM(status = 'resolved') as resolved_count,
                SUM(severity = 'high')   as high_count
            FROM crisis_alerts
        `);

        res.json({
            success: true,
            alerts,
            counts: counts[0],
            total: alerts.length
        });

    } catch (error) {
        console.error('Get crisis alerts error:', error);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// ── GET /api/admin/crisis/:id  — single alert ─────────────────────────────────
router.get('/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const [alerts] = await promisePool.query(`
            SELECT ca.*, u.first_name, u.last_name, u.email, u.university
            FROM crisis_alerts ca
            LEFT JOIN users u ON ca.user_id = u.id
            WHERE ca.id = ?
        `, [req.params.id]);

        if (alerts.length === 0) {
            return res.status(404).json({ success: false, message: 'Alert not found' });
        }

        res.json({ success: true, alert: alerts[0] });
    } catch (error) {
        console.error('Get single alert error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── PUT /api/admin/crisis/:id  — update status / respond ─────────────────────
router.put('/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const { status, admin_response } = req.body;
        const adminId = req.session.adminId;

        await promisePool.query(`
            UPDATE crisis_alerts
            SET 
                status         = COALESCE(?, status),
                admin_response = COALESCE(?, admin_response),
                handled_by     = ?,
                responded_at   = NOW()
            WHERE id = ?
        `, [status || null, admin_response || null, adminId, req.params.id]);

        // Notify user if they shared details and there's a response
        if (admin_response) {
            const [alerts] = await promisePool.query(
                'SELECT user_id FROM crisis_alerts WHERE id = ?', [req.params.id]
            );
            if (alerts[0]?.user_id) {
                await promisePool.query(`
                    INSERT INTO notifications (user_id, title, message, type)
                    VALUES (?, 'Wellness Centre Response', ?, 'crisis_response')
                `, [alerts[0].user_id, admin_response]);
            }
        }

        // Log the action
        try {
            await promisePool.query(`
                INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, new_value, ip_address)
                VALUES (?, 'UPDATE_CRISIS_ALERT', 'crisis_alert', ?, ?, ?)
            `, [adminId, req.params.id, JSON.stringify({ status, admin_response }), req.ip]);
        } catch (e) { /* audit log optional */ }

        res.json({ success: true, message: 'Alert updated' });
    } catch (error) {
        console.error('Update crisis alert error:', error);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// ── GET /api/admin/crisis/notifications  (kept for sidebar dot) ───────────────
router.get('/notifications', isAdminAuthenticated, async (req, res) => {
    try {
        const [notifications] = await promisePool.query(`
            SELECT * FROM admin_notifications
            WHERE admin_id = ? 
            ORDER BY created_at DESC LIMIT 20
        `, [req.session.adminId]);

        const [unread] = await promisePool.query(
            'SELECT COUNT(*) as count FROM admin_notifications WHERE admin_id = ? AND is_read = 0',
            [req.session.adminId]
        );

        res.json({ success: true, notifications, count: unread[0].count });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;