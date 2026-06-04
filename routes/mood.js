const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const moodController = require('../controllers/moodController');

// All mood routes require authentication
router.use(isAuthenticated);

// Create mood log
router.post('/', moodController.createMoodLog);

// Get all mood logs
router.get('/', moodController.getMoodLogs);

// Get mood statistics
router.get('/stats', moodController.getMoodStats);

module.exports = router;