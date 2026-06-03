const { promisePool } = require('../config/database');

const createMoodLog = async (req, res) => {
    try {
        const { mood_score, mood_label, notes } = req.body;
        const userId = req.session.user_id;

        if (!mood_score || mood_score < 1 || mood_score > 10) {
            return res.json({ success: false, message: 'Invalid mood score (1-10)' });
        }

        await promisePool.execute(
            `INSERT INTO mood_logs (user_id, mood_score, mood_label, notes, logged_at) 
             VALUES (?, ?, ?, ?, NOW())`,
            [userId, mood_score, mood_label || null, notes || null]
        );

        res.json({ success: true, message: 'Mood logged successfully' });
    } catch (error) {
        console.error('Create mood log error:', error);
        res.json({ success: false, message: 'Failed to log mood' });
    }
};

const getMoodLogs = async (req, res) => {
    try {
        const userId = req.session.user_id;

        const [logs] = await promisePool.execute(
            `SELECT id, mood_score, mood_label, notes, logged_at 
             FROM mood_logs 
             WHERE user_id = ? 
             ORDER BY logged_at DESC 
             LIMIT 100`,
            [userId]
        );

        res.json({ success: true, logs });
    } catch (error) {
        console.error('Get mood logs error:', error);
        res.json({ success: false, logs: [] });
    }
};

const getMoodStats = async (req, res) => {
    try {
        const userId = req.session.user_id;

        const [stats] = await promisePool.execute(
            `SELECT 
                ROUND(AVG(mood_score), 1) as average,
                COUNT(*) as total,
                MIN(mood_score) as min,
                MAX(mood_score) as max
             FROM mood_logs 
             WHERE user_id = ?`,
            [userId]
        );

        res.json({ 
            success: true, 
            stats: stats[0] || { average: null, total: 0 }
        });
    } catch (error) {
        console.error('Get mood stats error:', error);
        res.json({ success: false, message: 'Failed to get statistics' });
    }
};

module.exports = {
    createMoodLog,
    getMoodLogs,
    getMoodStats
};