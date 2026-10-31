const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const axios = require('axios');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const OnboardingProgress = require('../models/OnboardingProgress');
const EmailVerification = require('../models/EmailVerification');
const PasswordResetToken = require('../models/PasswordResetToken');
const UserSettings = require('../models/UserSettings');
const ActivityHistory = require('../models/ActivityHistory');
const emailService = require('../services/emailService');
const { JWT_SECRET } = require('../middleware/auth');

// Helper to generate 6-digit numeric OTP
const generateNumericOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Helper to sign JWT token
const signToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Helper to attach HTTP-only cookie
const attachCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

class AuthController {
  // ── Signup ────────────────────────────────────────────────────────────────
  async signup(req, res) {
    const { email, password, confirmPassword, fullName, acceptTerms } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (!acceptTerms) {
      return res.status(400).json({ success: false, message: 'You must accept the terms of service.' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      fullName: fullName.trim(),
      emailVerified: false,
      accountStatus: 'pending_verification',
    });

    // Create associated UserProfile, OnboardingProgress, and UserSettings
    await UserProfile.create({
      userId: user._id,
      displayName: fullName.trim(),
    });

    await OnboardingProgress.create({
      userId: user._id,
      identityData: { displayName: fullName.trim() },
    });

    await UserSettings.create({
      userId: user._id,
    });

    // Generate and store OTP
    const otp = generateNumericOtp();
    const otpHash = await bcrypt.hash(otp, 8);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await EmailVerification.deleteMany({ email: normalizedEmail });
    await EmailVerification.create({
      email: normalizedEmail,
      otpHash,
      expiresAt,
    });

    // Dispatch email
    await emailService.sendVerificationOtp(normalizedEmail, otp);

    // Log activity
    await ActivityHistory.create({
      userId: user._id,
      actionType: 'user_signup',
      description: 'Account created with email/password',
      ipAddress: req.ip,
    });

    // Do NOT set cookie until verified
    res.status(201).json({
      success: true,
      message: 'Account created successfully. A 6-digit verification code has been sent to your email.',
      email: normalizedEmail,
      userId: user._id,
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.passwordHash) {
      return res.status(400).json({
        success: false,
        message: 'This account was registered using social login. Please sign in with your social provider.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.accountStatus === 'suspended') {
      return res.status(403).json({ success: false, message: 'Account is suspended.' });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // If user has not verified their email yet, generate and send a fresh OTP to their email inbox
    let devOtp;
    if (!user.emailVerified) {
      const otp = generateNumericOtp();
      const otpHash = await bcrypt.hash(otp, 8);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await EmailVerification.deleteMany({ email: normalizedEmail });
      await EmailVerification.create({
        email: normalizedEmail,
        otpHash,
        expiresAt,
      });

      await emailService.sendVerificationOtp(normalizedEmail, otp);
      if (process.env.NODE_ENV !== 'production') {
        devOtp = otp;
      }
    }

    // Sign session
    const token = signToken(user._id);
    attachCookie(res, token);

    // Fetch profile and onboarding status
    const profile = await UserProfile.findOne({ userId: user._id });
    const onboarding = await OnboardingProgress.findOne({ userId: user._id });

    // Log activity
    await ActivityHistory.create({
      userId: user._id,
      actionType: 'user_login',
      description: 'User logged in',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        emailVerified: user.emailVerified,
        role: user.role,
      },
      profile: profile || {},
      onboardingComplete: onboarding ? onboarding.isCompleted : false,
      devOtp,
    });
  }

  // ── Verify Email OTP ──────────────────────────────────────────────────────
  async verifyEmail(req, res) {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const record = await EmailVerification.findOne({
      email: normalizedEmail,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired or was not requested. Please request a new code.',
      });
    }

    if (record.attempts >= record.maxAttempts) {
      await EmailVerification.deleteOne({ _id: record._id });
      return res.status(429).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new code.',
      });
    }

    const isMatch = await bcrypt.compare(otp.trim(), record.otpHash);
    if (!isMatch) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${record.maxAttempts - record.attempts} attempts remaining.`,
      });
    }

    // Mark user verified
    const user = await User.findOneAndUpdate(
      { email: normalizedEmail },
      { emailVerified: true, accountStatus: 'active' },
      { new: true }
    );

    await EmailVerification.deleteOne({ _id: record._id });

    // Establish authenticated session
    const token = signToken(user._id);
    attachCookie(res, token);

    const profile = await UserProfile.findOne({ userId: user._id });
    const onboarding = await OnboardingProgress.findOne({ userId: user._id });

    await ActivityHistory.create({
      userId: user._id,
      actionType: 'email_verified',
      description: 'Email address successfully verified via OTP',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Email verified successfully!',
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        emailVerified: true,
        role: user.role,
      },
      profile: profile || {},
      onboardingComplete: onboarding ? onboarding.isCompleted : false,
    });
  }

  // ── Resend OTP ────────────────────────────────────────────────────────────
  async resendOtp(req, res) {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Avoid user enumeration
      return res.json({ success: true, message: 'If this email is registered, a new code has been sent.' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified.' });
    }

    const otp = generateNumericOtp();
    const otpHash = await bcrypt.hash(otp, 8);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await EmailVerification.deleteMany({ email: normalizedEmail });
    await EmailVerification.create({
      email: normalizedEmail,
      otpHash,
      expiresAt,
    });

    await emailService.sendVerificationOtp(normalizedEmail, otp);

    res.json({
      success: true,
      message: 'A fresh verification code has been dispatched to your email.',
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  }

  // ── Forgot Password ───────────────────────────────────────────────────────
  async forgotPassword(req, res) {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Always return generic confirmation to protect against account enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, password reset instructions have been dispatched.',
      });
    }

    const otp = generateNumericOtp();
    const tokenHash = await bcrypt.hash(otp, 8);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await PasswordResetToken.deleteMany({ email: normalizedEmail });
    await PasswordResetToken.create({
      email: normalizedEmail,
      tokenHash,
      expiresAt,
    });

    await emailService.sendPasswordResetOtp(normalizedEmail, otp);

    const isDev = process.env.NODE_ENV !== 'production';

    res.json({
      success: true,
      message: 'If an account exists with this email, password reset instructions have been dispatched.',
      ...(isDev && { devOtp: otp }),
    });
  }

  // ── Reset Password ────────────────────────────────────────────────────────
  async resetPassword(req, res) {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const record = await PasswordResetToken.findOne({
      email: normalizedEmail,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired or is invalid. Please request a new reset code.',
      });
    }

    if (record.attempts >= record.maxAttempts) {
      await PasswordResetToken.deleteOne({ _id: record._id });
      return res.status(429).json({ success: false, message: 'Maximum attempts exceeded.' });
    }

    const isMatch = await bcrypt.compare(otp.trim(), record.tokenHash);
    if (!isMatch) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({
        success: false,
        message: `Invalid code. ${record.maxAttempts - record.attempts} attempts remaining.`,
      });
    }

    // Hash and update password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await User.updateOne({ email: normalizedEmail }, { passwordHash });
    await PasswordResetToken.deleteOne({ _id: record._id });

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new credentials.',
    });
  }

  // ── Change Password (Authenticated) ───────────────────────────────────────
  async changePassword(req, res) {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match.' });
    }

    const user = await User.findById(req.user._id);
    if (!user.passwordHash) {
      return res.status(400).json({
        success: false,
        message: 'This account was created via social login and does not have an existing password.',
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully.' });
  }

  // ── Get Current Session (/me) ─────────────────────────────────────────────
  async me(req, res) {
    const user = req.user;
    const profile = await UserProfile.findOne({ userId: user._id });
    const onboarding = await OnboardingProgress.findOne({ userId: user._id });

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        emailVerified: user.emailVerified,
        role: user.role,
      },
      profile: profile || {},
      onboardingComplete: onboarding ? onboarding.isCompleted : false,
    });
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async logout(req, res) {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully.' });
  }

  // ── Helper to complete OAuth Authentication ──────────────────────────────
  async _handleOAuthUser(res, { email, fullName, provider, providerId, avatarUrl }) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    try {
      if (!email) {
        return res.redirect(`${clientUrl}/oauth/callback?error=${encodeURIComponent('No email associated with this account.')}`);
      }

      const normalizedEmail = email.toLowerCase().trim();
      let user = await User.findOne({
        $or: [
          { [`socialProviders.${provider}Id`]: providerId },
          { email: normalizedEmail },
        ],
      });

      if (user) {
        user.socialProviders[`${provider}Id`] = providerId;
        user.emailVerified = true;
        user.accountStatus = 'active';
        user.lastLoginAt = new Date();
        await user.save();
      } else {
        user = await User.create({
          email: normalizedEmail,
          fullName: fullName || normalizedEmail.split('@')[0],
          emailVerified: true,
          accountStatus: 'active',
          role: 'user',
          socialProviders: {
            [`${provider}Id`]: providerId,
          },
          lastLoginAt: new Date(),
        });

        await UserProfile.create({
          userId: user._id,
          displayName: fullName || normalizedEmail.split('@')[0],
          avatarUrl: avatarUrl || null,
        });

        await OnboardingProgress.create({
          userId: user._id,
          identityData: { displayName: fullName || normalizedEmail.split('@')[0] },
          isCompleted: false,
        });

        await UserSettings.create({
          userId: user._id,
        });

        await ActivityHistory.create({
          userId: user._id,
          actionType: 'user_registered',
          description: `Registered account via ${provider} OAuth`,
        });
      }

      const token = signToken(user._id);
      attachCookie(res, token);

      return res.redirect(`${clientUrl}/oauth/callback`);
    } catch (err) {
      console.error(`[AuthController] ${provider} OAuth processing error:`, err.message);
      return res.redirect(`${clientUrl}/oauth/callback?error=${encodeURIComponent('Internal server error during authentication.')}`);
    }
  }

  // ── OAuth Handlers & Callbacks ─────────────────────────────────────────────
  googleAuth(req, res) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    if (!clientId) {
      return res.redirect(`${clientUrl}/oauth/callback?error=${encodeURIComponent('Google OAuth is not configured on this server.')}`);
    }
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;
    const scope = encodeURIComponent('openid email profile');
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=${scope}&prompt=select_account`;
    res.redirect(url);
  }

  async googleCallback(req, res) {
    const { code, error } = req.query;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    if (error || !code) {
      return res.redirect(`${clientUrl}/oauth/callback?error=${encodeURIComponent(error || 'Google authorization was cancelled.')}`);
    }
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const callbackUrl = process.env.GOOGLE_CALLBACK_URL || `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;

      const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      });

      const accessToken = tokenRes.data.access_token;
      const userRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const { sub: providerId, email, name: fullName, picture: avatarUrl } = userRes.data;
      return await this._handleOAuthUser(res, { email, fullName, provider: 'google', providerId, avatarUrl });
    } catch (err) {
      console.error('[GoogleCallback] Token exchange error:', err.response?.data || err.message);
      return res.redirect(`${clientUrl}/oauth/callback?error=${encodeURIComponent('Failed to authenticate with Google.')}`);
    }
  }

  githubAuth(req, res) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    if (!clientId) {
      return res.redirect(`${clientUrl}/oauth/callback?error=${encodeURIComponent('GitHub OAuth is not configured on this server.')}`);
    }
    const callbackUrl = process.env.GITHUB_CALLBACK_URL || `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/github/callback`;
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=user:email`;
    res.redirect(url);
  }

  async githubCallback(req, res) {
    const { code, error } = req.query;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    if (error || !code) {
      return res.redirect(`${clientUrl}/oauth/callback?error=${encodeURIComponent(error || 'GitHub authorization was cancelled.')}`);
    }
    try {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      const callbackUrl = process.env.GITHUB_CALLBACK_URL || `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/github/callback`;

      const tokenRes = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: callbackUrl,
        },
        { headers: { Accept: 'application/json' } }
      );

      const accessToken = tokenRes.data.access_token;
      if (!accessToken) {
        throw new Error(tokenRes.data.error_description || 'No access token received from GitHub');
      }

      const userRes = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'SankshepAI-App' },
      });

      let email = userRes.data.email;
      if (!email) {
        const emailsRes = await axios.get('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'SankshepAI-App' },
        });
        const primary = emailsRes.data.find((e) => e.primary && e.verified) || emailsRes.data[0];
        email = primary?.email;
      }

      const providerId = String(userRes.data.id);
      const fullName = userRes.data.name || userRes.data.login;
      const avatarUrl = userRes.data.avatar_url;

      return await this._handleOAuthUser(res, { email, fullName, provider: 'github', providerId, avatarUrl });
    } catch (err) {
      console.error('[GitHubCallback] Token exchange error:', err.response?.data || err.message);
      return res.redirect(`${clientUrl}/oauth/callback?error=${encodeURIComponent('Failed to authenticate with GitHub.')}`);
    }
  }

  linkedinAuth(req, res) {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    if (!clientId) {
      return res.redirect(`${clientUrl}/oauth/callback?error=${encodeURIComponent('LinkedIn OAuth is not configured on this server.')}`);
    }
    const callbackUrl = process.env.LINKEDIN_CALLBACK_URL || `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/linkedin/callback`;
    const scope = encodeURIComponent('openid profile email');
    const state = crypto.randomBytes(16).toString('hex');
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${scope}&state=${state}`;
    res.redirect(url);
  }

  async linkedinCallback(req, res) {
    const { code, error, error_description } = req.query;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    if (error || !code) {
      return res.redirect(`${clientUrl}/oauth/callback?error=${encodeURIComponent(error_description || error || 'LinkedIn authorization was cancelled.')}`);
    }
    try {
      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
      const callbackUrl = process.env.LINKEDIN_CALLBACK_URL || `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/linkedin/callback`;

      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
      });

      const tokenRes = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        tokenParams.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const accessToken = tokenRes.data.access_token;
      if (!accessToken) {
        throw new Error('No access token received from LinkedIn');
      }

      const userRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const { sub: providerId, email, name: fullName, picture: avatarUrl } = userRes.data;
      return await this._handleOAuthUser(res, { email, fullName, provider: 'linkedin', providerId, avatarUrl });
    } catch (err) {
      console.error('[LinkedInCallback] Token exchange error:', err.response?.data || err.message);
      return res.redirect(`${clientUrl}/oauth/callback?error=${encodeURIComponent('Failed to authenticate with LinkedIn.')}`);
    }
  }
}

module.exports = new AuthController();
