const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/database');  // ← FIXED: changed path and pool to promisePool
const { isAdminAuthenticated } = require('../../middleware/adminAuth');  // ← FIXED path

// ============================================
// GET /api/admin/dashboard/stats
// Get main dashboard statistics
// ============================================
router.get('/stats', isAdminAuthenticated, async (req, res) => {
    try {
        // Get total students (changed: user_type to role)
        const [totalStudents] = await promisePool.query(
            'SELECT COUNT(*) as count FROM users WHERE role = "user" OR user_type = "student"'
        );

        // Get crisis alerts today (changed: crisis_alerts to crisis_alerts_admin)
        const [crisisToday] = await promisePool.query(
            `SELECT COUNT(*) as count FROM crisis_alerts_admin 
             WHERE DATE(received_at) = CURDATE() AND status != 'resolved'`
        );

        // Get appointments this week
        const [appointmentsWeek] = await promisePool.query(
            `SELECT COUNT(*) as count FROM bookings 
             WHERE YEARWEEK(appointment_date) = YEARWEEK(CURDATE())`
        );

        // Get forum posts this week
        const [forumPosts] = await promisePool.query(
            `SELECT COUNT(*) as count FROM forum_posts 
             WHERE YEARWEEK(created_at) = YEARWEEK(CURDATE())`
        );

        // Get flagged content pending
        const [flaggedPending] = await promisePool.query(
            'SELECT COUNT(*) as count FROM flagged_content WHERE reviewed_at IS NULL'
        );

        // Get average mood this week
        const [avgMood] = await promisePool.query(
            `SELECT ROUND(AVG(mood_score), 1) as avg_mood 
             FROM mood_logs 
             WHERE WEEK(logged_at) = WEEK(CURDATE())`
        );

        // Get total admins (changed: admins to admin_users)
        const [totalAdmins] = await promisePool.query(
            'SELECT COUNT(*) as count FROM admin_users WHERE is_active = TRUE'
        );

        res.json({
            success: true,
            stats: {
                totalStudents: totalStudents[0].count,
                crisisToday: crisisToday[0].count,
                weeklyAppointments: appointmentsWeek[0].count,
                weeklyForumPosts: forumPosts[0].count,
                flaggedPending: flaggedPending[0].count,
                averageMood: avgMood[0].avg_mood || 0,
                totalAdmins: totalAdmins[0].count
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// GET /api/admin/dashboard/recent-activity
// Get recent activity feed
// ============================================
router.get('/recent-activity', isAdminAuthenticated, async (req, res) => {
    try {
        // Recent crisis alerts (changed: crisis_alerts to crisis_alerts_admin)
        const [recentAlerts] = await promisePool.query(
            `SELECT id, alert_ref, severity, status, received_at 
             FROM crisis_alerts_admin 
             ORDER BY received_at DESC 
             LIMIT 5`
        );

        // Recent user signups
        const [recentUsers] = await promisePool.query(
            `SELECT id, first_name, last_name, email, created_at 
             FROM users 
             ORDER BY created_at DESC 
             LIMIT 5`
        );

        // Recent forum posts
        const [recentPosts] = await promisePool.query(
            `SELECT id, title, category, created_at 
             FROM forum_posts 
             ORDER BY created_at DESC 
             LIMIT 5`
        );

        res.json({
            success: true,
            recentAlerts,
            recentUsers,
            recentPosts
        });

    } catch (error) {
        console.error('Recent activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// GET /api/admin/dashboard/trends
// Get weekly trends for charts
// ============================================
router.get('/trends', isAdminAuthenticated, async (req, res) => {
    try {
        // Last 7 days mood trend
        const [moodTrend] = await promisePool.query(
            `SELECT DATE(logged_at) as date, ROUND(AVG(mood_score), 1) as avg_mood
             FROM mood_logs 
             WHERE logged_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             GROUP BY DATE(logged_at)
             ORDER BY date ASC`
        );

        // Last 7 days crisis alerts trend (changed: crisis_alerts to crisis_alerts_admin)
        const [alertTrend] = await promisePool.query(
            `SELECT DATE(received_at) as date, COUNT(*) as count
             FROM crisis_alerts_admin 
             WHERE received_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             GROUP BY DATE(received_at)
             ORDER BY date ASC`
        );

        // Last 7 days user signups trend
        const [userTrend] = await promisePool.query(
            `SELECT DATE(created_at) as date, COUNT(*) as count
             FROM users 
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             GROUP BY DATE(created_at)
             ORDER BY date ASC`
        );

        res.json({
            success: true,
            moodTrend,
            alertTrend,
            userTrend
        });

    } catch (error) {
        console.error('Trends error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;