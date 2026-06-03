const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const journalController = require('../controllers/journalController');

router.use(isAuthenticated);

router.post('/', journalController.createJournalEntry);
router.get('/', journalController.getJournalEntries);
router.get('/streak', journalController.getJournalStreak);
router.get('/analyze/:id', journalController.analyzeSentiment); // AI Analysis
router.get('/insights', journalController.getInsights); // Progress insights
router.post('/:id/milestone', journalController.checkMilestone); // Milestone celebrations);

module.exports = router;