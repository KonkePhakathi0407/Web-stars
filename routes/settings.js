const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisePool } = require('../config/database');
const bcrypt = require('bcryptjs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory at:', uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'profile-' + uniqueSuffix + path.extname(file.originalname);
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    const extname = ["jpeg", "jpg", "png", "gif"].includes(ext);
    const mimetype = allowedTypes.includes(file.mimetype);
    
    if (mimetype && extname) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed'));
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user_id) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Not authenticated' });
    }
};

// Get user profile
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const [users] = await promisePool.execute(
            'SELECT id, first_name, last_name, email, university, profile_picture FROM users WHERE id = ?',
            [req.session.user_id]
        );
        
        if (users.length === 0) {
            return res.json({ success: false, message: 'User not found' });
        }
        
        res.json({ success: true, user: users[0] });
    } catch (error) {
        console.error('Get profile error:', error);
        res.json({ success: false, message: 'Failed to get profile' });
    }
});

// Update profile (name, email)
router.put('/profile', isAuthenticated, async (req, res) => {
    try {
        const { first_name, last_name, email } = req.body;
        
        if (!first_name || !last_name || !email) {
            return res.json({ success: false, message: 'All fields are required' });
        }
        
        await promisePool.execute(
            'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?',
            [first_name, last_name, email, req.session.user_id]
        );
        
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.json({ success: false, message: 'Failed to update profile' });
    }
});

// Upload profile picture
router.post('/profile-picture', isAuthenticated, upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, message: 'No file uploaded' });
        }
        
        const picturePath = `/uploads/${req.file.filename}`;
        
        await promisePool.execute(
            'UPDATE users SET profile_picture = ? WHERE id = ?',
            [picturePath, req.session.user_id]
        );
        
        res.json({ success: true, message: 'Profile picture updated', picturePath });
    } catch (error) {
        console.error('Upload profile picture error:', error);
        res.json({ success: false, message: 'Failed to upload picture' });
    }
});

// Change password
router.put('/change-password', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.json({ success: false, message: 'All fields are required' });
        }
        
        if (newPassword !== confirmPassword) {
            return res.json({ success: false, message: 'New passwords do not match' });
        }
        
        if (newPassword.length < 8) {
            return res.json({ success: false, message: 'Password must be at least 8 characters' });
        }
        
        const [users] = await promisePool.execute(
            'SELECT password_hash FROM users WHERE id = ?',
            [req.session.user_id]
        );
        
        if (users.length === 0) {
            return res.json({ success: false, message: 'User not found' });
        }
        
        const isValid = await bcrypt.compare(currentPassword, users[0].password_hash);
        
        if (!isValid) {
            return res.json({ success: false, message: 'Current password is incorrect' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await promisePool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [hashedPassword, req.session.user_id]
        );
        
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.json({ success: false, message: 'Failed to change password' });
    }
});

// Delete account
router.delete('/account', isAuthenticated, async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.json({ success: false, message: 'Password is required' });
        }
        
        const [users] = await promisePool.execute(
            'SELECT password_hash FROM users WHERE id = ?',
            [req.session.user_id]
        );
        
        if (users.length === 0) {
            return res.json({ success: false, message: 'User not found' });
        }
        
        const isValid = await bcrypt.compare(password, users[0].password_hash);
        
        if (!isValid) {
            return res.json({ success: false, message: 'Incorrect password' });
        }
        
        await promisePool.execute('DELETE FROM user_settings WHERE user_id = ?', [req.session.user_id]);
        await promisePool.execute('DELETE FROM mood_logs WHERE user_id = ?', [req.session.user_id]);
        await promisePool.execute('DELETE FROM journal_entries WHERE user_id = ?', [req.session.user_id]);
        await promisePool.execute('DELETE FROM bookings WHERE user_id = ?', [req.session.user_id]);
        await promisePool.execute('DELETE FROM forum_posts WHERE user_id = ?', [req.session.user_id]);
        await promisePool.execute('DELETE FROM forum_comments WHERE user_id = ?', [req.session.user_id]);
        await promisePool.execute('DELETE FROM forum_likes WHERE user_id = ?', [req.session.user_id]);
        await promisePool.execute('DELETE FROM password_otp WHERE user_id = ?', [req.session.user_id]);
        await promisePool.execute('DELETE FROM users WHERE id = ?', [req.session.user_id]);
        
        req.session.destroy();
        
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.json({ success: false, message: 'Failed to delete account' });
    }
});

module.exports = router;