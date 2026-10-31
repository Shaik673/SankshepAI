const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    storagePath: {
      type: String,
      required: true,
    },
    extractedText: {
      type: String,
      required: true,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    charCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'ready', 'error'],
      default: 'ready',
      index: true,
    },
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection',
      default: null,
      index: true,
    },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

DocumentSchema.index({ userId: 1, createdAt: -1 });
DocumentSchema.index({ userId: 1, title: 'text', originalFilename: 'text' });

module.exports = mongoose.model('Document', DocumentSchema);
