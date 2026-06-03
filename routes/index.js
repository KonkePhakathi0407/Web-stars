const express = require('express');
const router = express.Router();

// Import all admin route modules
const adminAuth = require('./admin/auth');
const adminAdmins = require('./admin/admins');
const adminCrisis = require('./admin/crisis');
const adminSettings = require('./admin/settings');
const adminDashboard = require('./admin/dashboard');
const adminAudit = require('./admin/audit');
const adminFlagged = require('./admin/flagged');

// Mount routes with /api prefix
router.use('/admin/auth', adminAuth);
router.use('/admin/admins', adminAdmins);
router.use('/admin/crisis', adminCrisis);
router.use('/admin/settings', adminSettings);
router.use('/admin/dashboard', adminDashboard);
router.use('/admin/audit', adminAudit);
router.use('/admin/flagged', adminFlagged);

module.exports = router;