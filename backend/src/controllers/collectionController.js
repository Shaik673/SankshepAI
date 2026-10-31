const Collection = require('../models/Collection');
const Summary = require('../models/Summary');
const Document = require('../models/Document');
const ActivityHistory = require('../models/ActivityHistory');

class CollectionController {
  async list(req, res) {
    const userId = req.user._id;
    const collections = await Collection.find({ userId }).sort({ createdAt: -1 });

    // Update real-time counts
    const populated = await Promise.all(
      collections.map(async (c) => {
        const sumCount = await Summary.countDocuments({ collectionId: c._id });
        const docCount = await Document.countDocuments({ collectionId: c._id });
        return {
          ...c.toObject(),
          summaryCount: sumCount,
          documentCount: docCount,
        };
      })
    );

    res.json({ success: true, collections: populated });
  }

  async create(req, res) {
    const userId = req.user._id;
    const { name, description, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Collection name is required.' });
    }

    const existing = await Collection.findOne({ userId, name: name.trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A collection with this name already exists.' });
    }

    const col = await Collection.create({
      userId,
      name: name.trim(),
      description: description || '',
      color: color || '#6366f1',
    });

    await ActivityHistory.create({
      userId,
      actionType: 'collection_created',
      description: `Created collection: "${col.name}"`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, collection: col });
  }

  async get(req, res) {
    const userId = req.user._id;
    const col = await Collection.findOne({ _id: req.params.id, userId });
    if (!col) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    const summaries = await Summary.find({ collectionId: col._id }).sort({ createdAt: -1 });
    const documents = await Document.find({ collectionId: col._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      collection: col,
      summaries,
      documents,
    });
  }

  async update(req, res) {
    const userId = req.user._id;
    const { name, description, color } = req.body;

    const col = await Collection.findOneAndUpdate(
      { _id: req.params.id, userId },
      {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
      },
      { new: true }
    );

    if (!col) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    res.json({ success: true, collection: col });
  }

  async delete(req, res) {
    const userId = req.user._id;
    const col = await Collection.findOne({ _id: req.params.id, userId });
    if (!col) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    // Unlink from summaries and documents
    await Summary.updateMany({ collectionId: col._id }, { $set: { collectionId: null } });
    await Document.updateMany({ collectionId: col._id }, { $set: { collectionId: null } });
    await Collection.deleteOne({ _id: col._id });

    res.json({ success: true, message: 'Collection deleted successfully.' });
  }
}

module.exports = new CollectionController();
