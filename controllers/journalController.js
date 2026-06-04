const { promisePool } = require('../config/database');

// Create journal entry
const createJournalEntry = async (req, res) => {
    try {
        const { mood, content } = req.body;
        const userId = req.session.user_id;

        if (!content) {
            return res.json({ success: false, message: 'Journal content cannot be empty' });
        }

        const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
        const excerpt = content.substring(0, 200);

        const [result] = await promisePool.execute(
            `INSERT INTO journal_entries (user_id, mood, content, word_count) 
             VALUES (?, ?, ?, ?)`,
            [userId, mood || 'okay', content, wordCount]
        );

        res.json({ 
            success: true, 
            message: 'Journal entry saved successfully',
            id: result.insertId,
            word_count: wordCount
        });
    } catch (error) {
        console.error('Create journal entry error:', error);
        res.json({ success: false, message: 'Failed to save journal entry' });
    }
};

// Get all journal entries
const getJournalEntries = async (req, res) => {
    try {
        const userId = req.session.user_id;

        const [entries] = await promisePool.execute(
            `SELECT id, mood, LEFT(content, 200) as excerpt, word_count, created_at 
             FROM journal_entries 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [userId]
        );

        res.json({ success: true, entries });
    } catch (error) {
        console.error('Get journal entries error:', error);
        res.json({ success: false, entries: [] });
    }
};

// Get journal streak
const getJournalStreak = async (req, res) => {
    try {
        const userId = req.session.user_id;

        const [rows] = await promisePool.execute(
            `SELECT DISTINCT DATE(created_at) as date 
             FROM journal_entries 
             WHERE user_id = ? 
             ORDER BY date DESC`,
            [userId]
        );

        if (rows.length === 0) {
            return res.json({ success: true, streak: 0 });
        }

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

        res.json({ success: true, streak });
    } catch (error) {
        console.error('Get journal streak error:', error);
        res.json({ success: true, streak: 0 });
    }
};

// Get single journal entry
const getJournalEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user_id;

        const [entries] = await promisePool.execute(
            'SELECT * FROM journal_entries WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (entries.length === 0) {
            return res.json({ success: false, message: 'Entry not found' });
        }

        res.json({ success: true, entry: entries[0] });
    } catch (error) {
        console.error('Get journal entry error:', error);
        res.json({ success: false, message: 'Failed to retrieve entry' });
    }
};

// Update journal entry
const updateJournalEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { mood, content } = req.body;
        const userId = req.session.user_id;
        const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

        const [result] = await promisePool.execute(
            'UPDATE journal_entries SET mood = ?, content = ?, word_count = ? WHERE id = ? AND user_id = ?',
            [mood || 'okay', content, wordCount, id, userId]
        );

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Entry updated successfully' });
        } else {
            res.json({ success: false, message: 'Update failed' });
        }
    } catch (error) {
        console.error('Update journal entry error:', error);
        res.json({ success: false, message: 'Failed to update entry' });
    }
};

// Delete journal entry
const deleteJournalEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user_id;

        const [result] = await promisePool.execute(
            'DELETE FROM journal_entries WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Entry deleted successfully' });
        } else {
            res.json({ success: false, message: 'Delete failed' });
        }
    } catch (error) {
        console.error('Delete journal entry error:', error);
        res.json({ success: false, message: 'Failed to delete entry' });
    }
};

// Analyze sentiment (AI feature)
const analyzeSentiment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user_id;

        const [entries] = await promisePool.execute(
            'SELECT content FROM journal_entries WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (entries.length === 0) {
            return res.json({ success: false, message: 'Entry not found' });
        }

        const content = entries[0].content.toLowerCase();
        
        // Simple sentiment analysis
        const distressKeywords = ['suicide', 'kill myself', 'depressed', 'anxious', 'hopeless', 'overwhelmed', 'panic'];
        const positiveKeywords = ['happy', 'grateful', 'excited', 'proud', 'hopeful', 'better', 'improving'];
        
        const distressCount = distressKeywords.filter(k => content.includes(k)).length;
        const positiveCount = positiveKeywords.filter(k => content.includes(k)).length;
        
        const sentimentScore = (positiveCount - distressCount) * 2;
        let sentiment = 'neutral';
        if (sentimentScore <= -4) sentiment = 'very_negative';
        else if (sentimentScore <= -2) sentiment = 'negative';
        else if (sentimentScore >= 4) sentiment = 'very_positive';
        else if (sentimentScore >= 2) sentiment = 'positive';
        
        const needsSupport = distressCount > 0;

        res.json({
            success: true,
            analysis: {
                sentiment,
                sentimentScore,
                distressCount,
                positiveCount,
                needsSupport,
                message: needsSupport ? 'We notice you may be struggling. Remember, help is available.' : null
            }
        });
    } catch (error) {
        console.error('Analyze sentiment error:', error);
        res.json({ success: false, message: 'Analysis failed' });
    }
};

// Get insights and milestones
const getInsights = async (req, res) => {
    try {
        const userId = req.session.user_id;

        const [entries] = await promisePool.execute(
            'SELECT COUNT(*) as total, AVG(word_count) as avg_words FROM journal_entries WHERE user_id = ?',
            [userId]
        );
        
        const [streak] = await promisePool.execute(
            'SELECT COUNT(DISTINCT DATE(created_at)) as streak FROM journal_entries WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
            [userId]
        );

        const total = entries[0]?.total || 0;
        let milestone = null;
        
        if (total >= 50) milestone = 'Journaling Master - 50 entries! 🏆';
        else if (total >= 25) milestone = 'Dedicated Writer - 25 entries! 🌟';
        else if (total >= 10) milestone = 'Consistent Journaler - 10 entries! ✨';
        else if (total >= 5) milestone = 'Getting Started - 5 entries! 💪';
        else if (total === 1) milestone = 'First Entry! Welcome! 🎉';

        res.json({
            success: true,
            insights: {
                totalEntries: total,
                averageWords: Math.round(entries[0]?.avg_words || 0),
                streak: streak[0]?.streak || 0,
                milestone
            }
        });
    } catch (error) {
        console.error('Get insights error:', error);
        res.json({ success: false, message: 'Failed to get insights' });
    }
};

// Check milestone
const checkMilestone = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user_id;

        const [entries] = await promisePool.execute(
            'SELECT COUNT(*) as total FROM journal_entries WHERE user_id = ?',
            [userId]
        );
        
        const total = entries[0]?.total || 0;
        let message = null;
        
        if (total === 5) message = '🎉 Milestone reached! You\'ve written 5 journal entries!';
        else if (total === 10) message = '🏆 Amazing! 10 journal entries completed!';
        else if (total === 25) message = '🌟 Incredible! You\'ve reached 25 journal entries!';
        else if (total === 50) message = '💪 Legendary! 50 journal entries! You\'re a journaling master!';

        res.json({ success: true, milestone: { total, message } });
    } catch (error) {
        console.error('Check milestone error:', error);
        res.json({ success: false, message: 'Failed to check milestone' });
    }
};

module.exports = {
    createJournalEntry,
    getJournalEntries,
    getJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    getJournalStreak,
    analyzeSentiment,
    getInsights,
    checkMilestone
};
