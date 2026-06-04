const { promisePool } = require('../config/database');

class JournalEntry {
    // Create a new journal entry
    static async create(userId, entryData) {
        const { mood, content } = entryData;
        const wordCount = this._wordCount(content);
        const excerpt = this._truncateText(content, 200);
        
        const [result] = await promisePool.execute(
            `INSERT INTO journal_entries (user_id, mood, content, word_count) 
             VALUES (?, ?, ?, ?)`,
            [userId, mood || null, content, wordCount]
        );
        
        return {
            id: result.insertId,
            word_count: wordCount
        };
    }

    // Get all journal entries for a user
    static async findByUserId(userId, limit = 50) {
        const [rows] = await promisePool.execute(
            `SELECT id, mood, LEFT(content, 200) AS excerpt, word_count, created_at 
             FROM journal_entries 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT ?`,
            [userId, limit]
        );
        return rows;
    }

    // Get single journal entry
    static async findById(id, userId) {
        const [rows] = await promisePool.execute(
            'SELECT * FROM journal_entries WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return rows[0] || null;
    }

    // Update journal entry
    static async update(id, userId, entryData) {
        const { mood, content } = entryData;
        const wordCount = this._wordCount(content);
        
        const [result] = await promisePool.execute(
            'UPDATE journal_entries SET mood = ?, content = ?, word_count = ? WHERE id = ? AND user_id = ?',
            [mood || null, content, wordCount, id, userId]
        );
        
        return result.affectedRows > 0;
    }

    // Delete journal entry
    static async delete(id, userId) {
        const [result] = await promisePool.execute(
            'DELETE FROM journal_entries WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return result.affectedRows > 0;
    }

    // Get journal streak
    static async getStreak(userId) {
        const [rows] = await promisePool.execute(
            `SELECT DATE(created_at) as date 
             FROM journal_entries 
             WHERE user_id = ? 
             ORDER BY created_at DESC`,
            [userId]
        );
        
        if (rows.length === 0) return 0;
        
        let streak = 1;
        let currentDate = new Date(rows[0].date);
        
        for (let i = 1; i < rows.length; i++) {
            const prevDate = new Date(rows[i].date);
            const diffDays = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                streak++;
                currentDate = prevDate;
            } else if (diffDays > 1) {
                break;
            }
        }
        
        return streak;
    }

    // Helper: Count words in text
    static _wordCount(text) {
        if (!text) return 0;
        return text.trim().split(/\s+/).filter(Boolean).length;
    }

    // Helper: Truncate text for preview
    static _truncateText(text, length = 100) {
        if (!text) return '';
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }
}

module.exports = JournalEntry;