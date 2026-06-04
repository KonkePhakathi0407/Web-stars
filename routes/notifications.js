const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { promisePool } = require('../config/database');

// Get all notifications for logged in student
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const [notifications] = await promisePool.execute(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
            [req.session.user_id]
        );
        res.json({ success: true, notifications });
    } catch (error) {
        res.json({ success: false, message: 'Failed to fetch notifications.' });
    }
});

// Get unread count — must be defined BEFORE /:id routes to avoid Express
// matching "unread" as an :id parameter
router.get('/unread', isAuthenticated, async (req, res) => {
    try {
        const [rows] = await promisePool.execute(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [req.session.user_id]
        );
        res.json({ success: true, count: rows[0].count });
    } catch (error) {
        res.json({ success: false, count: 0 });
    }
});

// Mark all as read — must be defined BEFORE /:id/read to avoid Express
// matching "read-all" as an :id parameter
router.put('/read-all', isAuthenticated, async (req, res) => {
    try {
        await promisePool.execute(
            'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
            [req.session.user_id]
        );
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false });
    }
});

// Mark single notification as read
router.put('/:id/read', isAuthenticated, async (req, res) => {
    try {
        await promisePool.execute(
            'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
            [req.params.id, req.session.user_id]
        );
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false });
    }
});

module.exports = router;