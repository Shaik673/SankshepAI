import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  FileText,
  Cpu,
  BarChart3,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  Scale,
  Layers,
  ChevronRight,
  ExternalLink,
  Code2
} from 'lucide-react';

const SAMPLE_DOCS = [
  {
    id: 'gov_circular',
    title: 'Ministry of Finance Circular No. 14/2026',
    category: 'Government Notification',
    sourceText:
      'The Ministry of Finance has issued Circular No. 14/2026 notifying all scheduled commercial banks regarding the updated priority sector lending targets. Under the revised guidelines, banks are mandated to allocate 40 percent of Adjusted Net Bank Credit (ANBC) to priority sectors, including micro, small, and medium enterprises (MSMEs), agriculture, and renewable energy. The new norms shall take effect from April 1, 2026, and all non-compliant institutions will be subject to penal interest levies as determined by the Reserve Bank of India.',
    textrankSummary:
      'The Ministry of Finance has issued Circular No. 14/2026 notifying all scheduled commercial banks regarding the updated priority sector lending targets. Under the revised guidelines, banks are mandated to allocate 40 percent of Adjusted Net Bank Credit (ANBC) to priority sectors, including micro, small, and medium enterprises (MSMEs), agriculture, and renewable energy. The new norms shall take effect from April 1, 2026, and all non-compliant institutions will be subject to penal interest levies.',
    seq2seqSummary:
      'Ministry of Finance issued Circular 14/2026 requiring commercial banks to allocate 40% of ANBC to priority sectors like MSMEs and agriculture starting April 1, 2026, subject to RBI penal interest for non-compliance.',
    keyPoints: [
      'Circular No. 14/2026 takes effect on April 1, 2026',
      'Mandates 40% ANBC allocation to priority sectors (MSMEs, agriculture, renewable energy)',
      'Enforced by RBI with penal interest levies for non-compliance',
    ],
    entities: ['Circular No. 14/2026', 'April 1, 2026', '40% of ANBC', 'Ministry of Finance', 'Reserve Bank of India'],
  },
  {
    id: 'research_paper',
    title: 'Deep Neural Seq2Seq Summarization with Attention',
    category: 'Research Paper',
    sourceText:
      'Deep neural sequence-to-sequence models with attention have emerged as the state of the art for abstractive summarization. Unlike extractive methods that select verbatim sentences, abstractive architectures generate novel paraphrases while preserving core semantic factualness. The Luong attention mechanism computes alignment scores between decoder states and encoder representations using dot product or general bilinear matrices, significantly reducing gradient vanishing over long input sequences and improving ROUGE-L scores.',
    textrankSummary:
      'Deep neural sequence-to-sequence models with attention have emerged as the state of the art for abstractive summarization. The Luong attention mechanism computes alignment scores between decoder states and encoder representations using dot product or general bilinear matrices, significantly reducing gradient vanishing over long input sequences and improving ROUGE-L scores.',
    seq2seqSummary:
      'Abstractive sequence-to-sequence models with Luong attention generate novel summaries by aligning decoder states with encoder representations, outperforming extractive baselines in semantic coherence.',
    keyPoints: [
      'Abstractive models synthesize novel phrases rather than extracting verbatim sentences',
      'Luong attention uses bilinear alignment matrices to connect decoder states with encoder tokens',
      'Alleviates gradient vanishing and enhances ROUGE-L evaluation performance',
    ],
    entities: ['Sequence-to-Sequence', 'Luong Attention', 'ROUGE-L', 'Bidirectional RNN'],
  },
];

