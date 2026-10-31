const mongoose = require('mongoose');

const CollectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    documentCount: {
      type: Number,
      default: 0,
    },
    summaryCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

CollectionSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Collection', CollectionSchema);
