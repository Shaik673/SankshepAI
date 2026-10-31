const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter, otpResendLimiter } = require('../middleware/rateLimiter');

// Public Auth Endpoints
router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);
router.post('/verify-email', authLimiter, authController.verifyEmail);
router.post('/resend-otp', otpResendLimiter, authController.resendOtp);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Social OAuth Routes
router.get('/google', (req, res) => authController.googleAuth(req, res));
router.get('/google/callback', (req, res) => authController.googleCallback(req, res));
router.get('/github', (req, res) => authController.githubAuth(req, res));
router.get('/github/callback', (req, res) => authController.githubCallback(req, res));
router.get('/linkedin', (req, res) => authController.linkedinAuth(req, res));
router.get('/linkedin/callback', (req, res) => authController.linkedinCallback(req, res));

// Authenticated Endpoints
router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;
