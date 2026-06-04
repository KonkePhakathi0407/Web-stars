const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/database');
const { isAdminAuthenticated, isSuperAdmin } = require('../../middleware/adminAuth');

// ============================================
// GET /api/admin/audit
// Get audit logs with filters
// ============================================
router.get('/', isAdminAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const { limit = 100, offset = 0, admin_id, action, start_date, end_date } = req.query;

        let query = `
            SELECT al.*, a.username, a.email, a.first_name, a.last_name
            FROM audit_logs al
            LEFT JOIN admins a ON al.admin_id = a.id
            WHERE 1=1
        `;
        const params = [];

        if (admin_id) {
            query += ' AND al.admin_id = ?';
            params.push(admin_id);
        }

        if (action) {
            query += ' AND al.action = ?';
            params.push(action);
        }

        if (start_date) {
            query += ' AND DATE(al.created_at) >= ?';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND DATE(al.created_at) <= ?';
            params.push(end_date);
        }

        query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [logs] = await promisePool.query(query, params);

        // Get unique actions for filter dropdown
        const [actions] = await promisePool.query(
            'SELECT DISTINCT action FROM audit_logs ORDER BY action'
        );

        // Get total count
        const [total] = await promisePool.query('SELECT COUNT(*) as count FROM audit_logs');

        res.json({
            success: true,
            logs,
            actions: actions.map(a => a.action),
            total: total[0].count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// GET /api/admin/audit/entity/:type/:id
// Get audit logs for specific entity
// ============================================
router.get('/entity/:type/:id', isAdminAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const { type, id } = req.params;

        const [logs] = await promisePool.query(
            `SELECT al.*, a.username, a.email
             FROM audit_logs al
             LEFT JOIN admins a ON al.admin_id = a.id
             WHERE al.entity_type = ? AND al.entity_id = ?
             ORDER BY al.created_at DESC`,
            [type, id]
        );

        res.json({
            success: true,
            logs
        });

    } catch (error) {
        console.error('Get entity audit error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// GET /api/admin/audit/export/csv
// Export audit logs as CSV
// ============================================
router.get('/export/csv', isAdminAuthenticated, isSuperAdmin, async (req, res) => {
    try {
        const [logs] = await promisePool.query(
            `SELECT al.id, al.admin_id, a.username, a.email, al.action, al.entity_type, 
                    al.entity_id, al.old_value, al.new_value, al.ip_address, al.created_at
             FROM audit_logs al
             LEFT JOIN admins a ON al.admin_id = a.id
             ORDER BY al.created_at DESC
             LIMIT 5000`
        );

        // CSV headers
        const csvRows = [
            ['ID', 'Admin ID', 'Username', 'Email', 'Action', 'Entity Type', 'Entity ID', 'Old Value', 'New Value', 'IP Address', 'Timestamp']
        ];

        // Add data rows
        logs.forEach(log => {
            csvRows.push([
                log.id,
                log.admin_id || '',
                log.username || '',
                log.email || '',
                log.action,
                log.entity_type || '',
                log.entity_id || '',
                (log.old_value || '').replace(/,/g, ';'),
                (log.new_value || '').replace(/,/g, ';'),
                log.ip_address || '',
                log.created_at
            ]);
        });

        // Create CSV content
        const csvContent = csvRows.map(row => row.join(',')).join('\n');

        // Set response headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${Date.now()}.csv`);

        res.send(csvContent);

    } catch (error) {
        console.error('Export audit error:', error);
        res.status(500).json({
            success: false,
            message: 'Export failed'
        });
    }
});

module.exports = router;