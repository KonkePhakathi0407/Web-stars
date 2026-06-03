const { promisePool } = require('../config/database');
const { truncateText } = require('../utils/helpers');

class ForumPost {
    static async create(userId, postData) {
        const { title, content, category, is_anon } = postData;
        const excerpt = truncateText(content, 100);
        
        const [result] = await promisePool.execute(
            `INSERT INTO forum_posts (user_id, title, content, excerpt, category, is_anon) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, title, content, excerpt, category, is_anon || 1]
        );
        
        return result.insertId;
    }

    static async findAll(page = 1, limit = 20, category = null) {
        const offset = (page - 1) * limit;
        let query = `
            SELECT p.*, 
                   CASE WHEN p.is_anon = 1 THEN 'Anonymous Student' ELSE CONCAT(u.first_name, ' ', u.last_name) END as author,
                   COUNT(DISTINCT c.id) as comment_count
            FROM forum_posts p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN forum_comments c ON p.id = c.post_id
        `;
        const params = [];
        
        if (category && category !== 'all') {
            query += ' WHERE p.category = ?';
            params.push(category);
        }
        
        query += ' GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const [rows] = await promisePool.execute(query, params);
        return rows;
    }

    static async findById(id) {
        const [rows] = await promisePool.execute(
            `SELECT p.*, 
                    CASE WHEN p.is_anon = 1 THEN 'Anonymous Student' ELSE CONCAT(u.first_name, ' ', u.last_name) END as author,
                    u.id as author_id
             FROM forum_posts p
             LEFT JOIN users u ON p.user_id = u.id
             WHERE p.id = ?`,
            [id]
        );
        return rows[0] || null;
    }

    static async update(id, userId, postData) {
        const { title, content, category } = postData;
        const excerpt = truncateText(content, 100);
        
        const [result] = await promisePool.execute(
            'UPDATE forum_posts SET title = ?, content = ?, excerpt = ?, category = ? WHERE id = ? AND user_id = ?',
            [title, content, excerpt, category, id, userId]
        );
        
        return result.affectedRows > 0;
    }

    static async delete(id, userId) {
        // Delete comments first due to foreign key
        await promisePool.execute('DELETE FROM forum_comments WHERE post_id = ?', [id]);
        const [result] = await promisePool.execute(
            'DELETE FROM forum_posts WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return result.affectedRows > 0;
    }

    static async likePost(id, userId) {
        // Check if already liked
        const [existing] = await promisePool.execute(
            'SELECT * FROM forum_likes WHERE post_id = ? AND user_id = ?',
            [id, userId]
        );
        
        if (existing.length > 0) {
            // Unlike
            await promisePool.execute(
                'DELETE FROM forum_likes WHERE post_id = ? AND user_id = ?',
                [id, userId]
            );
            await promisePool.execute(
                'UPDATE forum_posts SET likes = likes - 1 WHERE id = ?',
                [id]
            );
            return { liked: false };
        } else {
            // Like
            await promisePool.execute(
                'INSERT INTO forum_likes (post_id, user_id) VALUES (?, ?)',
                [id, userId]
            );
            await promisePool.execute(
                'UPDATE forum_posts SET likes = likes + 1 WHERE id = ?',
                [id]
            );
            return { liked: true };
        }
    }

    static async addComment(postId, userId, content) {
        const [result] = await promisePool.execute(
            'INSERT INTO forum_comments (post_id, user_id, content) VALUES (?, ?, ?)',
            [postId, userId, content]
        );
        return result.insertId;
    }

    static async getComments(postId) {
        const [rows] = await promisePool.execute(
            `SELECT c.*, 
                    CASE WHEN u.is_anonymous = 1 THEN 'Anonymous Student' ELSE CONCAT(u.first_name, ' ', u.last_name) END as author
             FROM forum_comments c
             LEFT JOIN users u ON c.user_id = u.id
             WHERE c.post_id = ?
             ORDER BY c.created_at ASC`,
            [postId]
        );
        return rows;
    }
}

module.exports = ForumPost;