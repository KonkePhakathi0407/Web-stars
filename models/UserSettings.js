const { promisePool } = require('../config/database');

class UserSettings {
    static async findByUserId(userId) {
        const [rows] = await promisePool.execute(
            `SELECT u.id, u.first_name, u.last_name, u.email, u.university, u.year_of_study, u.is_anonymous,
                    s.theme, s.notif_email, s.notif_push, s.notif_forum
             FROM users u
             LEFT JOIN user_settings s ON s.user_id = u.id
             WHERE u.id = ?`,
            [userId]
        );
        return rows[0] || null;
    }

    static async updateSettings(userId, settingsData) {
        const { theme, notif_email, notif_push, notif_forum } = settingsData;
        
        const [result] = await promisePool.execute(
            `INSERT INTO user_settings (user_id, theme, notif_email, notif_push, notif_forum) 
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
                theme = VALUES(theme),
                notif_email = VALUES(notif_email),
                notif_push = VALUES(notif_push),
                notif_forum = VALUES(notif_forum)`,
            [userId, theme || 'light', notif_email || 0, notif_push || 0, notif_forum || 0]
        );
        
        return result.affectedRows > 0;
    }

    static async updateTheme(userId, theme) {
        const [result] = await promisePool.execute(
            `INSERT INTO user_settings (user_id, theme) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE theme = VALUES(theme)`,
            [userId, theme]
        );
        return result.affectedRows > 0;
    }
}

module.exports = UserSettings;