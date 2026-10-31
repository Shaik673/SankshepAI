import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Sparkles,
  Search,
  Filter,
  Copy,
  Download,
  Trash2,
  Eye,
  FileText,
  Clock,
  Layers,
  Cpu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { summaryApi, downloadBlob } from '../../lib/api';

const METHOD_LABELS = {
  textrank_baseline: 'TextRank Baseline',
  custom_seq2seq_attention: 'Custom Seq2Seq Attention',
  gemini_api_fallback: 'Gemini API Fallback',
};

export default function SummaryLibraryPage() {
  const [summaries, setSummaries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummaries = async (pageNum = page, searchQuery = search, method = methodFilter) => {
    setIsLoading(true);
    try {
      const res = await summaryApi.list({
        page: pageNum,
        limit: 10,
        search: searchQuery,
        method,
      });
      if (res.data.success) {
        setSummaries(res.data.summaries);
        setTotal(res.data.pagination.total);
        setPages(res.data.pagination.pages);
      }
    } catch {
      toast.error('Failed to load summaries.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries(page, search, methodFilter);
  }, [page, methodFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchSummaries(1, search, methodFilter);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this summary and its version history?')) return;
    try {
      await summaryApi.delete(id);
      toast.success('Summary deleted.');
      fetchSummaries(page, search, methodFilter);
    } catch {
      toast.error('Failed to delete summary.');
    }
  };

  const handleExport = async (id, title, format) => {
    try {
      const res = await summaryApi.export(id, format);
      const ext = format === 'pdf' ? 'pdf' : format === 'docx' ? 'docx' : format === 'md' ? 'md' : format === 'json' ? 'json' : 'txt';
      downloadBlob(res.data, `${title.replace(/\s+/g, '_')}.${ext}`);
      toast.success(`Exported as .${ext.toUpperCase()}`);
    } catch {
      toast.error('Export failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Summary Library</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, compare, export, and review version histories of all generated summaries.
          </p>
        </div>

        <Link
          to="/app/new-summary"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30"
        >
          <Sparkles className="w-4 h-4" />
          <span>New Summary</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-[#0E1526] rounded-2xl border border-white/10 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search summaries by title..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 placeholder:text-slate-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="">All NLP Engines</option>
            <option value="textrank_baseline">TextRank Baseline</option>
            <option value="custom_seq2seq_attention">Custom Seq2Seq Attention</option>
            <option value="gemini_api_fallback">Gemini API Fallback</option>
          </select>
        </div>
      </div>

      {/* Summaries List */}
      <div className="bg-[#0E1526] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-slate-400">Loading summaries...</div>
        ) : summaries.length > 0 ? (
          <div className="divide-y divide-white/5">
            {summaries.map((sum) => (
              <div key={sum._id} className="p-5 hover:bg-white/[0.015] transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        sum.method === 'custom_seq2seq_attention'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                          : sum.method === 'textrank_baseline'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                      }`}
                    >
                      {METHOD_LABELS[sum.method] || sum.method}
                    </span>
                    <span className="text-xs text-slate-500">v{sum.version || 1}</span>
                    {sum.isEdited && (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        User Edited
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-3">
                    <span>
                      Words: <strong className="text-white">{sum.summaryWordCount}</strong> (from {sum.originalWordCount})
                    </span>
                    <span>&bull;</span>
                    <span className="text-emerald-400 font-semibold">
                      {Math.round((1 - sum.compressionRatio) * 100)}% reduced
                    </span>
                  </div>
                </div>

                <Link
                  to={`/app/summaries/${sum._id}`}
                  className="text-base font-bold text-white hover:text-cyan-400 transition-colors block"
                >
                  {sum.title}
                </Link>

                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {sum.content}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{new Date(sum.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(sum.content);
                        toast.success('Copied to clipboard!');
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                      title="Copy Summary"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport(sum._id, sum.title, 'txt')}
                      className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 font-medium"
                    >
                      .TXT
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport(sum._id, sum.title, 'md')}
                      className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 font-medium"
                    >
                      .MD
                    </button>
                    <Link
                      to={`/app/summaries/${sum._id}`}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold"
                    >
                      Inspect & Versions
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(sum._id)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-xs text-slate-500">
            <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <div>No summaries found matching your query.</div>
            <Link to="/app/new-summary" className="mt-2 text-cyan-400 font-semibold underline block">
              Generate a summary
            </Link>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="p-4 bg-[#070B14] border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <div>
              Page {page} of {pages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
