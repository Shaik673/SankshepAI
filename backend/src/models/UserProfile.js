const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    occupation: {
      type: String,
      enum: ['student', 'faculty', 'researcher', 'government_employee', 'journalist', 'professional', 'other', ''],
      default: '',
    },
    institution: {
      type: String,
      trim: true,
      default: '',
    },
    country: {
      type: String,
      trim: true,
      default: '',
    },
    preferredLanguage: {
      type: String,
      default: 'en',
    },
    bio: {
      type: String,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserProfile', UserProfileSchema);
