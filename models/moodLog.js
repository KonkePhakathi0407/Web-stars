const { promisePool } = require('../config/database');

class MoodLog {
    static async create(userId, moodData) {
        const { mood_score, mood_label, notes } = moodData;
        
        const [result] = await promisePool.execute(
            'INSERT INTO mood_logs (user_id, mood_score, mood_label, notes) VALUES (?, ?, ?, ?)',
            [userId, mood_score, mood_label || null, notes || null]
        );
        
        return result.insertId;
    }

    static async findByUserId(userId, limit = 90) {
        const [rows] = await promisePool.execute(
            'SELECT * FROM mood_logs WHERE user_id = ? ORDER BY logged_at DESC LIMIT ?',
            [userId, limit]
        );
        return rows;
    }

    static async findById(id, userId) {
        const [rows] = await promisePool.execute(
            'SELECT * FROM mood_logs WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return rows[0] || null;
    }

    static async update(id, userId, moodData) {
        const { mood_score, mood_label, notes } = moodData;
        
        const [result] = await promisePool.execute(
            'UPDATE mood_logs SET mood_score = ?, mood_label = ?, notes = ? WHERE id = ? AND user_id = ?',
            [mood_score, mood_label, notes, id, userId]
        );
        
        return result.affectedRows > 0;
    }

    static async delete(id, userId) {
        const [result] = await promisePool.execute(
            'DELETE FROM mood_logs WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return result.affectedRows > 0;
    }

    static async getStats(userId) {
        const [rows] = await promisePool.execute(
            `SELECT 
                AVG(mood_score) as average,
                MAX(mood_score) as highest,
                MIN(mood_score) as lowest,
                COUNT(*) as total
             FROM mood_logs WHERE user_id = ?`,
            [userId]
        );
        return rows[0];
    }
}

module.exports = MoodLog;