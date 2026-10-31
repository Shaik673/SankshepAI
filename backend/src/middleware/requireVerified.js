const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required. Please verify your email before accessing this resource.',
      requiresVerification: true,
      email: req.user.email,
    });
  }

  next();
};

module.exports = requireVerified;
