import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Sparkles,
  ArrowLeft,
  Copy,
  Download,
  Edit3,
  History,
  FileText,
  Clock,
  CheckCircle2,
  Trash2,
  BookmarkPlus,
  AlertCircle,
  Layers,
  Cpu
} from 'lucide-react';
import { summaryApi, downloadBlob } from '../../lib/api';

const METHOD_LABELS = {
  textrank_baseline: 'TextRank Baseline',
  custom_seq2seq_attention: 'Custom Seq2Seq Attention',
  gemini_api_fallback: 'Gemini API Fallback',
};

export default function SummaryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [versions, setVersions] = useState([]);
  const [activeVersion, setActiveVersion] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [sumRes, verRes] = await Promise.all([
          summaryApi.get(id),
          summaryApi.getVersions(id),
        ]);

        if (sumRes.data.success) {
          setSummary(sumRes.data.summary);
          setEditedText(sumRes.data.summary.content);
        }
        if (verRes.data.success) {
          setVersions(verRes.data.versions);
        }
      } catch (err) {
        toast.error('Failed to load summary details.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleSaveVersion = async () => {
    if (!editedText.trim()) return toast.error('Content cannot be empty.');
    try {
      const res = await summaryApi.update(id, {
        content: editedText.trim(),
        changeNote: changeNote.trim() || 'Manual user edit',
      });
      if (res.data.success) {
        setSummary(res.data.summary);
        setIsEditing(false);
        setChangeNote('');
        toast.success('New version saved successfully.');

        // Refresh versions
        const verRes = await summaryApi.getVersions(id);
        if (verRes.data.success) setVersions(verRes.data.versions);
      }
    } catch {
      toast.error('Failed to save version.');
    }
  };

  const handleExport = async (format) => {
    try {
      const res = await summaryApi.export(id, format);
      const ext = format === 'pdf' ? 'pdf' : format === 'docx' ? 'docx' : format === 'md' ? 'md' : format === 'json' ? 'json' : 'txt';
      downloadBlob(res.data, `${summary.title.replace(/\s+/g, '_')}.${ext}`);
      toast.success(`Exported as .${ext.toUpperCase()}`);
    } catch {
      toast.error('Export failed.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this summary and its entire version history?')) return;
    try {
      await summaryApi.delete(id);
      toast.success('Summary deleted.');
      navigate('/app/summaries');
    } catch {
      toast.error('Delete failed.');
    }
  };

  if (isLoading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading summary...</div>;
  }

  if (!summary) {
    return (
      <div className="py-20 text-center text-slate-400">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
        <div>Summary not found.</div>
        <Link to="/app/summaries" className="text-cyan-400 text-xs underline mt-2 block">
          Back to library
        </Link>
      </div>
    );
  }

  const currentContent = activeVersion ? activeVersion.content : summary.content;
  const currentKeyPoints = activeVersion?.keyPoints || summary.keyPoints || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/app/summaries"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                {METHOD_LABELS[summary.method] || summary.method}
              </span>
              <span className="text-xs text-slate-500">v{summary.version}</span>
              {summary.isEdited && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  Edited
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{summary.title}</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(currentContent);
              toast.success('Summary copied to clipboard!');
            }}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            className="px-3 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('docx')}
            className="px-3 py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/30 text-xs font-semibold"
          >
            DOCX
          </button>
          <button
            type="button"
            onClick={() => handleExport('txt')}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
          >
            TXT
          </button>
          <button
            type="button"
            onClick={() => handleExport('md')}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
          >
            MD
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Main Summary Box ──────────────────────────────────────────────── */}
        <div className="lg:col-span-8 bg-[#0E1526] p-6 sm:p-8 rounded-2xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>
                Summary Words: <strong className="text-white">{summary.summaryWordCount}</strong>
              </span>
              <span>&bull;</span>
              <span>
                Original: <strong className="text-slate-300">{summary.originalWordCount}</strong>
              </span>
              <span>&bull;</span>
              <span className="text-emerald-400 font-bold">
                {Math.round((1 - summary.compressionRatio) * 100)}% compressed
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel' : 'Edit Text'}</span>
            </button>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <textarea
                rows={8}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full p-4 rounded-xl bg-[#070B14] border border-cyan-400 text-white text-sm focus:outline-none leading-relaxed whitespace-pre-line"
              />
              <input
                type="text"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="Brief note describing your edit (optional)..."
                className="w-full px-4 py-2 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={handleSaveVersion}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold"
              >
                Save as v{(summary.version || 1) + 1}
              </button>
            </div>
          ) : (
            <div className="text-sm leading-relaxed text-slate-100 whitespace-pre-line font-sans">
              {currentContent}
            </div>
          )}

          {/* Key Takeaways */}
          {currentKeyPoints.length > 0 && (
            <div className="pt-6 border-t border-white/5 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Key Takeaways
              </span>
              <div className="space-y-2">
                {currentKeyPoints.map((kp, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{kp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ROUGE Scores if available */}
          {summary.evaluation?.available && (
            <div className="p-4 rounded-xl bg-[#070B14] border border-white/5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                ROUGE Benchmark Evaluation (Against Ground-Truth)
              </span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-slate-500">ROUGE-1</div>
                  <div className="text-sm font-bold text-cyan-400">
                    {Math.round(summary.evaluation.rouge1.f1 * 100)}%
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-slate-500">ROUGE-2</div>
                  <div className="text-sm font-bold text-indigo-400">
                    {Math.round(summary.evaluation.rouge2.f1 * 100)}%
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-slate-500">ROUGE-L</div>
                  <div className="text-sm font-bold text-violet-400">
                    {Math.round(summary.evaluation.rougeL.f1 * 100)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column: Version History & Metadata ──────────────────────── */}
        <div className="lg:col-span-4 space-y-6">
          {/* Version History Drawer */}
          <div className="bg-[#0E1526] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Version History ({versions.length})</h2>
            </div>

            <div className="space-y-2">
              {versions.map((ver) => {
                const isSelected = activeVersion?._id === ver._id || (!activeVersion && ver.versionNumber === summary.version);
                return (
                  <button
                    key={ver._id}
                    type="button"
                    onClick={() => setActiveVersion(ver)}
                    className={`w-full p-3 rounded-xl border text-left text-xs transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-400 text-white'
                        : 'bg-[#070B14] border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>Version {ver.versionNumber}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(ver.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 truncate">
                      {ver.changeNote || (ver.editedByUser ? 'User edited' : 'AI generated')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Linked Source Document */}
          {summary.documentId && (
            <div className="bg-[#0E1526] p-6 rounded-2xl border border-white/10 shadow-xl space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Source Document
              </span>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    {summary.documentId.title || 'Linked Document'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {summary.documentId.originalFilename}
                  </div>
                </div>
              </div>
              <Link
                to={`/app/documents/${summary.documentId._id || summary.documentId}`}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold block pt-1"
              >
                Inspect original document &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
