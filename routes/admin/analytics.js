const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/database');  // ← FIXED: added promisePool and correct path
const { isAdminAuthenticated } = require('../../middleware/adminAuth');  // ← FIXED path

// Get analytics data
router.get('/', isAdminAuthenticated, async (req, res) => {
    try {
        // Get total users count
        const [totalUsers] = await promisePool.query(
            'SELECT COUNT(*) as count FROM users WHERE role = "user"'
        );

        // Get total mood logs
        const [totalMoods] = await promisePool.query(
            'SELECT COUNT(*) as count FROM mood_logs'
        );

        // Get average mood score
        const [avgMood] = await promisePool.query(
            'SELECT ROUND(AVG(mood_score), 1) as avg_mood FROM mood_logs'
        );

        // Get total journal entries
        const [totalJournals] = await promisePool.query(
            'SELECT COUNT(*) as count FROM journal_entries'
        );

        // Get total crisis alerts
        const [totalCrisis] = await promisePool.query(
            'SELECT COUNT(*) as count FROM crisis_alerts_admin'
        );

        // Get active users this week
        const [activeUsers] = await promisePool.query(
            `SELECT COUNT(DISTINCT user_id) as count 
             FROM mood_logs 
             WHERE logged_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
        );

        res.json({ 
            success: true, 
            analytics: {
                totalUsers: totalUsers[0].count,
                totalMoods: totalMoods[0].count,
                averageMood: avgMood[0].avg_mood || 0,
                totalJournals: totalJournals[0].count,
                totalCrisisAlerts: totalCrisis[0].count,
                activeUsersLastWeek: activeUsers[0].count
            }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            error: error.message
        });
    }
});

// Get mood trends over time
router.get('/mood-trends', isAdminAuthenticated, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
        const [trends] = await promisePool.query(
            `SELECT DATE(logged_at) as date, 
                    ROUND(AVG(mood_score), 1) as avg_mood,
                    COUNT(*) as entries
             FROM mood_logs 
             WHERE logged_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY DATE(logged_at)
             ORDER BY date ASC`,
            [days]
        );

        res.json({ success: true, trends });
    } catch (error) {
        console.error('Mood trends error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get user engagement stats
router.get('/engagement', isAdminAuthenticated, async (req, res) => {
    try {
        // Daily active users for last 30 days
        const [dailyActive] = await promisePool.query(
            `SELECT DATE(logged_at) as date, 
                    COUNT(DISTINCT user_id) as active_users
             FROM mood_logs 
             WHERE logged_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY DATE(logged_at)
             ORDER BY date ASC`
        );

        // Weekly retention
        const [retention] = await promisePool.query(
            `SELECT 
                WEEK(logged_at) as week,
                COUNT(DISTINCT user_id) as returning_users
             FROM mood_logs 
             WHERE logged_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
             GROUP BY WEEK(logged_at)`
        );

        res.json({ 
            success: true, 
            engagement: {
                dailyActive,
                weeklyRetention: retention
            }
        });
    } catch (error) {
        console.error('Engagement error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;