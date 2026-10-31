import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  SplitSquareVertical,
  Sparkles,
  Layers,
  Cpu,
  Clock,
  TrendingDown,
  CheckCircle2,
  Copy,
  Download,
  AlertCircle
} from 'lucide-react';
import { nlpApi, summaryApi, downloadBlob } from '../../lib/api';

const DEFAULT_COMPARE_TEXT = `The Ministry of Finance has issued Circular No. 14/2026 notifying all scheduled commercial banks regarding the updated priority sector lending targets. Under the revised guidelines, banks are mandated to allocate 40 percent of Adjusted Net Bank Credit (ANBC) to priority sectors, including micro, small, and medium enterprises (MSMEs), agriculture, and renewable energy. The new norms shall take effect from April 1, 2026, and all non-compliant institutions will be subject to penal interest levies as determined by the Reserve Bank of India.`;

export default function ComparePageWrapper() {
  const [searchParams] = useSearchParams();

  const [text, setText] = useState(searchParams.get('text') || DEFAULT_COMPARE_TEXT);
  const [reference, setReference] = useState(
    'Ministry of Finance issued Circular 14/2026 requiring commercial banks to allocate 40% of ANBC to priority sectors like MSMEs and agriculture starting April 1, 2026.'
  );
  const [beamWidth, setBeamWidth] = useState(4);
  const [lengthMode, setLengthMode] = useState('balanced');
  const [selectedMethods, setSelectedMethods] = useState(['textrank', 'custom_seq2seq', 'gemini']);

  const [isComparing, setIsComparing] = useState(false);
  const [results, setResults] = useState(null);

  const handleToggleMethod = (m) => {
    setSelectedMethods((prev) =>
      prev.includes(m) ? prev.filter((item) => item !== m) : [...prev, m]
    );
  };

  const handleRunComparison = async () => {
    if (!text.trim() || text.trim().length < 10) {
      return toast.error('Please enter at least 10 characters to compare.');
    }
    if (selectedMethods.length === 0) {
      return toast.error('Please select at least one method to compare.');
    }

    setIsComparing(true);
    setResults(null);

    try {
      let res;
      try {
        res = await nlpApi.compareModels({
          text,
          methods: selectedMethods,
          length: lengthMode,
          beam_width: beamWidth,
          reference_summary: reference.trim() || null,
        });
      } catch (nlpErr) {
        // Fallback to Express backend comparison
        res = await summaryApi.compare({
          text,
          methods: selectedMethods,
          length: lengthMode,
          beam_width: beamWidth,
          reference_summary: reference.trim() || null,
        });
      }

      if (res.data.status === 'success') {
        setResults(res.data);
        toast.success('Multi-model comparison completed!');
      }
    } catch (err) {
      toast.error(err.message || 'Comparison request failed.');
    } finally {
      setIsComparing(false);
    }
  };

  const handleExportCSV = () => {
    if (!results || !results.comparisons) return;
    let csv = 'Method,Summary Words,Compression Ratio,Runtime (ms),ROUGE-1 F1,ROUGE-2 F1,ROUGE-L F1,Summary Text\n';

    Object.entries(results.comparisons).forEach(([key, val]) => {
      if (val.available) {
        const r1 = val.evaluation?.rouge1?.f1 || 'N/A';
        const r2 = val.evaluation?.rouge2?.f1 || 'N/A';
        const rl = val.evaluation?.rougeL?.f1 || 'N/A';
        const cleanSummary = `"${(val.summary || '').replace(/"/g, '""')}"`;
        csv += `${val.method_label},${val.word_count},${val.compression_ratio},${val.processing_time_ms},${r1},${r2},${rl},${cleanSummary}\n`;
      }
    });

    downloadBlob(csv, 'sankshepai_model_comparison.csv');
    toast.success('Comparison exported to CSV.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Compare Summarization Methods</h1>
          <p className="text-xs text-slate-400 mt-1">
            Run TextRank, Custom Attention Seq2Seq, and Gemini side-by-side on identical source text to evaluate differences in synthesis, compression, and ROUGE metrics.
          </p>
        </div>

        {results && (
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-2 border border-white/10"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Comparison (CSV)</span>
          </button>
        )}
      </div>

      {/* Input Controls */}
      <div className="bg-[#0E1526] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Source Document Text
            </label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste text to compare..."
              className="w-full p-3 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 leading-relaxed font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Optional Reference Summary (for ROUGE scoring)
            </label>
            <textarea
              rows={4}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Human ground-truth reference summary..."
              className="w-full p-3 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 leading-relaxed font-sans"
            />
          </div>
        </div>

        {/* Method Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">Include:</span>
            {[
              { id: 'textrank', label: 'TextRank Extractive' },
              { id: 'custom_seq2seq', label: 'Custom Attention Seq2Seq' },
              { id: 'gemini', label: 'Gemini Fallback' },
            ].map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMethods.includes(m.id)}
                  onChange={() => handleToggleMethod(m.id)}
                  className="rounded accent-cyan-400"
                />
                <span>{m.label}</span>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={handleRunComparison}
            disabled={isComparing}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-400 hover:from-indigo-500 hover:to-cyan-300 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          >
            <SplitSquareVertical className="w-4 h-4" />
            <span>{isComparing ? 'Running Models...' : 'Execute Comparison'}</span>
          </button>
        </div>
      </div>

      {/* ── Comparison Results Grid ──────────────────────────────────────────── */}
      {results && results.comparisons && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: TextRank */}
          {results.comparisons.textrank && (
            <div className="bg-[#0E1526] rounded-2xl border border-white/10 p-6 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white">TextRank Baseline</h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Extractive
                  </span>
                </div>

                {results.comparisons.textrank.available ? (
                  <>
                    <div className="p-3.5 bg-[#070B14] rounded-xl border border-white/5 text-xs text-slate-200 leading-relaxed min-h-[140px]">
                      {results.comparisons.textrank.summary}
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <div className="text-[10px] text-slate-400">Words</div>
                        <div className="text-sm font-bold text-white">{results.comparisons.textrank.word_count}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <div className="text-[10px] text-slate-400">Latency</div>
                        <div className="text-sm font-bold text-white">{results.comparisons.textrank.processing_time_ms}ms</div>
                      </div>
                    </div>

                    {/* ROUGE */}
                    {results.comparisons.textrank.evaluation?.available && (
                      <div className="p-2.5 rounded-lg bg-[#070B14] border border-white/5 space-y-1 text-xs">
                        <div className="text-[10px] font-semibold text-slate-400">ROUGE F1 Benchmark</div>
                        <div className="flex justify-between text-[11px]">
                          <span>R-1: <strong className="text-cyan-400">{Math.round(results.comparisons.textrank.evaluation.rouge1.f1 * 100)}%</strong></span>
                          <span>R-2: <strong className="text-indigo-400">{Math.round(results.comparisons.textrank.evaluation.rouge2.f1 * 100)}%</strong></span>
                          <span>R-L: <strong className="text-violet-400">{Math.round(results.comparisons.textrank.evaluation.rougeL.f1 * 100)}%</strong></span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-rose-400 p-4 bg-rose-500/10 rounded-xl">
                    {results.comparisons.textrank.error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card 2: Custom Attention Seq2Seq */}
          {results.comparisons.custom_seq2seq && (
            <div className="bg-[#0E1526] rounded-2xl border border-cyan-500/30 p-6 flex flex-col justify-between shadow-xl shadow-cyan-500/5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">Custom Seq2Seq Attention</h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    Neural Abstractive
                  </span>
                </div>

                {results.comparisons.custom_seq2seq.available ? (
                  <>
                    <div className="p-3.5 bg-[#070B14] rounded-xl border border-white/5 text-xs text-slate-200 leading-relaxed min-h-[140px]">
                      {results.comparisons.custom_seq2seq.summary}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <div className="text-[10px] text-slate-400">Words</div>
                        <div className="text-sm font-bold text-white">{results.comparisons.custom_seq2seq.word_count}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <div className="text-[10px] text-slate-400">Latency</div>
                        <div className="text-sm font-bold text-white">{results.comparisons.custom_seq2seq.processing_time_ms}ms</div>
                      </div>
                    </div>

                    {results.comparisons.custom_seq2seq.evaluation?.available && (
                      <div className="p-2.5 rounded-lg bg-[#070B14] border border-white/5 space-y-1 text-xs">
                        <div className="text-[10px] font-semibold text-slate-400">ROUGE F1 Benchmark</div>
                        <div className="flex justify-between text-[11px]">
                          <span>R-1: <strong className="text-cyan-400">{Math.round(results.comparisons.custom_seq2seq.evaluation.rouge1.f1 * 100)}%</strong></span>
                          <span>R-2: <strong className="text-indigo-400">{Math.round(results.comparisons.custom_seq2seq.evaluation.rouge2.f1 * 100)}%</strong></span>
                          <span>R-L: <strong className="text-violet-400">{Math.round(results.comparisons.custom_seq2seq.evaluation.rougeL.f1 * 100)}%</strong></span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-amber-400 p-4 bg-amber-500/10 rounded-xl">
                    {results.comparisons.custom_seq2seq.error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card 3: Gemini Fallback */}
          {results.comparisons.gemini && (
            <div className="bg-[#0E1526] rounded-2xl border border-white/10 p-6 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <h3 className="text-sm font-bold text-white">Gemini Fallback</h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    External API
                  </span>
                </div>

                {results.comparisons.gemini.available ? (
                  <>
                    <div className="p-3.5 bg-[#070B14] rounded-xl border border-white/5 text-xs text-slate-200 leading-relaxed min-h-[140px]">
                      {results.comparisons.gemini.summary}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <div className="text-[10px] text-slate-400">Words</div>
                        <div className="text-sm font-bold text-white">{results.comparisons.gemini.word_count}</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <div className="text-[10px] text-slate-400">Latency</div>
                        <div className="text-sm font-bold text-white">{results.comparisons.gemini.processing_time_ms}ms</div>
                      </div>
                    </div>

                    {results.comparisons.gemini.evaluation?.available && (
                      <div className="p-2.5 rounded-lg bg-[#070B14] border border-white/5 space-y-1 text-xs">
                        <div className="text-[10px] font-semibold text-slate-400">ROUGE F1 Benchmark</div>
                        <div className="flex justify-between text-[11px]">
                          <span>R-1: <strong className="text-cyan-400">{Math.round(results.comparisons.gemini.evaluation.rouge1.f1 * 100)}%</strong></span>
                          <span>R-2: <strong className="text-indigo-400">{Math.round(results.comparisons.gemini.evaluation.rouge2.f1 * 100)}%</strong></span>
                          <span>R-L: <strong className="text-violet-400">{Math.round(results.comparisons.gemini.evaluation.rougeL.f1 * 100)}%</strong></span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-slate-500 p-4 bg-[#070B14] rounded-xl border border-white/5">
                    {results.comparisons.gemini.error || 'Gemini API not configured on server.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
