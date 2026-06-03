const { promisePool } = require('../config/database');

class User {
    static async findByEmail(email) {
        const [rows] = await promisePool.execute(
            'SELECT id, first_name, last_name, email, password_hash, university, is_anonymous FROM users WHERE email = ?',
            [email]
        );
        return rows[0] || null;
    }

    static async findById(id) {
        const [rows] = await promisePool.execute(
            'SELECT id, first_name, last_name, email, university, is_anonymous FROM users WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    }

    static async create(userData) {
        const { first_name, last_name, email, password_hash, university, is_anonymous } = userData;
        
        const [result] = await promisePool.execute(
            `INSERT INTO users (first_name, last_name, email, password_hash, university, is_anonymous) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [first_name || null, last_name || null, email, password_hash, university || null, is_anonymous || 0]
        );
        
        return result.insertId;
    }

    static async updateProfile(id, profileData) {
        const { first_name, last_name, email, university, year_of_study } = profileData;
        
        const [result] = await promisePool.execute(
            `UPDATE users SET first_name = ?, last_name = ?, email = ?, university = ?, year_of_study = ? WHERE id = ?`,
            [first_name, last_name, email, university, year_of_study, id]
        );
        
        return result.affectedRows > 0;
    }

    static async updatePassword(id, hashedPassword) {
        const [result] = await promisePool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [hashedPassword, id]
        );
        return result.affectedRows > 0;
    }

    static async deleteUser(id) {
        // Delete all related data before deleting user
        await promisePool.execute('DELETE FROM user_settings WHERE user_id = ?', [id]);
        await promisePool.execute('DELETE FROM mood_logs WHERE user_id = ?', [id]);
        await promisePool.execute('DELETE FROM journal_entries WHERE user_id = ?', [id]);
        await promisePool.execute('DELETE FROM bookings WHERE user_id = ?', [id]);
        await promisePool.execute('DELETE FROM forum_likes WHERE user_id = ?', [id]);
        await promisePool.execute('DELETE FROM forum_comments WHERE user_id = ?', [id]);
        await promisePool.execute('DELETE FROM forum_posts WHERE user_id = ?', [id]);
        await promisePool.execute('DELETE FROM password_otp WHERE user_id = ?', [id]);
        await promisePool.execute('DELETE FROM users WHERE id = ?', [id]);
        return true;
    }

    static async verifyPassword(userId, plainPassword) {
        const [rows] = await promisePool.execute(
            'SELECT password_hash FROM users WHERE id = ?',
            [userId]
        );
        
        if (rows.length === 0) return false;
        const bcrypt = require('bcryptjs');
        return await bcrypt.compare(plainPassword, rows[0].password_hash);
    }
}

module.exports = User;
