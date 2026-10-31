import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with conflict resolution
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format file size in human-readable form
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format date to relative string (e.g. "2 hours ago")
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return d.toLocaleDateString();
}

/**
 * Format date to readable string
 */
export function formatDate(date, options = {}) {
  const d = new Date(date);
  const defaults = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  return d.toLocaleDateString('en-US', defaults);
}

/**
 * Format duration in ms to human-readable
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

/**
 * Calculate compression ratio percentage
 */
export function calcCompressionRatio(original, summary) {
  if (!original || original === 0) return 0;
  return Math.round((1 - summary / original) * 100);
}

/**
 * Count words in text
 */
export function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Estimate reading time in minutes
 */
export function estimateReadingTime(text, wpm = 200) {
  const words = countWords(text);
  const minutes = Math.ceil(words / wpm);
  return minutes === 1 ? '1 min read' : `${minutes} min read`;
}

/**
 * Truncate text to maxLength with ellipsis
 */
export function truncate(text, maxLength = 100) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename) {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
}

/**
 * Get MIME type icon key
 */
export function getFileTypeLabel(mimeType) {
  if (!mimeType) return 'document';
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('word') || mimeType.includes('docx')) return 'DOCX';
  if (mimeType.includes('text/plain')) return 'TXT';
  if (mimeType.includes('markdown')) return 'MD';
  return 'DOC';
}

/**
 * Generate a random ID (client-side only, not for security)
 */
export function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

/**
 * Debounce function
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Capitalize first letter
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Get method display info
 */
export const METHOD_INFO = {
  textrank: {
    label: 'TextRank',
    description: 'Extractive summarization using graph-based ranking',
    color: 'amber',
    className: 'method-label-textrank',
  },
  custom_model: {
    label: 'Custom Model',
    description: 'Encoder-decoder LSTM with Bahdanau attention',
    color: 'indigo',
    className: 'method-label-custom',
  },
  gemini: {
    label: 'Gemini AI',
    description: 'Google Gemini API fallback',
    color: 'cyan',
    className: 'method-label-gemini',
  },
  pretrained: {
    label: 'Pretrained',
    description: 'Pretrained transformer model',
    color: 'violet',
    className: 'method-label-pretrained',
  },
};

/**
 * Get status badge config
 */
export const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'graphite' },
  processing: { label: 'Processing', color: 'amber' },
  completed: { label: 'Completed', color: 'emerald' },
  failed: { label: 'Failed', color: 'rose' },
};

/**
 * Validate email format
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Password strength checker
 */
export function checkPasswordStrength(password) {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    long: password.length >= 12,
  };

  score += checks.length ? 1 : 0;
  score += checks.uppercase ? 1 : 0;
  score += checks.lowercase ? 1 : 0;
  score += checks.number ? 1 : 0;
  score += checks.special ? 2 : 0;
  score += checks.long ? 1 : 0;

  let strength, color, label;
  if (score < 2) { strength = 'very-weak'; color = 'rose'; label = 'Very weak'; }
  else if (score < 3) { strength = 'weak'; color = 'rose'; label = 'Weak'; }
  else if (score < 4) { strength = 'fair'; color = 'amber'; label = 'Fair'; }
  else if (score < 5) { strength = 'good'; color = 'emerald'; label = 'Good'; }
  else { strength = 'strong'; color = 'cyan'; label = 'Strong'; }

  return { score, strength, color, label, checks };
}
