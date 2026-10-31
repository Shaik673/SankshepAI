const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const { authenticate } = require('../middleware/auth');
const requireVerified = require('../middleware/requireVerified');

// All onboarding endpoints require authenticated and email-verified user
router.use(authenticate, requireVerified);

router.get('/progress', onboardingController.getProgress);
router.put('/step/:step', onboardingController.saveStep);
router.post('/complete', onboardingController.complete);

module.exports = router;
