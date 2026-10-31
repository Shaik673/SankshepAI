const mongoose = require('mongoose');

const SummarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    keyPoints: [{ type: String }],
    entities: {
      dates: [{ type: String }],
      figures_and_amounts: [{ type: String }],
      circulars_and_statutory: [{ type: String }],
      organizations_and_terms: [{ type: String }],
    },
    method: {
      type: String,
      enum: ['textrank_baseline', 'custom_seq2seq_attention', 'gemini_api_fallback'],
      required: true,
      index: true,
    },
    methodLabel: {
      type: String,
      default: '',
    },
    configuration: {
      length: { type: String, default: 'balanced' },
      style: { type: String, default: 'executive' },
      beamWidth: { type: Number, default: 4 },
      maxLen: { type: Number, default: 60 },
      decodingStrategy: { type: String, default: 'beam_search' },
      checkpoint: { type: String, default: 'custom_seq2seq_v1.pt' },
    },
    originalWordCount: {
      type: Number,
      required: true,
    },
    summaryWordCount: {
      type: Number,
      required: true,
    },
    compressionRatio: {
      type: Number,
      required: true,
    },
    processingTimeMs: {
      type: Number,
      default: 0,
    },
    evaluation: {
      available: { type: Boolean, default: false },
      rouge1: { precision: Number, recall: Number, f1: Number },
      rouge2: { precision: Number, recall: Number, f1: Number },
      rougeL: { precision: Number, recall: Number, f1: Number },
    },
    version: {
      type: Number,
      default: 1,
    },
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection',
      default: null,
      index: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

SummarySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Summary', SummarySchema);
