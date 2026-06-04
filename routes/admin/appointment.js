const express = require('express');
const router  = express.Router();
const { promisePool } = require('../../config/database');
const { isAdminAuthenticated } = require('../../middleware/adminAuth');

// GET all appointments
router.get('/', isAdminAuthenticated, async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT b.*, u.first_name, u.last_name, u.email, u.university
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            query += ' AND b.status = ?';
            params.push(status);
        }
        query += ' ORDER BY b.appointment_date DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [appointments] = await promisePool.query(query, params);
        const [stats] = await promisePool.query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) as confirmed,
                SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as cancelled
             FROM bookings`
        );

        res.json({ success: true, appointments, stats: stats[0] });
    } catch (error) {
        console.error('Get appointments error:', error);
        res.json({ success: false, appointments: [], message: error.message });
    }
});

// GET single appointment
router.get('/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            `SELECT b.*, u.first_name, u.last_name, u.email FROM bookings b
             LEFT JOIN users u ON b.user_id = u.id WHERE b.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, appointment: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PUT update appointment status
router.put('/:id/status', isAdminAuthenticated, async (req, res) => {
    try {
        const { status } = req.body;
        const valid = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!valid.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        await promisePool.query('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);

        await promisePool.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, new_value, ip_address)
             VALUES (?, 'UPDATE_APPOINTMENT_STATUS', 'booking', ?, ?, ?)`,
            [req.session.adminId, req.params.id, JSON.stringify({ status }), req.ip]
        ).catch(() => {});

        res.json({ success: true, message: 'Status updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// DELETE appointment
router.delete('/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const [old] = await promisePool.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
        if (old.length === 0) return res.status(404).json({ success: false, message: 'Not found' });

        await promisePool.query('DELETE FROM bookings WHERE id = ?', [req.params.id]);

        await promisePool.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, old_value, ip_address)
             VALUES (?, 'DELETE_APPOINTMENT', 'booking', ?, ?, ?)`,
            [req.session.adminId, req.params.id, JSON.stringify(old[0]), req.ip]
        ).catch(() => {});

        res.json({ success: true, message: 'Appointment deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
