import React from 'react';
import {
  BookOpen,
  Layers,
  Cpu,
  Sparkles,
  HelpCircle,
  Code2,
  FileText,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Documentation & Research Guide</h1>
        <p className="text-xs text-slate-400 mt-1">
          Technical specifications, theoretical formulas, NLP algorithms, and viva defense reference documentation for SankshepAI.
        </p>
      </div>

      {/* ── Section 1: Summarization Engines ─────────────────────────────────── */}
      <div className="bg-[#0E1526] p-6 sm:p-8 rounded-2xl border border-white/10 shadow-xl space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <span>1. Summarization Architectures</span>
        </h2>

        {/* TextRank */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-cyan-400">Method A — TextRank Graph Extractive Baseline</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            TextRank is an unsupervised graph-based ranking algorithm derived from PageRank. A graph $G = (V, E)$ is constructed where each vertex $V_i$ represents a sentence in the input document. The edge weight $W_{ij}$ between two sentences is defined by their TF-IDF cosine similarity.
          </p>
          <div className="p-3 bg-[#070B14] rounded-xl border border-white/5 font-mono text-xs text-slate-300">
            PR(V_i) = (1 - d) + d &times; &sum;<sub>V_j &in; In(V_i)</sub> [ W_ji / &sum;<sub>V_k &in; Out(V_j)</sub> W_jk ] &times; PR(V_j)
          </div>
          <p className="text-xs text-slate-400">
            Sentences are iteratively scored using power iteration until convergence (&Delta; &le; 10<sup>-4</sup>). Top ranked sentences are extracted and re-sorted by their original narrative position to preserve contextual flow.
          </p>
        </div>

        {/* Custom Seq2Seq */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <h3 className="text-sm font-bold text-indigo-400">Method B — Custom Recurrent Seq2Seq with Attention</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            The abstractive model comprises a Bidirectional Gated Recurrent Unit (BiGRU) encoder and an Attention-augmented GRU decoder. At each decoding step $t$, the attention mechanism calculates an alignment score $e_{t,i}$ between decoder hidden state $s_{t-1}$ and all encoder states $h_i$:
          </p>
          <div className="p-3 bg-[#070B14] rounded-xl border border-white/5 font-mono text-xs text-slate-300 space-y-1">
            <div>Bahdanau Additive: e<sub>t,i</sub> = v<sub>a</sub><sup>T</sup> tanh(W<sub>a</sub> s<sub>t-1</sub> + U<sub>a</sub> h<sub>i</sub>)</div>
            <div>Luong Multiplicative: e<sub>t,i</sub> = s<sub>t</sub><sup>T</sup> W<sub>a</sub> h<sub>i</sub></div>
            <div>Context Vector: c<sub>t</sub> = &sum;<sub>i</sub> &alpha;<sub>t,i</sub> h<sub>i</sub></div>
          </div>
        </div>

        {/* Beam Search */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <h3 className="text-sm font-bold text-violet-400">Method C — Length-Penalized Beam Search Decoding</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Greedy decoding selects the argmax token at each step, often falling into sub-optimal local minima. SankshepAI implements Beam Search decoding with width $B$ (default 4), tracking the top $B$ cumulative log-probability candidates. Length normalization prevents biased preferences toward short outputs:
          </p>
          <div className="p-3 bg-[#070B14] rounded-xl border border-white/5 font-mono text-xs text-slate-300">
            Score(Y) = &sum;<sub>t</sub> log P(y<sub>t</sub> | y<sub>&lt;t</sub>, X) / [ (5 + |Y|) / 6 ]<sup>&alpha;</sup>
          </div>
        </div>
      </div>

      {/* ── Section 2: Evaluation Metrics ───────────────────────────────────── */}
      <div className="bg-[#0E1526] p-6 sm:p-8 rounded-2xl border border-white/10 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          <span>2. Quantitative Evaluation (ROUGE Metrics)</span>
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          ROUGE (Recall-Oriented Understudy for Gisting Evaluation) measures the overlap between a candidate generated summary and a genuine reference summary:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-[#070B14] rounded-xl border border-white/5 space-y-1">
            <div className="font-bold text-cyan-400">ROUGE-1</div>
            <div className="text-slate-400 text-[11px]">Unigram (single-word) precision, recall, and F1 overlap.</div>
          </div>
          <div className="p-3 bg-[#070B14] rounded-xl border border-white/5 space-y-1">
            <div className="font-bold text-indigo-400">ROUGE-2</div>
            <div className="text-slate-400 text-[11px]">Bigram (two-consecutive-word) precision, recall, and F1 overlap.</div>
          </div>
          <div className="p-3 bg-[#070B14] rounded-xl border border-white/5 space-y-1">
            <div className="font-bold text-violet-400">ROUGE-L</div>
            <div className="text-slate-400 text-[11px]">Longest Common Subsequence (LCS) capturing structural sentence flow.</div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Frequently Asked Questions ────────────────────────────── */}
      <div className="bg-[#0E1526] p-6 sm:p-8 rounded-2xl border border-white/10 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-400" />
          <span>3. Frequently Asked Questions (Viva Reference)</span>
        </h2>

        <div className="space-y-4 text-xs">
          <div className="p-4 bg-[#070B14] rounded-xl border border-white/5 space-y-1.5">
            <div className="font-bold text-white">Why use TextRank alongside an abstractive model?</div>
            <p className="text-slate-400 leading-relaxed">
              TextRank acts as a zero-hallucination baseline. For sensitive legal circulars and financial notifications where every sentence represents statutory compliance, having a dependable extractive baseline ensures total factual fidelity.
            </p>
          </div>

          <div className="p-4 bg-[#070B14] rounded-xl border border-white/5 space-y-1.5">
            <div className="font-bold text-white">How does Gemini fallback protect user data?</div>
            <p className="text-slate-400 leading-relaxed">
              Gemini fallback is completely opt-in via user settings. When triggered, strict system prompts prohibit external extrapolation or invention, and results are transparently tagged with a distinct method badge.
            </p>
          </div>

          <div className="p-4 bg-[#070B14] rounded-xl border border-white/5 space-y-1.5">
            <div className="font-bold text-white">How does the platform handle long documents exceeding sequence limits?</div>
            <p className="text-slate-400 leading-relaxed">
              Long documents are segmented into semantic sentence chunks. The TextRank ranker scores sentence salience hierarchically across sections, preventing abrupt truncation of later provisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
