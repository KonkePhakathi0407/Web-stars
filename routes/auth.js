const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');
const { sendVerificationCode, sendPasswordChangeOTP } = require('../utils/email');
const authController = require('../controllers/authController');

// ── Auth routes ───────────────────────────────────────────────────────────────
router.post('/signup',   authController.signup);
router.post('/signin',   authController.signin);
router.post('/signout',  authController.signout);
router.get('/me',        authController.getCurrentUser);

// ── Request password-change OTP ───────────────────────────────────────────────
router.post('/request-password-change', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const [users] = await promisePool.execute(
            'SELECT id, first_name FROM users WHERE email = ?',
            [email]
        );

        // Generic response — prevents email enumeration
        const genericOk = {
            success: true,
            message: 'If an account with this email exists, a verification code has been sent.'
        };

        if (users.length === 0) return res.json(genericOk);

        const user = users[0];
        const otpCode  = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        await promisePool.execute(
            'DELETE FROM password_otp WHERE user_id = ? AND is_used = 0',
            [user.id]
        );
        await promisePool.execute(
            'INSERT INTO password_otp (user_id, otp_code, expires_at) VALUES (?, ?, ?)',
            [user.id, otpCode, expiresAt]
        );

        await sendPasswordChangeOTP(email, otpCode, user.first_name);

        res.json(genericOk);
    } catch (error) {
        console.error('Request password change error:', error);
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
    }
});

// ── Verify OTP and change password ───────────────────────────────────────────
router.post('/verify-otp-change-password', async (req, res) => {
    try {
        const { email, otpCode, newPassword } = req.body;

        if (!email || !otpCode || !newPassword) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }
        if (!/[A-Z]/.test(newPassword)) {
            return res.status(400).json({ success: false, message: 'Password must include at least one uppercase letter' });
        }
        if (!/[0-9]/.test(newPassword)) {
            return res.status(400).json({ success: false, message: 'Password must include at least one number' });
        }
        if (!/[^A-Za-z0-9]/.test(newPassword)) {
            return res.status(400).json({ success: false, message: 'Password must include at least one special character' });
        }

        const [users] = await promisePool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        if (users.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid request' });
        }

        const userId = users[0].id;

        const [otps] = await promisePool.execute(
            'SELECT id FROM password_otp WHERE user_id = ? AND otp_code = ? AND expires_at > NOW() AND is_used = 0',
            [userId, otpCode]
        );
        if (otps.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification code. Please request a new one.'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await promisePool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [hashedPassword, userId]
        );
        await promisePool.execute(
            'UPDATE password_otp SET is_used = 1 WHERE id = ?',
            [otps[0].id]
        );
        await promisePool.execute(
            'DELETE FROM password_otp WHERE user_id = ? AND is_used = 0',
            [userId]
        );

        res.json({ success: true, message: 'Password changed successfully! You can now sign in with your new password.' });
    } catch (error) {
        console.error('Verify OTP change password error:', error);
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
    }
});

// ── Send signup verification code ─────────────────────────────────────────────
router.post('/send-code', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Only send to accounts that actually exist (just registered)
        const [users] = await promisePool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        if (users.length === 0) {
            return res.status(400).json({ success: false, message: 'Account not found' });
        }

        const code      = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 min

        await promisePool.execute('DELETE FROM verification_codes WHERE email = ?', [email]);
        await promisePool.execute(
            'INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)',
            [email, code, expiresAt]
        );

        // Use the correct signup verification email — NOT the password-change one
        const emailSent = await sendVerificationCode(email, code);

        if (emailSent) {
            res.json({ success: true, message: 'Verification code sent' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to send email. Please try again.' });
        }
    } catch (error) {
        console.error('Send code error:', error);
        res.status(500).json({ success: false, message: 'Something went wrong' });
    }
});

// ── Verify signup code ────────────────────────────────────────────────────────
router.post('/verify-code', async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ success: false, message: 'Email and code are required' });
        }
        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({ success: false, message: 'Code must be a 6-digit number' });
        }

        const [rows] = await promisePool.execute(
            'SELECT id FROM verification_codes WHERE email = ? AND code = ? AND expires_at > NOW()',
            [email, code]
        );

        if (rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or expired code' });
        }

        await promisePool.execute('DELETE FROM verification_codes WHERE email = ?', [email]);

        // Mark account as verified
        await promisePool.execute(
            'UPDATE users SET is_verified = 1 WHERE email = ?',
            [email]
        );

        // Create session so user is logged in immediately after verifying
        const [users] = await promisePool.execute(
            'SELECT id, first_name, last_name, email, university, is_anonymous, role FROM users WHERE email = ?',
            [email]
        );

        if (users.length > 0) {
            req.session.user_id    = users[0].id;
            req.session.user_email = users[0].email;
            await new Promise((resolve, reject) => {
                req.session.save(err => err ? reject(err) : resolve());
            });
            return res.json({ success: true, message: 'Email verified successfully', user: users[0] });
        }

        return res.json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
        console.error('Verify code error:', error);
        res.status(500).json({ success: false, message: 'Something went wrong' });
    }
});

// ── Cancel signup — delete unverified account only ───────────────────────────
router.post('/cancel-signup', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) return res.status(400).json({ success: false });

        // Only delete accounts that are NOT yet verified — prevents misuse
        await promisePool.execute(
            'DELETE FROM users WHERE email = ? AND (is_verified = 0 OR is_verified IS NULL)',
            [email]
        );
        await promisePool.execute('DELETE FROM verification_codes WHERE email = ?', [email]);

        res.json({ success: true });
    } catch (error) {
        console.error('Cancel signup error:', error);
        res.status(500).json({ success: false });
    }
});

module.exports = router;


