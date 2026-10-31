const mongoose = require('mongoose');

const OnboardingProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    currentStep: {
      type: Number,
      default: 1, // 1: Identity, 2: Preferences, 3: Discovery
      min: 1,
      max: 3,
    },
    isCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Step 1: Identity
    identityData: {
      displayName: { type: String, default: '' },
      avatar: { type: String, default: '' },
      occupation: { type: String, default: '' },
      institution: { type: String, default: '' },
      country: { type: String, default: '' },
      preferredLanguage: { type: String, default: 'en' },
    },
    // Step 2: Interests & Preferences
    preferencesData: {
      documentInterests: [{ type: String }],
      preferredSummaryStyle: {
        type: String,
        enum: ['executive', 'academic', 'bullet-point', 'plain-language', 'structured'],
        default: 'executive',
      },
      preferredSummaryLength: {
        type: String,
        enum: ['short', 'balanced', 'detailed'],
        default: 'balanced',
      },
    },
    // Step 3: Discovery Source
    discoverySources: [{ type: String }],
    discoveryOther: { type: String, default: '' },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OnboardingProgress', OnboardingProgressSchema);
