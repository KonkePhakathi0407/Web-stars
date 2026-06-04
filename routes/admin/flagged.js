const express = require('express');
const router = express.Router();
const { isAdminAuthenticated } = require('../../middleware/adminAuth');

// Get flagged content
router.get('/', isAdminAuthenticated, async (req, res) => {
    res.json({ success: true, message: 'Flagged content endpoint - to be implemented' });
});

module.exports = router;