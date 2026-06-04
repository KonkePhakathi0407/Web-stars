const ForumPost = require('../models/forumPost');
const { sendResponse } = require('../utils/helpers');

const createPost = async (req, res) => {
    try {
        const { title, content, category, is_anon } = req.body;
        
        if (!title || !content || !category) {
            return sendResponse(res, false, 'Title, content and category are required.');
        }
        
        const id = await ForumPost.create(req.session.user_id, {
            title,
            content,
            category,
            is_anon: is_anon !== undefined ? is_anon : 1
        });
        
        sendResponse(res, true, 'Post created successfully.', { id });
    } catch (error) {
        console.error('Create post error:', error);
        sendResponse(res, false, 'Failed to create post.');
    }
};

const getPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const category = req.query.category || null;
        const limit = 20;
        
        const posts = await ForumPost.findAll(page, limit, category);
        sendResponse(res, true, 'Posts retrieved.', { posts });
    } catch (error) {
        console.error('Get posts error:', error);
        sendResponse(res, false, 'Failed to retrieve posts.');
    }
};

const getPost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await ForumPost.findById(parseInt(id));
        
        if (!post) {
            return sendResponse(res, false, 'Post not found.');
        }
        
        // Get comments for this post
        const comments = await ForumPost.getComments(parseInt(id));
        
        sendResponse(res, true, 'Post retrieved.', { post, comments });
    } catch (error) {
        console.error('Get post error:', error);
        sendResponse(res, false, 'Failed to retrieve post.');
    }
};

const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, category } = req.body;
        
        const updated = await ForumPost.update(parseInt(id), req.session.user_id, {
            title,
            content,
            category
        });
        
        if (updated) {
            sendResponse(res, true, 'Post updated.');
        } else {
            sendResponse(res, false, 'Update failed.');
        }
    } catch (error) {
        console.error('Update post error:', error);
        sendResponse(res, false, 'Update failed.');
    }
};

const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ForumPost.delete(parseInt(id), req.session.user_id);
        
        if (deleted) {
            sendResponse(res, true, 'Post deleted.');
        } else {
            sendResponse(res, false, 'Delete failed.');
        }
    } catch (error) {
        console.error('Delete post error:', error);
        sendResponse(res, false, 'Delete failed.');
    }
};

const likePost = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await ForumPost.likePost(parseInt(id), req.session.user_id);
        
        sendResponse(res, true, result.liked ? 'Post liked.' : 'Post unliked.', { liked: result.liked });
    } catch (error) {
        console.error('Like post error:', error);
        sendResponse(res, false, 'Failed to like/unlike post.');
    }
};

const addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        
        if (!content) {
            return sendResponse(res, false, 'Comment content is required.');
        }
        
        const commentId = await ForumPost.addComment(parseInt(id), req.session.user_id, content);
        
        sendResponse(res, true, 'Comment added.', { comment_id: commentId });
    } catch (error) {
        console.error('Add comment error:', error);
        sendResponse(res, false, 'Failed to add comment.');
    }
};

const getComments = async (req, res) => {
    try {
        const { id } = req.params;
        const comments = await ForumPost.getComments(parseInt(id));
        
        sendResponse(res, true, 'Comments retrieved.', { comments });
    } catch (error) {
        console.error('Get comments error:', error);
        sendResponse(res, false, 'Failed to retrieve comments.');
    }
};

module.exports = {
    createPost,
    getPosts,
    getPost,
    updatePost,
    deletePost,
    likePost,
    addComment,
    getComments
};