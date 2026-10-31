import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  FileText,
  Sparkles,
  ArrowLeft,
  Copy,
  Search,
  MessageSquare,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send
} from 'lucide-react';
import { documentApi, summaryApi, nlpApi } from '../../lib/api';

export default function DocumentDetailPage() {
  const { id } = useParams();

  const [document, setDocument] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Q&A State
  const [question, setQuestion] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaResult, setQaResult] = useState(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [docRes, sumRes] = await Promise.all([
          documentApi.get(id),
          summaryApi.list({ limit: 10 }),
        ]);

        if (docRes.data.success) {
          setDocument(docRes.data.document);
        }
        if (sumRes.data.success) {
          // Filter summaries belonging to this document
          const matched = sumRes.data.summaries.filter(
            (s) => s.documentId?._id === id || s.documentId === id
          );
          setSummaries(matched);
        }
      } catch (err) {
        toast.error('Failed to load document details.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setQaLoading(true);
    setQaResult(null);

    try {
      const res = await documentApi.ask(id, question.trim());
      if (res.data.success) {
        setQaResult(res.data);
      } else {
        toast.error(res.data.message || 'Failed to get answer.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to query document.');
      setQaResult({
        answer: "I couldn't find sufficient supporting information in the available government circulars, official notices, or indexed news documents to answer this reliably.",
        confidence: 0.0,
        is_insufficient_evidence: true,
        citations: [],
      });
    } finally {
      setQaLoading(false);
    }
  };

  if (isLoading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading document...</div>;
  }

  if (!document) {
    return (
      <div className="py-20 text-center text-slate-400">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
        <div>Document not found or access denied.</div>
        <Link to="/app/documents" className="text-cyan-400 text-xs underline mt-2 block">
          Back to documents
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button and title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/app/documents"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{document.title}</h1>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{document.originalFilename}</span>
              <span>&bull;</span>
              <span>{document.wordCount?.toLocaleString()} words</span>
              <span>&bull;</span>
              <span>{new Date(document.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <Link
          to={`/app/new-summary?docId=${document._id}`}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate Summary</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Extracted Text ────────────────────────────────────── */}
        <div className="lg:col-span-7 bg-[#0E1526] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Extracted Document Text
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(document.extractedText);
                toast.success('Text copied to clipboard!');
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Full Text</span>
            </button>
          </div>

          <div className="p-4 bg-[#070B14] rounded-xl border border-white/5 text-slate-200 text-sm leading-relaxed max-h-[550px] overflow-y-auto whitespace-pre-line font-sans">
            {document.extractedText}
          </div>
        </div>

        {/* ── Right Column: Grounded QA & Linked Summaries ────────────────────── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Grounded Question Answering Panel */}
          <div className="bg-[#0E1526] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Ask Questions on this Document</h2>
            </div>
            <p className="text-xs text-slate-400">
              Answers are extracted strictly from the document above. If the information is not present in the text, the model will not invent answers.
            </p>

            <form onSubmit={handleAskQuestion} className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. What is the effective date of this policy?"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  disabled={qaLoading || !question.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {qaLoading && (
              <div className="p-4 bg-[#070B14] rounded-xl text-center text-xs text-slate-400 animate-pulse">
                Searching source document for verified context...
              </div>
            )}

            {qaResult && (
              <div className="p-4 bg-[#070B14] rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Grounded Answer</span>
                  {qaResult.is_domain_rejected ? (
                    <span className="text-[10px] text-rose bg-rose/10 px-2 py-0.5 rounded-full border border-rose/30">
                      Off-Domain Filtered
                    </span>
                  ) : qaResult.is_insufficient_evidence ? (
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Insufficient Evidence
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Confidence: {Math.round((qaResult.confidence || 0.85) * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">{qaResult.answer}</p>

                {qaResult.citations && qaResult.citations.length > 0 && (
                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                      Source Citations ({qaResult.citations.length})
                    </span>
                    {qaResult.citations.map((c, idx) => (
                      <div key={idx} className="p-2 rounded bg-white/5 text-[11px] text-slate-300 border border-white/5">
                        <div className="flex justify-between items-center text-cyan-400 text-[10px] mb-1 font-mono">
                          <span>Page {c.page_number} &bull; {c.chunk_id}</span>
                          <span>Relevance: {Math.round((c.confidence || 0.8) * 100)}%</span>
                        </div>
                        <p className="italic text-slate-400 text-[10.5px]">"{c.snippet}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Linked Summaries */}
          <div className="bg-[#0E1526] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white">Linked Summaries ({summaries.length})</h2>
            {summaries.length > 0 ? (
              <div className="space-y-2">
                {summaries.map((sum) => (
                  <Link
                    key={sum._id}
                    to={`/app/summaries/${sum._id}`}
                    className="p-3 rounded-xl bg-[#070B14] border border-white/5 hover:border-white/15 block transition-all"
                  >
                    <div className="text-xs font-semibold text-white truncate">{sum.title}</div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                      <span className="text-cyan-400 font-mono">{sum.method}</span>
                      <span>&bull;</span>
                      <span>{sum.summaryWordCount} words</span>
                      <span>&bull;</span>
                      <span>{new Date(sum.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                No summaries generated for this document yet.{' '}
                <Link
                  to={`/app/new-summary?docId=${document._id}`}
                  className="text-cyan-400 font-semibold underline"
                >
                  Generate one now
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
