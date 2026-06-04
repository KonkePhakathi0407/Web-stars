const UserSettings = require('../models/UserSettings');
const User = require('../models/User');
const { sendResponse } = require('../utils/helpers');
const bcrypt = require('bcryptjs');

const getProfile = async (req, res) => {
    try {
        const profile = await UserSettings.findByUserId(req.session.user_id);
        sendResponse(res, true, 'Profile retrieved.', { profile });
    } catch (error) {
        console.error('Get profile error:', error);
        sendResponse(res, false, 'Failed to retrieve profile.');
    }
};

const updateProfile = async (req, res) => {
    try {
        const { first_name, last_name, email, university, year_of_study, notif_email, notif_push, notif_forum } = req.body;
        
        await User.updateProfile(req.session.user_id, {
            first_name, last_name, email, university, year_of_study
        });
        
        await UserSettings.updateSettings(req.session.user_id, {
            notif_email, notif_push, notif_forum
        });
        
        sendResponse(res, true, 'Profile updated successfully.');
    } catch (error) {
        console.error('Update profile error:', error);
        sendResponse(res, false, 'Update failed.');
    }
};

const updatePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        
        const isValid = await User.verifyPassword(req.session.user_id, current_password);
        if (!isValid) {
            return sendResponse(res, false, 'Current password is incorrect.');
        }
        
        if (new_password.length < 8) {
            return sendResponse(res, false, 'New password must be at least 8 characters.');
        }
        
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await User.updatePassword(req.session.user_id, hashedPassword);
        
        sendResponse(res, true, 'Password changed successfully.');
    } catch (error) {
        console.error('Update password error:', error);
        sendResponse(res, false, 'Failed to change password.');
    }
};

const updateTheme = async (req, res) => {
    try {
        const { theme } = req.body;
        await UserSettings.updateTheme(req.session.user_id, theme);
        sendResponse(res, true, 'Theme updated.', { theme });
    } catch (error) {
        sendResponse(res, false, 'Failed to update theme.');
    }
};

const deleteAccount = async (req, res) => {
    try {
        const { password } = req.body;
        
        const isValid = await User.verifyPassword(req.session.user_id, password);
        if (!isValid) {
            return sendResponse(res, false, 'Incorrect password.');
        }
        
        await User.deleteUser(req.session.user_id);
        req.session.destroy();
        
        sendResponse(res, true, 'Account deleted successfully.');
    } catch (error) {
        console.error('Delete account error:', error);
        sendResponse(res, false, 'Failed to delete account.');
    }
};

module.exports = {
    getProfile,
    updateProfile,
    updatePassword,
    updateTheme,
    deleteAccount
};