export default function LandingPage() {
  const [selectedDoc, setSelectedDoc] = useState(SAMPLE_DOCS[0]);
  const [activeTab, setActiveTab] = useState('seq2seq'); // 'seq2seq' or 'textrank'

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* ── Navbar ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#070B14]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                SankshepAI
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                NLP & Deep Learning
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#demo" className="hover:text-cyan-400 transition-colors">Interactive Demo</a>
            <a href="#models" className="hover:text-cyan-400 transition-colors">Architecture</a>
            <a href="#comparison" className="hover:text-cyan-400 transition-colors">Methods Comparison</a>
            <Link to="/app/lab" className="hover:text-cyan-400 transition-colors">Model Laboratory</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-600/20 to-cyan-500/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-cyan-400 mb-8 backdrop-blur-md">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Seq2Seq BiGRU + Luong/Bahdanau Attention + Graph TextRank</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
            Intelligent Document Summarization{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
              Grounded in Deep Learning
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
            SankshepAI bridges rigorous academic Natural Language Processing with modern document productivity.
            Summarize circulars, research papers, legal policies, and reports with verifiable source grounding and quantitative ROUGE evaluation.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-base shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <span>Start Summarizing Documents</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold text-base backdrop-blur-md flex items-center justify-center gap-2 transition-colors"
            >
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Explore Live Demo</span>
            </a>
          </div>

          {/* Key Stat Badges */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-white/5">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="text-2xl font-bold text-white">3 Distinct</div>
              <div className="text-xs text-slate-400 mt-1">Summarization Paths</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="text-2xl font-bold text-cyan-400">Beam Search</div>
              <div className="text-xs text-slate-400 mt-1">Length-Penalized Decoding</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="text-2xl font-bold text-indigo-400">ROUGE 1/2/L</div>
              <div className="text-xs text-slate-400 mt-1">Ground-Truth Metrics</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="text-2xl font-bold text-emerald-400">100% Honest</div>
              <div className="text-xs text-slate-400 mt-1">Transparent Method Badges</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Live Demo Workspace ─────────────────────────────────── */}
      <section id="demo" className="py-20 bg-[#0A0F1D] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              Interactive Summarization Workspace
            </h2>
            <p className="text-slate-400 text-base">
              Test sample documents with precomputed outputs. Clearly labeled demonstration data illustrating the difference between extractive and abstractive NLP models.
            </p>
          </div>

          {/* Sample Document Selector Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {SAMPLE_DOCS.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedDoc.id === doc.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>{doc.title}</span>
              </button>
            ))}
          </div>

          {/* Split Panel Demo Display */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0E1526] rounded-2xl border border-white/10 p-6 lg:p-8 shadow-2xl">
            {/* Left: Source Document Preview */}
            <div className="lg:col-span-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 lg:pr-8 pb-6 lg:pb-0">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Source Text</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10">
                    {selectedDoc.sourceText.split(' ').length} words
                  </span>
                </div>
                <div className="bg-[#070B14] p-4 rounded-xl border border-white/5 text-slate-300 text-sm leading-relaxed max-h-[320px] overflow-y-auto">
                  {selectedDoc.sourceText}
                </div>
              </div>

              <div className="mt-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2.5">
                  Extracted Entities & Legal References
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDoc.entities.map((ent, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 font-mono">
                      {ent}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Summary Output Panel */}
            <div className="lg:col-span-7 flex flex-col justify-between lg:pl-2">
              <div>
                {/* Method Switcher Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-1.5 bg-[#070B14] p-1 rounded-xl border border-white/10">
                    <button
                      onClick={() => setActiveTab('seq2seq')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                        activeTab === 'seq2seq'
                          ? 'bg-cyan-500 text-white font-semibold shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Custom Seq2Seq Attention</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('textrank')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                        activeTab === 'textrank'
                          ? 'bg-indigo-600 text-white font-semibold shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>TextRank Baseline</span>
                    </button>
                  </div>

                  <div className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    {activeTab === 'seq2seq' ? 'Abstractive Paraphrase' : 'Extractive Sentence Rank'}
                  </div>
                </div>

                {/* Summary Box */}
                <div className="bg-[#070B14] p-5 rounded-xl border border-white/10 text-sm leading-relaxed text-slate-100 min-h-[140px]">
                  {activeTab === 'seq2seq' ? selectedDoc.seq2seqSummary : selectedDoc.textrankSummary}
                </div>

                {/* Key Points */}
                <div className="mt-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                    Key Salient Takeaways
                  </span>
                  <div className="space-y-1.5">
                    {selectedDoc.keyPoints.map((kp, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{kp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Metrics Bar */}
              <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                <div className="flex items-center gap-4">
                  <span>
                    Summary Words:{' '}
                    <strong className="text-white">
                      {(activeTab === 'seq2seq' ? selectedDoc.seq2seqSummary : selectedDoc.textrankSummary).split(' ').length}
                    </strong>
                  </span>
                  <span>
                    Compression:{' '}
                    <strong className="text-cyan-400">
                      {Math.round(
                        (1 -
                          (activeTab === 'seq2seq' ? selectedDoc.seq2seqSummary : selectedDoc.textrankSummary).split(' ').length /
                            selectedDoc.sourceText.split(' ').length) *
                          100
                      )}
                      %
                    </strong>
                  </span>
                </div>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  <span>Summarize your own documents</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── NLP Architecture Deep Dive ───────────────────────────────────────── */}
      <section id="models" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-400 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-3">
            Academic Core
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Three Rigorously Distinguished NLP Approaches
          </h2>
          <p className="text-slate-400 text-base">
            Never confuse extractive summarization with neural sequence learning or external APIs. SankshepAI provides complete architectural transparency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: TextRank */}
          <div className="p-8 rounded-2xl bg-[#0E1526] border border-white/10 hover:border-indigo-500/50 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">TextRank Extractive Baseline</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Constructs a weighted sentence graph with edges determined by pairwise TF-IDF cosine similarity. Computes stationary distribution scores via PageRank power iteration and selects top sentences in original narrative order.
              </p>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span>Damping factor d = 0.85 with convergence tolerance 1e-4</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span>Zero hallucination risk (extracts verbatim source text)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span>Ultra-fast CPU execution (typically &lt; 50ms)</span>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 text-xs text-slate-400">
              Method label: <code className="text-indigo-400 font-mono">textrank_baseline</code>
            </div>
          </div>

          {/* Card 2: Custom Attention Seq2Seq */}
          <div className="p-8 rounded-2xl bg-gradient-to-b from-[#131c36] to-[#0E1526] border border-cyan-500/30 hover:border-cyan-400 transition-all flex flex-col justify-between relative group shadow-xl shadow-cyan-500/5">
            <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-bold text-cyan-300 uppercase tracking-wide">
              Academic Highlight
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Custom Seq2Seq + Attention</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Custom PyTorch neural architecture with a Bidirectional GRU encoder, Luong/Bahdanau dynamic attention alignment, and length-penalized beam search decoding with repetition penalties.
              </p>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Bahdanau additive & Luong general attention scores</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Configurable Beam Search with length penalty α = 0.6</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Trained checkpoint resume & evaluation tracking</span>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 text-xs text-slate-400">
              Method label: <code className="text-cyan-400 font-mono">custom_seq2seq_attention</code>
            </div>
          </div>

          {/* Card 3: Gemini Fallback */}
          <div className="p-8 rounded-2xl bg-[#0E1526] border border-white/10 hover:border-violet-500/50 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Intelligent Gemini Fallback</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                External AI fallback engine triggered exclusively upon qualifying primary inference failures or truncation checks. Configured strictly on the server with user consent controls and explicit attribution.
              </p>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span>Never silently substitutes or masks academic model failures</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span>Zero hallucination prompt constraints preserving dates & figures</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span>Fully opt-in via user account settings</span>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 text-xs text-slate-400">
              Method label: <code className="text-violet-400 font-mono">gemini_api_fallback</code>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-[#05080F] py-12 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-white">SankshepAI</span>
            <span className="text-xs text-slate-500 ml-2">Academically Rigorous NLP Platform</span>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <Link to="/app/help" className="hover:text-white transition-colors">Documentation</Link>
            <Link to="/app/lab" className="hover:text-white transition-colors">Model Laboratory</Link>
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link to="/signup" className="hover:text-white transition-colors">Create Account</Link>
          </div>
          <div className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} SankshepAI. Built for Academic NLP Research & Document Intelligence.
          </div>
        </div>
      </footer>
    </div>
  );
}
