const fs = require('fs');
const Document = require('../models/Document');
const Summary = require('../models/Summary');
const ActivityHistory = require('../models/ActivityHistory');
const fileStorageService = require('../services/fileStorageService');
const aiClientService = require('../services/aiClientService');

class DocumentController {
  // ── Create Document from Text / JSON ──────────────────────────────────────
  async createFromText(req, res) {
    const { title, content, documentType, sourceUrl, tags, collectionId } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Document content is required.' });
    }

    try {
      const extractedText = content.trim();
      const words = extractedText.split(/\s+/).filter(Boolean);
      const docTitle = title || 'Untitled Document';
      const uploadsDir = require('path').join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.txt`;
      const storagePath = require('path').join(uploadsDir, filename);
      await fs.promises.writeFile(storagePath, extractedText, 'utf8');

      const doc = await Document.create({
        userId: req.user._id,
        title: docTitle,
        originalFilename: `${docTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`,
        mimeType: 'text/plain',
        fileSize: Buffer.byteLength(extractedText, 'utf8'),
        storagePath,
        extractedText,
        wordCount: words.length,
        charCount: extractedText.length,
        status: 'ready',
        collectionId: collectionId || null,
        metadata: {
          documentType: documentType || 'government_circular',
          sourceUrl: sourceUrl || '',
          tags: tags || [],
        },
      });

      await ActivityHistory.create({
        userId: req.user._id,
        actionType: 'document_uploaded',
        description: `Created document: ${docTitle} (${words.length} words)`,
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'Document created successfully.',
        document: doc,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: `Failed to create document: ${err.message}`,
      });
    }
  }

  // ── Upload Document ───────────────────────────────────────────────────────
  async upload(req, res) {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { originalname, mimetype, size, path: storagePath } = req.file;
    const title = req.body.title || originalname.replace(/\.[^/.]+$/, '');

    try {
      // Extract text
      const extractedText = await fileStorageService.extractText(storagePath, mimetype);
      const words = extractedText.trim().split(/\s+/).filter(Boolean);

      const doc = await Document.create({
        userId: req.user._id,
        title,
        originalFilename: originalname,
        mimeType: mimetype,
        fileSize: size,
        storagePath,
        extractedText,
        wordCount: words.length,
        charCount: extractedText.length,
        status: 'ready',
        collectionId: req.body.collectionId || null,
      });

      await ActivityHistory.create({
        userId: req.user._id,
        actionType: 'document_uploaded',
        description: `Uploaded document: ${title} (${words.length} words)`,
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded and text extracted successfully.',
        document: doc,
      });
    } catch (err) {
      // Clean up uploaded file if extraction fails
      if (fs.existsSync(storagePath)) {
        fs.unlinkSync(storagePath);
      }
      res.status(500).json({
        success: false,
        message: `Failed to process document: ${err.message}`,
      });
    }
  }

  // ── Import from URL ───────────────────────────────────────────────────────
  async importUrl(req, res) {
    const { url, title } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'Target URL is required.' });
    }

    try {
      const extractedText = await fileStorageService.fetchUrlContent(url);
      const words = extractedText.trim().split(/\s+/).filter(Boolean);

      const docTitle = title || `Web Article - ${new URL(url).hostname}`;

      const doc = await Document.create({
        userId: req.user._id,
        title: docTitle,
        originalFilename: url,
        mimeType: 'text/html',
        fileSize: Buffer.byteLength(extractedText, 'utf8'),
        storagePath: 'remote_url',
        extractedText,
        wordCount: words.length,
        charCount: extractedText.length,
        status: 'ready',
      });

      await ActivityHistory.create({
        userId: req.user._id,
        actionType: 'document_uploaded',
        description: `Imported document from URL: ${url}`,
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'URL content imported successfully.',
        document: doc,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: `URL import failed: ${err.message}`,
      });
    }
  }

  // ── List Documents ────────────────────────────────────────────────────────
  async list(req, res) {
    const userId = req.user._id;
    const { page = 1, limit = 10, search = '', collectionId = '' } = req.query;

    const query = { userId };
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    if (collectionId) {
      query.collectionId = collectionId;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Document.countDocuments(query);
    const documents = await Document.find(query)
      .select('-extractedText') // Omit large text in list view
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      documents,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  }

  // ── Get Single Document ───────────────────────────────────────────────────
  async get(req, res) {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }
    res.json({ success: true, document: doc });
  }

  // ── Get Extracted Text Preview ────────────────────────────────────────────
  async getExtracted(req, res) {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }
    res.json({
      success: true,
      text: doc.extractedText,
      wordCount: doc.wordCount,
      charCount: doc.charCount,
    });
  }

  // ── Rename Document ───────────────────────────────────────────────────────
  async rename(req, res) {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'New name is required.' });
    }

    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: name.trim() },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    res.json({ success: true, document: doc });
  }

  // ── Delete Document ───────────────────────────────────────────────────────
  async delete(req, res) {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    // Delete file from disk if local
    if (doc.storagePath && fs.existsSync(doc.storagePath) && doc.storagePath !== 'remote_url') {
      try {
        fs.unlinkSync(doc.storagePath);
      } catch (err) {
        console.warn('Failed to delete file from disk:', err.message);
      }
    }

    // Delete linked summaries
    await Summary.deleteMany({ documentId: doc._id });
    await Document.deleteOne({ _id: doc._id });

    await ActivityHistory.create({
      userId: req.user._id,
      actionType: 'document_deleted',
      description: `Deleted document: ${doc.title}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Document deleted successfully.' });
  }

  // ── Batch Delete ──────────────────────────────────────────────────────────
  async batchDelete(req, res) {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of document IDs required.' });
    }

    const docs = await Document.find({ _id: { $in: ids }, userId: req.user._id });
    for (const doc of docs) {
      if (doc.storagePath && fs.existsSync(doc.storagePath) && doc.storagePath !== 'remote_url') {
        try {
          fs.unlinkSync(doc.storagePath);
        } catch {}
      }
    }

    await Summary.deleteMany({ documentId: { $in: ids } });
    const result = await Document.deleteMany({ _id: { $in: ids }, userId: req.user._id });

    res.json({
      success: true,
      message: `${result.deletedCount} documents deleted successfully.`,
    });
  }

