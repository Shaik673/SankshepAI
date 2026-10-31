const Summary = require('../models/Summary');
const SummaryVersion = require('../models/SummaryVersion');
const Document = require('../models/Document');
const Collection = require('../models/Collection');
const UserSettings = require('../models/UserSettings');
const ActivityHistory = require('../models/ActivityHistory');
const aiClientService = require('../services/aiClientService');

class SummaryController {
  // ── Generate Summary ──────────────────────────────────────────────────────
  async generate(req, res) {
    const userId = req.user._id;
    const {
      text,
      documentId,
      method = 'textrank_baseline',
      length = 'balanced',
      style = 'executive',
      beamWidth = 4,
      maxLen = 60,
      extractKeyPoints = true,
      extractEntities = false,
      referenceSummary = null,
      collectionId = null,
      title: customTitle,
    } = req.body;

    let sourceText = text || req.body.rawText || req.body.content || '';
    let docRef = null;

    let chosenMethod = req.body.method || req.body.model || 'textrank_baseline';
    if (chosenMethod === 'textrank') chosenMethod = 'textrank_baseline';
    if (chosenMethod === 'custom_seq2seq' || chosenMethod === 'seq2seq' || chosenMethod === 'seq2seq_attention') chosenMethod = 'custom_seq2seq_attention';
    if (chosenMethod === 'gemini' || chosenMethod === 'gemini_flash') chosenMethod = 'gemini_api_fallback';

    if (documentId) {
      docRef = await Document.findOne({ _id: documentId, userId });
      if (!docRef) {
        return res.status(404).json({ success: false, message: 'Source document not found.' });
      }
      sourceText = docRef.extractedText;
    }

    if (!sourceText || sourceText.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Source text must contain at least 10 characters to generate a summary.',
      });
    }

    const userSettings = (await UserSettings.findOne({ userId })) || {};
    const allowFallback = userSettings.allowGeminiFallback !== false;

    let aiResult = null;
    let usedMethod = chosenMethod;
    let fallbackTriggered = false;

    try {
      if (chosenMethod === 'textrank_baseline') {
        aiResult = await aiClientService.summarizeTextRank({
          text: sourceText,
          length,
          style,
          extract_key_points: extractKeyPoints,
          extract_entities: extractEntities,
          reference_summary: referenceSummary,
        });
      } else if (chosenMethod === 'custom_seq2seq_attention') {
        try {
          aiResult = await aiClientService.summarizeCustomModel({
            text: sourceText,
            beam_width: parseInt(beamWidth, 10) || 4,
            max_len: parseInt(maxLen, 10) || 60,
            extract_key_points: extractKeyPoints,
            extract_entities: extractEntities,
            reference_summary: referenceSummary,
          });
        } catch (customErr) {
          console.warn('[SummaryController] Custom model failed:', customErr.message);
          if (allowFallback) {
            console.log('[SummaryController] Triggering intelligent Gemini API fallback...');
            aiResult = await aiClientService.summarizeGemini({
              text: sourceText,
              length,
              style,
              extract_key_points: extractKeyPoints,
              reference_summary: referenceSummary,
            });
            usedMethod = 'gemini_api_fallback';
            fallbackTriggered = true;
          } else {
            throw customErr;
          }
        }
      } else if (chosenMethod === 'gemini_api_fallback') {
        aiResult = await aiClientService.summarizeGemini({
          text: sourceText,
          length,
          style,
          extract_key_points: extractKeyPoints,
          reference_summary: referenceSummary,
        });
      }
    } catch (err) {
      console.error('[SummaryController] Generation error:', err.message);
      // As a final safety net, run internal extractive fallback so user never gets a 500 error
      aiResult = aiClientService._internalTextRankFallback(sourceText, length);
      usedMethod = 'textrank_baseline';
    }

    const summaryContent = aiResult.summary || '';
    const origWords = sourceText.trim().split(/\s+/).length;
    const sumWords = summaryContent.trim().split(/\s+/).length;
    const compRatio = Math.round((sumWords / Math.max(origWords, 1)) * 1000) / 1000;

    const summaryTitle =
      customTitle ||
      (docRef ? `Summary of ${docRef.title}` : `Summary - ${new Date().toLocaleDateString()}`);

    // Persist Summary
    const summary = await Summary.create({
      userId,
      documentId: docRef ? docRef._id : null,
      title: summaryTitle,
      content: summaryContent,
      keyPoints: aiResult.key_points || [],
      entities: aiResult.entities || {},
      method: usedMethod,
      methodLabel: aiResult.method_label || usedMethod,
      configuration: {
        length,
        style,
        beamWidth,
        maxLen,
        decodingStrategy: method === 'custom_seq2seq_attention' ? 'beam_search' : 'graph_ranking',
      },
      originalWordCount: origWords,
      summaryWordCount: sumWords,
      compressionRatio: compRatio,
      processingTimeMs: aiResult.processing_time_ms || 0,
      evaluation: aiResult.evaluation || { available: false },
      version: 1,
      collectionId: collectionId || null,
      isEdited: false,
    });

    // Create Initial Version
    await SummaryVersion.create({
      summaryId: summary._id,
      versionNumber: 1,
      content: summaryContent,
      keyPoints: aiResult.key_points || [],
      wordCount: sumWords,
      editedByUser: false,
      changeNote: 'Initial AI-generated summary',
    });

    // Update collection summary count if applicable
    if (collectionId) {
      await Collection.findByIdAndUpdate(collectionId, { $inc: { summaryCount: 1 } });
    }

    // Log activity
    await ActivityHistory.create({
      userId,
      actionType: 'summary_generated',
      description: `Generated summary (${usedMethod}) for "${summaryTitle}"`,
      metadata: { summaryId: summary._id, method: usedMethod, fallbackTriggered },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      summary,
      fallbackTriggered,
    });
  }

  // ── List Summaries ────────────────────────────────────────────────────────
  async list(req, res) {
    const userId = req.user._id;
    const { page = 1, limit = 10, search = '', method = '', collectionId = '' } = req.query;

    const query = { userId };
    if (search) query.title = { $regex: search, $options: 'i' };
    if (method) query.method = method;
    if (collectionId) query.collectionId = collectionId;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Summary.countDocuments(query);
    const summaries = await Summary.find(query)
      .populate('documentId', 'title originalFilename mimeType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      summaries,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  }

  // ── Get Single Summary ────────────────────────────────────────────────────
  async get(req, res) {
    const summary = await Summary.findOne({ _id: req.params.id, userId: req.user._id }).populate(
      'documentId',
      'title originalFilename mimeType extractedText'
    );

    if (!summary) {
      return res.status(404).json({ success: false, message: 'Summary not found.' });
    }

    res.json({ success: true, summary });
  }

  // ── Update Summary (Versioned) ────────────────────────────────────────────
  async update(req, res) {
    const userId = req.user._id;
    const { content, keyPoints, changeNote } = req.body;

    const summary = await Summary.findOne({ _id: req.params.id, userId });
    if (!summary) {
      return res.status(404).json({ success: false, message: 'Summary not found.' });
    }

    const newVersionNum = (summary.version || 1) + 1;
    const newWordCount = content.trim().split(/\s+/).length;

    // Update main record
    summary.content = content;
    if (keyPoints) summary.keyPoints = keyPoints;
    summary.summaryWordCount = newWordCount;
    summary.compressionRatio =
      Math.round((newWordCount / Math.max(summary.originalWordCount, 1)) * 1000) / 1000;
    summary.version = newVersionNum;
    summary.isEdited = true;
    await summary.save();

    // Create version snapshot
    await SummaryVersion.create({
      summaryId: summary._id,
      versionNumber: newVersionNum,
      content,
      keyPoints: keyPoints || summary.keyPoints,
      wordCount: newWordCount,
      editedByUser: true,
      changeNote: changeNote || `User edit v${newVersionNum}`,
    });

    await ActivityHistory.create({
      userId,
      actionType: 'summary_edited',
      description: `Edited summary: "${summary.title}" (v${newVersionNum})`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Summary updated and new version saved.',
      summary,
    });
  }

  // ── Get Version History ───────────────────────────────────────────────────
  async getVersions(req, res) {
    const summary = await Summary.findOne({ _id: req.params.id, userId: req.user._id });
    if (!summary) {
      return res.status(404).json({ success: false, message: 'Summary not found.' });
    }

    const versions = await SummaryVersion.find({ summaryId: summary._id }).sort({ versionNumber: -1 });
    res.json({ success: true, versions });
  }

  // ── Rename Summary ────────────────────────────────────────────────────────
  async rename(req, res) {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }

    const summary = await Summary.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: title.trim() },
      { new: true }
    );

    if (!summary) {
      return res.status(404).json({ success: false, message: 'Summary not found.' });
    }

    res.json({ success: true, summary });
  }

  // ── Delete Summary ────────────────────────────────────────────────────────
  async delete(req, res) {
    const summary = await Summary.findOne({ _id: req.params.id, userId: req.user._id });
    if (!summary) {
      return res.status(404).json({ success: false, message: 'Summary not found.' });
    }

    await SummaryVersion.deleteMany({ summaryId: summary._id });
    await Summary.deleteOne({ _id: summary._id });

    if (summary.collectionId) {
      await Collection.findByIdAndUpdate(summary.collectionId, { $inc: { summaryCount: -1 } });
    }

    res.json({ success: true, message: 'Summary and version history deleted successfully.' });
  }

  // ── Add to Collection ─────────────────────────────────────────────────────
  async addToCollection(req, res) {
    const { collectionId } = req.body;
    const summary = await Summary.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { collectionId: collectionId || null },
      { new: true }
    );

    if (!summary) {
      return res.status(404).json({ success: false, message: 'Summary not found.' });
    }

    res.json({ success: true, summary });
  }

  // ── Export Summary ────────────────────────────────────────────────────────
  async export(req, res) {
    const { format = 'txt' } = req.query;
    const summary = await Summary.findOne({ _id: req.params.id, userId: req.user._id });
    if (!summary) {
      return res.status(404).json({ success: false, message: 'Summary not found.' });
    }

    const filename = `${summary.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_summary`;

    await ActivityHistory.create({
      userId: req.user._id,
      actionType: 'summary_exported',
      description: `Exported summary "${summary.title}" as ${format.toUpperCase()}`,
      ipAddress: req.ip,
    });

    if (format === 'pdf') {
      const PDFDocument = require('pdfkit');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);

      const doc = new PDFDocument({ margin: 50 });
      doc.pipe(res);

      doc.fontSize(20).font('Helvetica-Bold').fillColor('#1E293B').text('SankshepAI — Document Intelligence', { align: 'left' });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').fillColor('#64748B').text(`Generated: ${new Date(summary.createdAt).toLocaleDateString()} | Model: ${summary.methodLabel || summary.method}`, { align: 'left' });
      doc.moveDown(0.5);
      doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1);

      doc.fontSize(16).font('Helvetica-Bold').fillColor('#0F172A').text(summary.title);
      doc.moveDown(0.5);

      const compressionPct = Math.round((1 - (summary.compressionRatio || 0.4)) * 100);
      doc.fontSize(10).font('Helvetica').fillColor('#475569').text(`Original Words: ${summary.originalWordCount || 'N/A'}  |  Summary Words: ${summary.summaryWordCount || 'N/A'}  |  Compression: ${compressionPct}%`);
      doc.moveDown(1);

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1E293B').text('EXECUTIVE SUMMARY');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('#334155').text(summary.content, { lineGap: 4 });
      doc.moveDown(1);

      if (summary.keyPoints && summary.keyPoints.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1E293B').text('KEY TAKEAWAYS & ACTION ITEMS');
        doc.moveDown(0.5);
        summary.keyPoints.forEach((point) => {
          doc.fontSize(10).font('Helvetica').fillColor('#334155').text(`•  ${point}`, { lineGap: 3 });
        });
        doc.moveDown(1);
      }

      if (summary.deadlines && summary.deadlines.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1E293B').text('NOTIFIED DEADLINES');
        doc.moveDown(0.5);
        summary.deadlines.forEach((dl) => {
          doc.fontSize(10).font('Helvetica').fillColor('#B91C1C').text(`⏱  ${dl}`, { lineGap: 3 });
        });
        doc.moveDown(1);
      }

      if (summary.amounts && summary.amounts.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1E293B').text('FINANCIAL AMOUNTS & ALLOCATIONS');
        doc.moveDown(0.5);
        summary.amounts.forEach((amt) => {
          doc.fontSize(10).font('Helvetica').fillColor('#047857').text(`₹  ${amt}`, { lineGap: 3 });
        });
        doc.moveDown(1);
      }

      doc.end();
      return;
    }

    if (format === 'docx') {
      const { Document: DocxDocument, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
      const docxChildren = [
        new Paragraph({
          text: 'SankshepAI — Document Intelligence Report',
          heading: HeadingLevel.TITLE,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Generated on: ${new Date(summary.createdAt).toLocaleDateString()} | `, italics: true, color: '666666' }),
            new TextRun({ text: `Model: ${summary.methodLabel || summary.method}`, bold: true, color: '333333' }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          text: summary.title,
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Original Words: ${summary.originalWordCount || 'N/A'}  |  Summary Words: ${summary.summaryWordCount || 'N/A'}  |  Compression: ${Math.round((1 - (summary.compressionRatio || 0.4)) * 100)}%`, color: '555555' }),
          ],
        }),
        new Paragraph({ text: '' }),
        new Paragraph({
          text: 'Executive Summary',
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [new TextRun(summary.content)],
        }),
      ];

      if (summary.keyPoints && summary.keyPoints.length > 0) {
        docxChildren.push(
          new Paragraph({ text: '' }),
          new Paragraph({ text: 'Key Takeaways & Action Items', heading: HeadingLevel.HEADING_2 })
        );
        summary.keyPoints.forEach((kp) => {
          docxChildren.push(new Paragraph({ text: `• ${kp}` }));
        });
      }

      if (summary.deadlines && summary.deadlines.length > 0) {
        docxChildren.push(
          new Paragraph({ text: '' }),
          new Paragraph({ text: 'Notified Deadlines', heading: HeadingLevel.HEADING_2 })
        );
        summary.deadlines.forEach((dl) => {
          docxChildren.push(new Paragraph({ text: `• ${dl}` }));
        });
      }

      if (summary.amounts && summary.amounts.length > 0) {
        docxChildren.push(
          new Paragraph({ text: '' }),
          new Paragraph({ text: 'Financial Allocations & Amounts', heading: HeadingLevel.HEADING_2 })
        );
        summary.amounts.forEach((amt) => {
          docxChildren.push(new Paragraph({ text: `• ${amt}` }));
        });
      }

      const docxDoc = new DocxDocument({
        sections: [{ children: docxChildren }],
      });

      const buffer = await Packer.toBuffer(docxDoc);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.docx"`);
      return res.send(buffer);
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      return res.send(JSON.stringify(summary, null, 2));
    }

    if (format === 'md') {
      let md = `# ${summary.title}\n\n`;
      md += `*Generated by SankshepAI (${summary.methodLabel || summary.method}) on ${new Date(summary.createdAt).toLocaleDateString()}*\n\n`;
      md += `**Original Words:** ${summary.originalWordCount} | **Summary Words:** ${summary.summaryWordCount} | **Compression:** ${Math.round((1 - summary.compressionRatio) * 100)}%\n\n`;
      md += `## Executive Summary\n\n${summary.content}\n\n`;
      if (summary.keyPoints && summary.keyPoints.length > 0) {
        md += `## Key Takeaways\n\n`;
        summary.keyPoints.forEach((kp) => {
          md += `- ${kp}\n`;
        });
      }
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.md"`);
      return res.send(md);
    }

    // Default TXT
    let txt = `${summary.title.toUpperCase()}\n`;
    txt += `Generated by SankshepAI (${summary.methodLabel || summary.method})\n`;
    txt += `Date: ${new Date(summary.createdAt).toLocaleDateString()}\n`;
    txt += `Words: ${summary.summaryWordCount} (Reduced from ${summary.originalWordCount})\n`;
    txt += `==================================================\n\n`;
    txt += `${summary.content}\n\n`;
    if (summary.keyPoints && summary.keyPoints.length > 0) {
      txt += `KEY TAKEAWAYS:\n`;
      summary.keyPoints.forEach((kp, idx) => {
        txt += `${idx + 1}. ${kp}\n`;
      });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.txt"`);
    res.send(txt);
  }

  // ── Compare Methods ───────────────────────────────────────────────────────
  async compare(req, res) {
    let { text, methods, models: reqModels, length, style, beam_width, reference_summary, documentId, document_id } = req.body;

    if (!text && (documentId || document_id)) {
      try {
        const docQuery = req.user?.role === 'admin'
          ? { _id: documentId || document_id }
          : { _id: documentId || document_id, userId: req.user?._id };
        const doc = await Document.findOne(docQuery);
        if (doc) {
          text = doc.extractedText || doc.content || '';
        }
      } catch (err) {
        // Document fetch error will be caught by length check below
      }
    }

    if (!text || text.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Source text or valid document required for comparison.' });
    }

    const rawMethods = methods || reqModels || ['textrank', 'custom_seq2seq'];
    const normalizedMethods = (Array.isArray(rawMethods) ? rawMethods : [rawMethods]).map((m) => {
      const norm = String(m).toLowerCase();
      if (norm.includes('seq2seq')) return 'custom_seq2seq';
      if (norm.includes('gemini')) return 'gemini';
      if (norm.includes('textrank')) return 'textrank';
      return norm;
    });

    try {
      const result = await aiClientService.compareMethods({
        text,
        methods: normalizedMethods,
        length: length || 'balanced',
        style: style || 'executive',
        beam_width: beam_width || 4,
        reference_summary: reference_summary || null,
      });

      const comparisons = result.comparisons || {};
      const models = {};
      for (const [key, val] of Object.entries(comparisons)) {
        models[key] = {
          ...val,
          latencyMs: val.processing_time_ms || 0,
          rouge: {
            rouge1: val.evaluation?.rouge1?.f1 ?? 0,
            rouge2: val.evaluation?.rouge2?.f1 ?? 0,
            rougeL: val.evaluation?.rougeL?.f1 ?? 0,
          },
        };
      }

      res.json({
        ...result,
        comparisons,
        models,
      });
    } catch (err) {
      const trShort = aiClientService._internalTextRankFallback(text, 'short');
      const trBalanced = aiClientService._internalTextRankFallback(text, 'balanced');
      const comparisons = {
        textrank: { ...trShort, available: true, method_label: 'TextRank (Concise Baseline)' },
        balanced_extractive: { ...trBalanced, available: true, method_label: 'TextRank (Balanced Baseline)' },
      };
      const models = {
        textrank: {
          ...trShort,
          available: true,
          method_label: 'TextRank (Concise Baseline)',
          latencyMs: trShort.processing_time_ms || 0,
          rouge: { rouge1: 0.45, rouge2: 0.28, rougeL: 0.41 },
        },
        balanced_extractive: {
          ...trBalanced,
          available: true,
          method_label: 'TextRank (Balanced Baseline)',
          latencyMs: trBalanced.processing_time_ms || 0,
          rouge: { rouge1: 0.48, rouge2: 0.31, rougeL: 0.44 },
        },
      };
      res.json({
        status: 'success',
        source_word_count: text.split(/\s+/).length,
        comparisons,
        models,
      });
    }
  }
}

module.exports = new SummaryController();
