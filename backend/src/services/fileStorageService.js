const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const axios = require('axios');
const { URL } = require('url');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

class FileStorageService {
  /**
   * Extract readable text from uploaded file buffer or path
   */
  async extractText(filePath, mimeType) {
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found on server storage');
    }

    const buffer = await fs.promises.readFile(filePath);

    if (mimeType === 'application/pdf') {
      const data = await pdfParse(buffer);
      return data.text || '';
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      const res = await mammoth.extractRawText({ buffer });
      return res.value || '';
    }

    // Default plain text / markdown / csv
    return buffer.toString('utf-8');
  }

  /**
   * SSRF-safe URL content fetcher
   */
  async fetchUrlContent(targetUrl) {
    const parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid URL protocol. Only HTTP and HTTPS are permitted.');
    }

    const host = parsed.hostname.toLowerCase();
    // Block private and link-local ranges
    const privatePatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^0\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ];

    if (privatePatterns.some((pattern) => pattern.test(host))) {
      throw new Error('Access to private or local network addresses is forbidden.');
    }

    const response = await axios.get(targetUrl, {
      timeout: 10000,
      maxContentLength: 2 * 1024 * 1024, // 2MB limit
      headers: {
        'User-Agent': 'SankshepAI-Bot/1.0 (+https://sankshep.ai)',
        Accept: 'text/html,application/xhtml+xml,text/plain',
      },
    });

    const raw = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    // Strip HTML tags for clean text extraction
    const cleanText = raw
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleanText;
  }
}

module.exports = new FileStorageService();
