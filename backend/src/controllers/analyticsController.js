const Document = require('../models/Document');
const Summary = require('../models/Summary');
const ActivityHistory = require('../models/ActivityHistory');

class AnalyticsController {
  // ── Dashboard Overview Stats ──────────────────────────────────────────────
  async getDashboard(req, res) {
    const userId = req.user._id;

    const [totalDocs, totalSums, recentDocs, recentSums] = await Promise.all([
      Document.countDocuments({ userId }),
      Summary.countDocuments({ userId }),
      Document.find({ userId }).select('-extractedText').sort({ createdAt: -1 }).limit(5),
      Summary.find({ userId }).populate('documentId', 'title').sort({ createdAt: -1 }).limit(5),
    ]);

    // Aggregate statistics
    const statsAgg = await Summary.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalOriginalWords: { $sum: '$originalWordCount' },
          totalSummaryWords: { $sum: '$summaryWordCount' },
          avgCompressionRatio: { $avg: '$compressionRatio' },
          avgProcessingTimeMs: { $avg: '$processingTimeMs' },
        },
      },
    ]);

    const stats = statsAgg[0] || {
      totalOriginalWords: 0,
      totalSummaryWords: 0,
      avgCompressionRatio: 0,
      avgProcessingTimeMs: 0,
    };

    // Method breakdown
    const methodAgg = await Summary.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$method',
          count: { $sum: 1 },
          avgTime: { $avg: '$processingTimeMs' },
        },
      },
    ]);

    const methodDistribution = {
      textrank_baseline: 0,
      custom_seq2seq_attention: 0,
      gemini_api_fallback: 0,
    };
    methodAgg.forEach((m) => {
      if (m._id) methodDistribution[m._id] = m.count;
    });

    // Activity over past 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const timelineAgg = await Summary.aggregate([
      { $match: { userId, createdAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalDocuments: totalDocs,
        totalSummaries: totalSums,
        totalOriginalWords: stats.totalOriginalWords,
        totalSummaryWords: stats.totalSummaryWords,
        avgCompressionRatio: Math.round(stats.avgCompressionRatio * 100) / 100 || 0,
        avgProcessingTimeMs: Math.round(stats.avgProcessingTimeMs) || 0,
        recentDocuments: recentDocs,
        recentSummaries: recentSums,
        methodDistribution,
        activityTimeline: timelineAgg.map((item) => ({ date: item._id, count: item.count })),
      },
    });
  }

  // ── Activity History Audit Log ────────────────────────────────────────────
  async getActivity(req, res) {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await ActivityHistory.countDocuments({ userId });
    const activities = await ActivityHistory.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      activities,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  }

  // ── Method Performance Comparison Stats ───────────────────────────────────
  async getMethodStats(req, res) {
    const userId = req.user._id;

    const stats = await Summary.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$method',
          count: { $sum: 1 },
          avgOriginalWords: { $avg: '$originalWordCount' },
          avgSummaryWords: { $avg: '$summaryWordCount' },
          avgCompressionRatio: { $avg: '$compressionRatio' },
          avgProcessingTimeMs: { $avg: '$processingTimeMs' },
        },
      },
    ]);

    res.json({ success: true, methods: stats });
  }
}

module.exports = new AnalyticsController();
