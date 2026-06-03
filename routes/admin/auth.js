const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { promisePool } = require('../../config/database');  // ← FIXED: ../../ not ../
const { isAdminAuthenticated } = require('../../middleware/adminAuth');  // ← Also fix this path if needed

// Admin login route
router.post('/login', async (req, res) => {
    console.log('🔐 Admin login attempt for:', req.body.email);
    
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password required' 
            });
        }
        
        // Get admin from database
        const [admins] = await promisePool.query(
            'SELECT * FROM admin_users WHERE email = ? AND is_active = 1',
            [email]
        );
        
        console.log('📊 Found admins:', admins.length);
        
        if (admins.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }
        
        const admin = admins[0];
        
        // Compare password
        const isValid = await bcrypt.compare(password, admin.password_hash);
        
        console.log('🔑 Password valid:', isValid);
        
        if (!isValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }
        
        // Set session
        req.session.adminId = admin.id;
        
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Session error — please try again' 
                });
            }

            console.log('✅ Session saved, adminId:', req.session.adminId);

            // Return admin data (without password)
            const { password_hash, ...adminData } = admin;

            console.log('✅ Admin login successful for:', email);

            res.json({
                success: true,
                message: 'Login successful',
                admin: adminData
            });
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error: ' + error.message 
        });
    }
});

// Get current admin (for session check)
router.get('/me', async (req, res) => {
    console.log('🔍 Session check - adminId:', req.session.adminId);
    
    if (!req.session.adminId) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not authenticated' 
        });
    }
    
    try {
        const [admins] = await promisePool.query(
            'SELECT id, username, email, first_name, last_name, role FROM admin_users WHERE id = ?',
            [req.session.adminId]
        );
        
        if (admins.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Admin not found' 
            });
        }
        
        res.json({ success: true, admin: admins[0] });
    } catch (error) {
        console.error('Get admin error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true, message: 'Logged out' });
    });
});

// Signup route (create new admin)
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password, first_name, last_name, role, institution } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }
        
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }
        
        // Check if email exists
        const [existing] = await promisePool.query('SELECT id FROM admin_users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Email already exists' });
        }
        
        // Check if username exists (if provided)
        if (username) {
            const [existingUsername] = await promisePool.query('SELECT id FROM admin_users WHERE username = ?', [username]);
            if (existingUsername.length > 0) {
                return res.status(409).json({ success: false, message: 'Username already exists' });
            }
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const finalUsername = username || email.split('@')[0];
        
        // Insert admin
        const [result] = await promisePool.query(
            `INSERT INTO admin_users (username, email, password_hash, first_name, last_name, role, institution, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [finalUsername, email, hashedPassword, first_name || null, last_name || null, role || 'platform_admin', institution || null]
        );
        
        console.log(`✅ Admin created: ${email}`);
        
        res.json({ 
            success: true, 
            message: 'Admin account created successfully',
            admin_id: result.insertId
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
