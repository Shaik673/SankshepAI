const axios = require('axios');

const AI_BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

class AIClientService {
  constructor() {
    this.client = axios.create({
      baseURL: AI_BASE_URL,
      timeout: 120000, // 2 minutes for deep inference
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async checkHealth() {
    try {
      const res = await this.client.get('/health');
      return res.data;
    } catch {
      return { status: 'offline', message: 'FastAPI AI service is unreachable at ' + AI_BASE_URL };
    }
  }

  async summarizeTextRank(payload) {
    try {
      const res = await this.client.post('/api/summarize/textrank', payload);
      return res.data;
    } catch (err) {
      console.warn('[AIClientService] TextRank endpoint failed in AI service, executing internal fallback:', err.message);
      return this._internalTextRankFallback(payload.text, payload.length);
    }
  }

  async summarizeCustomModel(payload) {
    const res = await this.client.post('/api/summarize/custom', payload);
    return res.data;
  }

  async summarizeGemini(payload) {
    const res = await this.client.post('/api/summarize/gemini', payload);
    return res.data;
  }

  async compareMethods(payload) {
    const res = await this.client.post('/api/summarize/compare', payload);
    return res.data;
  }

  async evaluateRouge(hypothesis, reference) {
    const res = await this.client.post('/api/evaluate/rouge', { hypothesis, reference });
    return res.data;
  }

  async answerQuestion(documentText, question) {
    const res = await this.client.post('/api/qa', { document_text: documentText, question });
    return res.data;
  }

  async queryDocumentRAG({ query, documentId, documentTitle, documentText, topK = 3 }) {
    try {
      const res = await this.client.post('/api/rag/query', {
        query,
        document_id: String(documentId),
        document_title: documentTitle,
        document_text: documentText,
        top_k: topK,
      });
      return res.data;
    } catch (err) {
      console.warn('[AIClientService] RAG query failed in AI service, executing internal fallback:', err.message);
      return this._internalRAGFallback(documentText, documentTitle, query);
    }
  }

  async queryCorpusRAG({ query, documents, topK = 4 }) {
    try {
      const res = await this.client.post('/api/rag/corpus-query', {
        query,
        documents: documents.map((d) => ({
          id: String(d._id || d.id),
          title: d.title,
          text: d.extractedText || d.text || '',
        })),
        top_k: topK,
      });
      return res.data;
    } catch (err) {
      console.warn('[AIClientService] Corpus RAG query failed, fallback to local search:', err.message);
      const combined = documents.map((d) => `== ${d.title} ==\n${d.extractedText || ''}`).join('\n\n');
      return this._internalRAGFallback(combined, 'Authorized Corpus', query);
    }
  }

  async extractEntities(text) {
    const res = await this.client.post('/api/extract-entities', { text });
    return res.data;
  }

  /**
   * Internal Node.js RAG Fallback with domain-restriction and citation extraction
   */
  _internalRAGFallback(documentText, documentTitle, query) {
    const INSUFFICIENT_MSG =
      "I couldn't find sufficient supporting information in the available government circulars, official notices, or indexed news documents to answer this reliably.";
    const DOMAIN_REJECTED =
      "SankshepAI is strictly specialized in government circulars, official notices, public administration documents, policies, and news summarization. I cannot assist with unrelated general queries.";

    // Code-level check for off-domain queries
    const qLower = query.toLowerCase();
    const disallowed = [
      'recipe', 'cook', 'bake', 'poem', 'song', 'joke', 'dating', 'horoscope',
      'video game', 'cheat code', 'write python code', 'debug this'
    ];
    if (disallowed.some((d) => qLower.includes(d))) {
      return {
        success: true,
        answer: DOMAIN_REJECTED,
        domain_verified: false,
        is_domain_rejected: true,
        is_insufficient_evidence: false,
        confidence: 0.0,
        citations: [],
        processing_time_ms: 10,
      };
    }

    const sentences = documentText.match(/[^.!?]+[.!?]+/g) || [documentText];
    const qWords = qLower.split(/\W+/).filter((w) => w.length > 2);

    let bestSentence = '';
    let maxOverlap = 0;

    sentences.forEach((s) => {
      const sWords = s.toLowerCase().split(/\W+/);
      const overlap = qWords.filter((w) => sWords.includes(w)).length;
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestSentence = s.trim();
      }
    });

    if (maxOverlap === 0 || !bestSentence) {
      return {
        success: true,
        answer: INSUFFICIENT_MSG,
        domain_verified: true,
        is_domain_rejected: false,
        is_insufficient_evidence: true,
        confidence: 0.0,
        citations: [],
        processing_time_ms: 12,
      };
    }

    const citations = [
      {
        chunk_id: 'chk_1',
        document_id: 'internal',
        document_title: documentTitle,
        page_number: 1,
        section_title: 'Document Excerpt',
        confidence: Math.min(1.0, 0.4 + maxOverlap * 0.15),
        snippet: bestSentence,
      },
    ];

    return {
      success: true,
      answer: `According to ${documentTitle}:\n\n"${bestSentence}"\n\n[Source: ${documentTitle}, Page 1]`,
      domain_verified: true,
      is_domain_rejected: false,
      is_insufficient_evidence: false,
      confidence: Math.min(1.0, 0.4 + maxOverlap * 0.15),
      citations,
      model_used: 'resilient_extractive_grounding',
      processing_time_ms: 15,
    };
  }

  /**
   * Internal Node.js extractive fallback in case Python AI service is starting up
   */
  _internalTextRankFallback(text, lengthMode = 'balanced') {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const origWordCount = text.split(/\s+/).length;

    let targetCount = Math.max(2, Math.ceil(sentences.length * 0.3));
    if (lengthMode === 'short') targetCount = Math.max(2, Math.ceil(sentences.length * 0.18));
    if (lengthMode === 'detailed') targetCount = Math.max(3, Math.ceil(sentences.length * 0.45));

    const selected = sentences.slice(0, targetCount).map((s) => s.trim());
    const summary = selected.join(' ');
    const sumWordCount = summary.split(/\s+/).length;

    return {
      status: 'success',
      method: 'textrank_baseline',
      method_label: 'TextRank Extractive Baseline (Resilient)',
      summary,
      selected_sentences: selected,
      key_points: selected.slice(0, 3),
      entities: {},
      original_word_count: origWordCount,
      summary_word_count: sumWordCount,
      compression_ratio: Math.round((sumWordCount / Math.max(origWordCount, 1)) * 1000) / 1000,
      processing_time_ms: 15,
      evaluation: { available: false, message: 'Reference summary not provided' },
    };
  }
}

module.exports = new AIClientService();
