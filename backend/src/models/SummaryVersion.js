const mongoose = require('mongoose');

const SummaryVersionSchema = new mongoose.Schema(
  {
    summaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Summary',
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    keyPoints: [{ type: String }],
    wordCount: {
      type: Number,
      required: true,
    },
    editedByUser: {
      type: Boolean,
      default: false,
    },
    changeNote: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

SummaryVersionSchema.index({ summaryId: 1, versionNumber: -1 });

module.exports = mongoose.model('SummaryVersion', SummaryVersionSchema);
