const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const Document = require('../models/Document');
const Summary = require('../models/Summary');
const Collection = require('../models/Collection');
const ActivityHistory = require('../models/ActivityHistory');
const aiClientService = require('../services/aiClientService');

const CORPUS_PATH = path.join(__dirname, '../../../data/sample_corpus.json');

class AdminController {
  // ── Overview & Metrics ───────────────────────────────────────────────────
  async getOverview(req, res, next) {
    try {
      const [
        totalUsers,
        activeUsers,
        totalDocs,
        totalSummaries,
        totalCollections,
        recentActivities,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ accountStatus: 'active' }),
        Document.countDocuments(),
        Summary.countDocuments(),
        Collection.countDocuments(),
        ActivityHistory.find().sort({ createdAt: -1 }).limit(10).populate('userId', 'email fullName role'),
      ]);

      // Method breakdown
      const methodCounts = await Summary.aggregate([
        { $group: { _id: '$method', count: { $sum: 1 }, avgTime: { $avg: '$processingTimeMs' } } },
      ]);

      res.json({
        success: true,
        metrics: {
          totalUsers,
          activeUsers,
          totalDocs,
          totalSummaries,
          totalCollections,
          uptimeSeconds: Math.floor(process.uptime()),
        },
        methodBreakdown: methodCounts,
        recentActivities,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Dataset Management ───────────────────────────────────────────────────
  async getDatasets(req, res, next) {
    try {
      let corpus = [];
      if (fs.existsSync(CORPUS_PATH)) {
        const raw = fs.readFileSync(CORPUS_PATH, 'utf-8');
        corpus = JSON.parse(raw);
      }
      res.json({
        success: true,
        count: corpus.length,
        dataset: corpus,
        datasets: corpus,
      });
    } catch (err) {
      next(err);
    }
  }

  async addDatasetItem(req, res, next) {
    try {
      const { source, target, category = 'government_circular', title } = req.body;
      if (!source || !target) {
        return res.status(400).json({ success: false, message: 'Source and target summary are required.' });
      }

      let corpus = [];
      if (fs.existsSync(CORPUS_PATH)) {
        const raw = fs.readFileSync(CORPUS_PATH, 'utf-8');
        corpus = JSON.parse(raw);
      }

      const newItem = {
        id: `item_${Date.now()}`,
        title: title || `Document Item ${corpus.length + 1}`,
        category,
        source: source.trim(),
        target: target.trim(),
        addedAt: new Date().toISOString(),
        addedBy: req.user.email,
      };

      corpus.push(newItem);
      fs.writeFileSync(CORPUS_PATH, JSON.stringify(corpus, null, 2), 'utf-8');

      res.status(201).json({
        success: true,
        message: 'Dataset item added successfully to the approved corpus.',
        item: newItem,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── System Health ────────────────────────────────────────────────────────
  async getSystemHealth(req, res, next) {
    try {
      const dbStatus = mongoose.connection.readyState === 1 ? 'healthy' : 'degraded';
      const aiStatus = await aiClientService.checkHealth();
      const mem = process.memoryUsage();

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        services: {
          nodeApi: {
            status: 'healthy',
            uptime: Math.floor(process.uptime()),
            memoryMb: Math.round(mem.rss / 1024 / 1024),
            nodeVersion: process.version,
          },
          database: {
            status: dbStatus,
            host: mongoose.connection.host || 'embedded-in-memory',
            name: mongoose.connection.name || 'sankshepai',
          },
          mongodb: {
            status: dbStatus,
            host: mongoose.connection.host || 'embedded-in-memory',
            name: mongoose.connection.name || 'sankshepai',
          },
          aiService: aiStatus,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // ── User Management ──────────────────────────────────────────────────────
  async getUsers(req, res, next) {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      const query = {};
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const total = await User.countDocuments(query);
      const users = await User.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10));

      res.json({
        success: true,
        users,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total,
          pages: Math.ceil(total / parseInt(limit, 10)),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async updateUserRole(req, res, next) {
    try {
      const { role } = req.body;
      if (!['user', 'researcher', 'admin'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role specified.' });
      }

      const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select(
        '-passwordHash'
      );
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      res.json({ success: true, message: `User role updated to ${role}.`, user });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();

