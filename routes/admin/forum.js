const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../../middleware/adminAuth');

// Get flagged forum posts
router.get('/flagged', isAdminAuthenticated, async (req, res) => {
    res.json({ success: true, message: 'Forum moderation endpoint - to be implemented' });
});

module.exports = router;