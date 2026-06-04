// controllers/authController.js
const { promisePool } = require('../config/database');
const bcrypt = require('bcryptjs');

const signup = async (req, res) => {
    try {
        const { first_name, last_name, email, password, university, is_anonymous } = req.body;
        
        console.log('Signup attempt for email:', email);
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }
        
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
        }
        
        // Check if user already exists
        const [existingUsers] = await promisePool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        }
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const [result] = await promisePool.query(
            `INSERT INTO users (first_name, last_name, email, password_hash, university, is_anonymous, role, is_verified) 
             VALUES (?, ?, ?, ?, ?, ?, 'user', 0)`,
            [is_anonymous ? null : (first_name || null), 
             is_anonymous ? null : (last_name || null), 
             email, 
             hashedPassword, 
             university || null, 
             is_anonymous || 0]
        );
        
        if (result.insertId) {
            console.log('User created successfully with ID:', result.insertId);
            res.json({ success: true, message: 'Account created successfully.', user_id: result.insertId });
        } else {
            res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
        }
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Registration failed: ' + error.message });
    }
};

const signin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('Signin attempt for email:', email);
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }
        
        // Find user by email
        const [users] = await promisePool.query(
            'SELECT id, first_name, last_name, email, university, password_hash, is_anonymous, role, is_verified FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            console.log('User not found:', email);
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }
        
        const user = users[0];
        if (!user.is_verified) {
            return res.status(403).json({ success: false, message: 'Please verify your email before signing in.', needs_verification: true, email: user.email });
        }
        
        // Compare password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }
        
        console.log('User signed in successfully:', email);
        
        // Set session
        req.session.user_id = user.id;
        req.session.user_email = user.email;
        
        // Save session before sending response
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ success: false, message: 'Session error' });
            }
            
            // Remove password hash from response
            const { password_hash, ...userData } = user;
            
            res.json({ 
                success: true, 
                message: 'Signed in successfully.',
                user: userData
            });
        });
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ success: false, message: 'Sign in failed. Please try again.' });
    }
};

const signout = async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Logout failed.' });
        }
        res.json({ success: true, message: 'Logged out successfully.' });
    });
};

const getCurrentUser = async (req, res) => {
    try {
        if (!req.session || !req.session.user_id) {
            return res.status(401).json({ success: false, message: 'Not logged in.' });
        }
        
        const [users] = await promisePool.query(
            'SELECT id, first_name, last_name, email, university, is_anonymous, role, created_at FROM users WHERE id = ?',
            [req.session.user_id]
        );
        
        if (users.length > 0) {
            res.json({ success: true, message: 'User retrieved.', user: users[0] });
        } else {
            res.status(404).json({ success: false, message: 'User not found.' });
        }
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ success: false, message: 'Failed to get user.' });
    }
};

module.exports = { signup, signin, signout, getCurrentUser };