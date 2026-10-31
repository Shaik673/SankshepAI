const mongoose = require('mongoose');

const ModelExperimentSchema = new mongoose.Schema(
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
    modelType: {
      type: String,
      required: true,
    },
    checkpointName: {
      type: String,
      default: 'custom_seq2seq_v1.pt',
    },
    decodingStrategy: {
      type: String,
      default: 'beam_search',
    },
    beamWidth: {
      type: Number,
      default: 4,
    },
    hyperparameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    rouge1: {
      precision: Number,
      recall: Number,
      f1: Number,
    },
    rouge2: {
      precision: Number,
      recall: Number,
      f1: Number,
    },
    rougeL: {
      precision: Number,
      recall: Number,
      f1: Number,
    },
    runtimeMs: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

ModelExperimentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ModelExperiment', ModelExperimentSchema);
