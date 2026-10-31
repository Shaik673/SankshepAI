const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      default: null, // null for social-only accounts
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'researcher', 'admin'],
      default: 'user',
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'pending_verification'],
      default: 'pending_verification',
    },
    socialProviders: {
      googleId: { type: String, default: null, sparse: true },
      githubId: { type: String, default: null, sparse: true },
      linkedinId: { type: String, default: null, sparse: true },
      facebookId: { type: String, default: null, sparse: true },
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
