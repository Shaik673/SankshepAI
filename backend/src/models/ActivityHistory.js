const mongoose = require('mongoose');

const ActivityHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: [
        'user_signup',
        'email_verified',
        'user_login',
        'user_logout',
        'onboarding_completed',
        'document_uploaded',
        'document_deleted',
        'document_qa',
        'document_batch_uploaded',
        'user_registered',
        'summary_generated',
        'summary_edited',
        'summary_exported',
        'collection_created',
        'experiment_created',
        'settings_updated',
      ],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

ActivityHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityHistory', ActivityHistorySchema);
