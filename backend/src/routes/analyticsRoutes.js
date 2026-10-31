const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');
const requireVerified = require('../middleware/requireVerified');

router.use(authenticate, requireVerified);

router.get('/dashboard', analyticsController.getDashboard);
router.get('/activity', analyticsController.getActivity);
router.get('/methods', analyticsController.getMethodStats);

module.exports = router;
