const mongoose = require('mongoose');

const UserSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    theme: {
      type: String,
      enum: ['dark', 'light'],
      default: 'dark',
    },
    defaultLength: {
      type: String,
      enum: ['short', 'balanced', 'detailed'],
      default: 'balanced',
    },
    defaultStyle: {
      type: String,
      enum: ['executive', 'academic', 'bullet-point', 'plain-language', 'structured'],
      default: 'executive',
    },
    defaultModel: {
      type: String,
      enum: ['textrank_baseline', 'custom_seq2seq_attention', 'gemini_api_fallback'],
      default: 'textrank_baseline',
    },
    allowGeminiFallback: {
      type: Boolean,
      default: true,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserSettings', UserSettingsSchema);