  // ── Ask Question with Grounded Citations (Single Document RAG) ────────────
  async ask(req, res) {
    const { question, query, topK = 3 } = req.body;
    const userQuery = question || query;

    if (!userQuery || !userQuery.trim()) {
      return res.status(400).json({ success: false, message: 'Question string is required.' });
    }

    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    try {
      const ragResponse = await aiClientService.queryDocumentRAG({
        query: userQuery.trim(),
        documentId: doc._id,
        documentTitle: doc.title,
        documentText: doc.extractedText,
        topK: parseInt(topK, 10) || 3,
      });

      await ActivityHistory.create({
        userId: req.user._id,
        actionType: 'document_qa',
        description: `Queried document "${doc.title}": "${userQuery.slice(0, 50)}..."`,
        metadata: { documentId: doc._id, confidence: ragResponse.confidence },
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        documentId: doc._id,
        documentTitle: doc.title,
        query: userQuery,
        ...ragResponse,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: `RAG Q&A failed: ${err.message}`,
      });
    }
  }

  // ── Corpus RAG Query (Multi-Document Authorized Knowledge Base) ───────────
  async queryCorpus(req, res) {
    const { question, query, collectionId, topK = 4 } = req.body;
    const userQuery = question || query;

    if (!userQuery || !userQuery.trim()) {
      return res.status(400).json({ success: false, message: 'Query is required.' });
    }

    const filter = { userId: req.user._id };
    if (collectionId) filter.collectionId = collectionId;

    const documents = await Document.find(filter).limit(20);
    if (!documents || documents.length === 0) {
      return res.json({
        success: true,
        answer: "I couldn't find sufficient supporting information in your documents to answer this reliably.",
        is_insufficient_evidence: true,
        citations: [],
      });
    }

    try {
      const ragResponse = await aiClientService.queryCorpusRAG({
        query: userQuery.trim(),
        documents,
        topK: parseInt(topK, 10) || 4,
      });

      res.json({
        success: true,
        query: userQuery,
        ...ragResponse,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: `Corpus search failed: ${err.message}`,
      });
    }
  }

  // ── Batch Upload Documents ────────────────────────────────────────────────
  async batchUpload(req, res) {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' });
    }

    const category = req.body.category || 'government_circular';
    const collectionId = req.body.collectionId || null;
    const processedDocs = [];
    const errors = [];

    for (const file of files) {
      try {
        const { originalname, mimetype, size, path: storagePath } = file;
        const title = originalname.replace(/\.[^/.]+$/, '');
        const extractedText = await fileStorageService.extractText(storagePath, mimetype);
        const words = extractedText.trim().split(/\s+/).filter(Boolean);

        const doc = await Document.create({
          userId: req.user._id,
          title,
          originalFilename: originalname,
          mimeType: mimetype,
          fileSize: size,
          storagePath,
          extractedText,
          wordCount: words.length,
          charCount: extractedText.length,
          status: 'ready',
          collectionId,
          tags: [category],
        });

        processedDocs.push(doc);
      } catch (err) {
        errors.push({ filename: file.originalname, error: err.message });
      }
    }

    await ActivityHistory.create({
      userId: req.user._id,
      actionType: 'document_batch_uploaded',
      description: `Batch uploaded ${processedDocs.length} documents (${errors.length} failed)`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: `Processed ${processedDocs.length} files successfully.${errors.length > 0 ? ` ${errors.length} files failed.` : ''}`,
      documents: processedDocs,
      errors,
    });
  }

  // ── Download Document ─────────────────────────────────────────────────────
  async download(req, res) {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    if (doc.storagePath && fs.existsSync(doc.storagePath) && doc.storagePath !== 'remote_url') {
      return res.download(doc.storagePath, doc.originalFilename);
    }

    // Fallback: send text representation
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.txt"`);
    res.send(doc.extractedText);
  }
}

module.exports = new DocumentController();
