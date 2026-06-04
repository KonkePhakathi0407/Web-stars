const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/database');
const { isAdminAuthenticated, isPlatformAdmin } = require('../../middleware/adminAuth');

// ============================================
// GET /api/admin/settings
// Get all platform settings
// ============================================
router.get('/', isAdminAuthenticated, async (req, res) => {
    try {
        const [settings] = await promisePool.query(
            'SELECT * FROM platform_settings ORDER BY setting_key'
        );

        // Convert to key-value object
        const settingsObj = {};
        settings.forEach(setting => {
            let value = setting.setting_value;
            if (setting.setting_type === 'boolean') {
                value = value === 'true';
            } else if (setting.setting_type === 'number') {
                value = parseInt(value);
            }
            settingsObj[setting.setting_key] = value;
        });

        res.json({
            success: true,
            settings: settingsObj,
            settingsList: settings
        });

    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// GET /api/admin/settings/:key
// Get single setting by key
// ============================================
router.get('/:key', isAdminAuthenticated, async (req, res) => {
    try {
        const [settings] = await promisePool.query(
            'SELECT * FROM platform_settings WHERE setting_key = ?',
            [req.params.key]
        );

        if (settings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        let value = settings[0].setting_value;
        if (settings[0].setting_type === 'boolean') {
            value = value === 'true';
        } else if (settings[0].setting_type === 'number') {
            value = parseInt(value);
        }

        res.json({
            success: true,
            setting: {
                key: settings[0].setting_key,
                value: value,
                type: settings[0].setting_type,
                description: settings[0].description
            }
        });

    } catch (error) {
        console.error('Get setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// POST /api/admin/settings
// Create new setting (Platform Admin only)
// ============================================
router.post('/', isAdminAuthenticated, isPlatformAdmin, async (req, res) => {
    try {
        const { setting_key, setting_value, setting_type, description } = req.body;

        if (!setting_key) {
            return res.status(400).json({
                success: false,
                message: 'Setting key is required'
            });
        }

        // Check if setting already exists
        const [existing] = await promisePool.query(
            'SELECT id FROM platform_settings WHERE setting_key = ?',
            [setting_key]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Setting already exists'
            });
        }

        await promisePool.query(
            `INSERT INTO platform_settings (setting_key, setting_value, setting_type, description, updated_by) 
             VALUES (?, ?, ?, ?, ?)`,
            [setting_key, setting_value || '', setting_type || 'text', description || null, req.session.adminId]
        );

        // Audit log
        await promisePool.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, new_value, ip_address) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.session.adminId, 'CREATE_SETTING', 'setting', setting_key, JSON.stringify(req.body), req.ip]
        );

        res.status(201).json({
            success: true,
            message: 'Setting created successfully'
        });

    } catch (error) {
        console.error('Create setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// PUT /api/admin/settings/:key
// Update setting (Platform Admin only)
// ============================================
router.put('/:key', isAdminAuthenticated, isPlatformAdmin, async (req, res) => {
    try {
        const { value } = req.body;
        const settingKey = req.params.key;

        // Get old data for audit
        const [oldSetting] = await promisePool.query(
            'SELECT * FROM platform_settings WHERE setting_key = ?',
            [settingKey]
        );

        if (oldSetting.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        await promisePool.query(
            'UPDATE platform_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?',
            [value, req.session.adminId, settingKey]
        );

        // Audit log
        await promisePool.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, old_value, new_value, ip_address) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.session.adminId, 'UPDATE_SETTING', 'setting', settingKey, JSON.stringify(oldSetting[0]), JSON.stringify({ value }), req.ip]
        );

        res.json({
            success: true,
            message: 'Setting updated successfully'
        });

    } catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// DELETE /api/admin/settings/:key
// Delete setting (Platform Admin only)
// ============================================
router.delete('/:key', isAdminAuthenticated, isPlatformAdmin, async (req, res) => {
    try {
        const settingKey = req.params.key;

        // Get old data for audit
        const [oldSetting] = await promisePool.query(
            'SELECT * FROM platform_settings WHERE setting_key = ?',
            [settingKey]
        );

        if (oldSetting.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        await promisePool.query('DELETE FROM platform_settings WHERE setting_key = ?', [settingKey]);

        // Audit log
        await promisePool.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, old_value, ip_address) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.session.adminId, 'DELETE_SETTING', 'setting', settingKey, JSON.stringify(oldSetting[0]), req.ip]
        );

        res.json({
            success: true,
            message: 'Setting deleted successfully'
        });

    } catch (error) {
        console.error('Delete setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;