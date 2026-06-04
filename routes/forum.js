const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// GET all posts (public)
router.get('/', async (req, res) => {
    try {
        const [posts] = await promisePool.execute(`
            SELECT p.*, 
                   CASE WHEN p.is_anon = 1 THEN 'Anonymous Student' 
                        ELSE CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))
                   END as author,
                   (SELECT COUNT(*) FROM forum_comments WHERE post_id = p.id) as comment_count
            FROM forum_posts p
            LEFT JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        `);
        
        res.json({ success: true, posts });
    } catch (error) {
        console.error('Get posts error:', error);
        res.json({ success: false, message: error.message, posts: [] });
    }
});

// GET single post (public)
router.get('/:id', async (req, res) => {
    try {
        const [posts] = await promisePool.execute(`
            SELECT p.*, 
                   CASE WHEN p.is_anon = 1 THEN 'Anonymous Student' 
                        ELSE CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))
                   END as author
            FROM forum_posts p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `, [req.params.id]);
        
        if (posts.length === 0) {
            return res.json({ success: false, message: 'Post not found' });
        }
        
        res.json({ success: true, post: posts[0] });
    } catch (error) {
        console.error('Get post error:', error);
        res.json({ success: false, message: error.message });
    }
});

// CREATE new post (auth required)
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const { title, content, category, is_anon } = req.body;
        const userId = req.session.user_id;
        
        console.log('Creating post - userId:', userId);
        
        if (!title || !content) {
            return res.json({ success: false, message: 'Title and content are required' });
        }
        
        const excerpt = content.substring(0, 200);
        const anon = is_anon !== undefined ? is_anon : 1;
        
        const [result] = await promisePool.execute(
            `INSERT INTO forum_posts (user_id, title, content, excerpt, category, is_anon) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, title, content, excerpt, category || 'general', anon]
        );
        
        console.log('Post created with ID:', result.insertId);
        
        res.json({ success: true, id: result.insertId, message: 'Post created successfully' });
    } catch (error) {
        console.error('Create post error:', error);
        res.json({ success: false, message: error.message });
    }
});

// UPDATE post (auth required, own posts only)
router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        const { title, content, category } = req.body;
        const userId = req.session.user_id;
        const postId = req.params.id;
        
        const [posts] = await promisePool.execute(
            'SELECT user_id FROM forum_posts WHERE id = ?',
            [postId]
        );
        
        if (posts.length === 0) {
            return res.json({ success: false, message: 'Post not found' });
        }
        
        if (posts[0].user_id !== userId) {
            return res.json({ success: false, message: 'You can only edit your own posts' });
        }
        
        const excerpt = content.substring(0, 200);
        
        await promisePool.execute(
            `UPDATE forum_posts SET title = ?, content = ?, excerpt = ?, category = ? WHERE id = ?`,
            [title, content, excerpt, category, postId]
        );
        
        res.json({ success: true, message: 'Post updated successfully' });
    } catch (error) {
        console.error('Update post error:', error);
        res.json({ success: false, message: error.message });
    }
});

// DELETE post (auth required, own posts only)
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user_id;
        const postId = req.params.id;
        
        const [posts] = await promisePool.execute(
            'SELECT user_id FROM forum_posts WHERE id = ?',
            [postId]
        );
        
        if (posts.length === 0) {
            return res.json({ success: false, message: 'Post not found' });
        }
        
        if (posts[0].user_id !== userId) {
            return res.json({ success: false, message: 'You can only delete your own posts' });
        }
        
        await promisePool.execute('DELETE FROM forum_comments WHERE post_id = ?', [postId]);
        await promisePool.execute('DELETE FROM forum_likes WHERE post_id = ?', [postId]);
        await promisePool.execute('DELETE FROM forum_posts WHERE id = ?', [postId]);
        
        res.json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Delete post error:', error);
        res.json({ success: false, message: error.message });
    }
});

// LIKE/UNLIKE post (auth required)
router.post('/:id/like', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user_id;
        const postId = req.params.id;
        
        const [existing] = await promisePool.execute(
            'SELECT * FROM forum_likes WHERE post_id = ? AND user_id = ?',
            [postId, userId]
        );
        
        if (existing.length > 0) {
            await promisePool.execute(
                'DELETE FROM forum_likes WHERE post_id = ? AND user_id = ?',
                [postId, userId]
            );
            await promisePool.execute(
                'UPDATE forum_posts SET likes = likes - 1 WHERE id = ?',
                [postId]
            );
            res.json({ success: true, liked: false });
        } else {
            await promisePool.execute(
                'INSERT INTO forum_likes (post_id, user_id) VALUES (?, ?)',
                [postId, userId]
            );
            await promisePool.execute(
                'UPDATE forum_posts SET likes = likes + 1 WHERE id = ?',
                [postId]
            );
            res.json({ success: true, liked: true });
        }
    } catch (error) {
        console.error('Like post error:', error);
        res.json({ success: false, message: error.message });
    }
});

// GET comments for a post (public)
router.get('/:id/comments', async (req, res) => {
    try {
        const postId = req.params.id;
        
        const [comments] = await promisePool.execute(`
            SELECT c.*, 
                   CASE WHEN u.is_anonymous = 1 THEN 'Anonymous Student' 
                        ELSE CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))
                   END as author
            FROM forum_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `, [postId]);
        
        res.json({ success: true, comments });
    } catch (error) {
        console.error('Get comments error:', error);
        res.json({ success: false, message: error.message, comments: [] });
    }
});

// ADD comment to post (auth required)
router.post('/:id/comments', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user_id;
        const postId = req.params.id;
        const { content } = req.body;
        
        if (!content) {
            return res.json({ success: false, message: 'Comment content is required' });
        }
        
        const [result] = await promisePool.execute(
            'INSERT INTO forum_comments (post_id, user_id, content) VALUES (?, ?, ?)',
            [postId, userId, content]
        );
        
        res.json({ success: true, id: result.insertId, message: 'Comment added successfully' });
    } catch (error) {
        console.error('Add comment error:', error);
        res.json({ success: false, message: error.message });
    }
});

module.exports = router;
