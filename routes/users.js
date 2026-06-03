const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { body } = require('express-validator');
const { promisePool } = require('../config/database');
const bcrypt = require('bcryptjs');

// Helper function to send response
function sendResponse(res, success, message, data = null) {
    res.json({ success, message, ...(data && { ...data }) });
}

// Get current user (me)
router.get('/me', isAuthenticated, async (req, res) => {
    try {
        const [users] = await promisePool.query(
            'SELECT id, first_name, last_name, email, university, profile_picture, is_anonymous, created_at FROM users WHERE id = ?',
            [req.session.user_id]
        );
        
        if (users.length === 0) {
            return sendResponse(res, false, 'User not found');
        }
        
        sendResponse(res, true, 'User retrieved', { user: users[0] });
    } catch (error) {
        console.error('Get user error:', error);
        sendResponse(res, false, 'Failed to get user');
    }
});

// Update user profile
router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        const { first_name, last_name, email, university } = req.body;
        
        // Only allow users to update their own profile
        if (parseInt(req.params.id) !== req.session.user_id) {
            return sendResponse(res, false, 'Unauthorized');
        }
        
        // Check if email is already taken by another user
        const [existing] = await promisePool.query(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, req.session.user_id]
        );
        
        if (existing.length > 0) {
            return sendResponse(res, false, 'Email already in use');
        }
        
        await promisePool.query(
            'UPDATE users SET first_name = ?, last_name = ?, email = ?, university = ? WHERE id = ?',
            [first_name || null, last_name || null, email, university || null, req.session.user_id]
        );
        
        sendResponse(res, true, 'Profile updated successfully');
    } catch (error) {
        console.error('Update profile error:', error);
        sendResponse(res, false, 'Failed to update profile');
    }
});

// Change password
router.put('/:id/password', isAuthenticated, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        
        if (parseInt(req.params.id) !== req.session.user_id) {
            return sendResponse(res, false, 'Unauthorized');
        }
        
        // Get current password hash
        const [users] = await promisePool.query(
            'SELECT password_hash FROM users WHERE id = ?',
            [req.session.user_id]
        );
        
        if (users.length === 0) {
            return sendResponse(res, false, 'User not found');
        }
        
        // Verify current password
        const isValid = await bcrypt.compare(current_password, users[0].password_hash);
        if (!isValid) {
            return sendResponse(res, false, 'Current password is incorrect');
        }
        
        if (new_password.length < 8) {
            return sendResponse(res, false, 'New password must be at least 8 characters');
        }
        
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await promisePool.query(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [hashedPassword, req.session.user_id]
        );
        
        sendResponse(res, true, 'Password changed successfully');
    } catch (error) {
        console.error('Change password error:', error);
        sendResponse(res, false, 'Failed to change password');
    }
});

// Delete user account
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const { password } = req.body;
        
        if (parseInt(req.params.id) !== req.session.user_id) {
            return sendResponse(res, false, 'Unauthorized');
        }
        
        // Get current password hash
        const [users] = await promisePool.query(
            'SELECT password_hash FROM users WHERE id = ?',
            [req.session.user_id]
        );
        
        if (users.length === 0) {
            return sendResponse(res, false, 'User not found');
        }
        
        const isValid = await bcrypt.compare(password, users[0].password_hash);
        if (!isValid) {
            return sendResponse(res, false, 'Incorrect password');
        }
        
        // Delete user (cascade will delete related records)
        await promisePool.query('DELETE FROM users WHERE id = ?', [req.session.user_id]);
        
        req.session.destroy();
        
        sendResponse(res, true, 'Account deleted successfully');
    } catch (error) {
        console.error('Delete account error:', error);
        sendResponse(res, false, 'Failed to delete account');
    }
});

module.exports = router;