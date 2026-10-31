const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const requireVerified = require('../middleware/requireVerified');
const requireRole = require('../middleware/requireRole');

// Protect all admin routes: must be authenticated, verified, and possess 'admin' role
router.use(authenticate, requireVerified, requireRole('admin'));

router.get('/overview', adminController.getOverview);
router.get('/datasets', adminController.getDatasets);
router.post('/datasets', adminController.addDatasetItem);
router.get('/system-health', adminController.getSystemHealth);
router.get('/users', adminController.getUsers);
router.patch('/users/:id/role', adminController.updateUserRole);

module.exports = router;

