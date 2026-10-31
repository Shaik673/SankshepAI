import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Cpu,
  Layers,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Download,
  BookOpen,
  Sliders,
  Terminal,
  Activity,
  Award
} from 'lucide-react';
import { nlpApi, downloadBlob } from '../../lib/api';

export default function ModelLabPage() {
  const [modelStatus, setModelStatus] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [experiments, setExperiments] = useState([]);

  // Training form state
  const [epochs, setEpochs] = useState(5);
  const [batchSize, setBatchSize] = useState(2);
  const [lr, setLr] = useState(0.001);
  const [attentionType, setAttentionType] = useState('bahdanau');
  const [isTraining, setIsTraining] = useState(false);
  const [activeJobId, setActiveJobId] = useState(null);
  const [trainingJobStatus, setTrainingJobStatus] = useState(null);

  // Benchmarking State
  const [benchHypothesis, setBenchHypothesis] = useState(
    'Ministry of Finance issued Circular 14/2026 requiring commercial banks to allocate 40% of ANBC to priority sectors like MSMEs and agriculture starting April 1, 2026.'
  );
  const [benchReference, setBenchReference] = useState(
    'The Ministry of Finance notified Circular No. 14/2026 mandating banks to allocate 40% of credit to priority sectors including MSMEs and agriculture effective April 1, 2026.'
  );
  const [benchResult, setBenchResult] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Load initial model status and experiment records
  const refreshStatus = async () => {
    try {
      const [statRes, ckptRes, expRes] = await Promise.all([
        nlpApi.getModelStatus(),
        nlpApi.getCheckpoints(),
        nlpApi.getExperiments(),
      ]);

      if (statRes.data) setModelStatus(statRes.data);
      if (ckptRes.data) setCheckpoints(ckptRes.data.checkpoints || []);
      if (expRes.data) setExperiments(expRes.data.experiments || []);
    } catch (err) {
      console.warn('FastAPI AI Service offline or starting:', err.message);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  // Poll active training job
  useEffect(() => {
    let interval = null;
    if (activeJobId && isTraining) {
      interval = setInterval(async () => {
        try {
          const res = await nlpApi.getTrainingStatus(activeJobId);
          setTrainingJobStatus(res.data);
          if (res.data.status === 'completed') {
            setIsTraining(false);
            toast.success(`Training completed! Checkpoint: ${res.data.checkpoint_name}`);
            refreshStatus();
            clearInterval(interval);
          } else if (res.data.status === 'failed') {
            setIsTraining(false);
            toast.error(`Training failed: ${res.data.error}`);
            clearInterval(interval);
          }
        } catch {
          setIsTraining(false);
          clearInterval(interval);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [activeJobId, isTraining]);

  // Start Training Action
  const handleStartTraining = async (e) => {
    e.preventDefault();
    setIsTraining(true);
    setTrainingJobStatus(null);

    try {
      const res = await nlpApi.startTraining({
        epochs: parseInt(epochs, 10),
        batch_size: parseInt(batchSize, 10),
        lr: parseFloat(lr),
        attention_type: attentionType,
      });

      if (res.data.status === 'started') {
        setActiveJobId(res.data.job_id);
        toast.success(`Training job ${res.data.job_id} initiated!`);
      }
    } catch (err) {
      setIsTraining(false);
      toast.error(err.message || 'Failed to start training job.');
    }
  };

  // Run ROUGE Benchmark Evaluation
  const handleRunEvaluation = async () => {
    if (!benchHypothesis.trim() || !benchReference.trim()) {
      return toast.error('Both hypothesis and reference are required.');
    }
    setIsEvaluating(true);
    setBenchResult(null);

    try {
      const res = await nlpApi.evaluate({
        hypothesis: benchHypothesis.trim(),
        reference: benchReference.trim(),
      });
      if (res.data.status === 'success') {
        setBenchResult(res.data);
        toast.success('ROUGE benchmark evaluation calculated!');
      }
    } catch (err) {
      toast.error(err.message || 'Evaluation calculation failed.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleExportExperiments = () => {
    let csv = 'ID,Experiment Name,Model Type,Checkpoint,Beam Width,ROUGE-1 F1,ROUGE-2 F1,ROUGE-L F1,Runtime (ms),Created At\n';
    experiments.forEach((e) => {
      const r1 = e.rouge1?.f1 || 'N/A';
      const r2 = e.rouge2?.f1 || 'N/A';
      const rl = e.rougeL?.f1 || 'N/A';
      csv += `"${e.id}","${e.name}","${e.model_type}","${e.checkpoint_name || 'N/A'}",${e.beam_width || 1},${r1},${r2},${rl},${e.runtime_ms || 0},"${e.created_at || ''}"\n`;
    });
    downloadBlob(csv, 'sankshepai_model_experiments.csv');
    toast.success('Experiments exported to CSV.');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-400 mb-2">
            <Cpu className="w-3.5 h-3.5" />
            <span>Academic NLP & Deep Learning</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Model Laboratory</h1>
          <p className="text-xs text-slate-400 mt-1">
            Explore neural network architectures, train checkpoints, visualize beam search decoding, and calculate verified ROUGE benchmarks.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportExperiments}
          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-2 border border-white/10"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Export Experiments (CSV)</span>
        </button>
      </div>

      {/* ── RUNTIME ENGINE STATUS & DIAGNOSTICS ─────────────────────────── */}
      {modelStatus && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0E1526] border border-white/10 space-y-1">
            <div className="text-[11px] font-semibold uppercase text-slate-400">Compute Device</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>{modelStatus.device}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Torch: {modelStatus.torch_version}</div>
          </div>

          <div className="p-4 rounded-xl bg-[#0E1526] border border-white/10 space-y-1">
            <div className="text-[11px] font-semibold uppercase text-slate-400">TextRank Extractive</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="capitalize">{modelStatus.engines?.textrank?.status || 'Active'}</span>
            </div>
            <div className="text-[10px] text-slate-500">TF-IDF PageRank Graph</div>
          </div>

          <div className="p-4 rounded-xl bg-[#0E1526] border border-white/10 space-y-1">
            <div className="text-[11px] font-semibold uppercase text-slate-400">Custom Seq2Seq Neural</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="capitalize">{modelStatus.engines?.custom_seq2seq?.status || 'Active'}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate">{modelStatus.engines?.custom_seq2seq?.active_checkpoint || 'Ready'}</div>
          </div>

          <div className="p-4 rounded-xl bg-[#0E1526] border border-white/10 space-y-1">
            <div className="text-[11px] font-semibold uppercase text-slate-400">Gemini API Fallback</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${modelStatus.engines?.gemini_fallback?.status === 'configured' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className="capitalize">{modelStatus.engines?.gemini_fallback?.status || 'Configured'}</span>
            </div>
            <div className="text-[10px] text-cyan-400 font-mono truncate">{modelStatus.engines?.gemini_fallback?.model || 'Configured'}</div>
          </div>
        </div>
      )}

      {/* ── ARCHITECTURE HIGHLIGHT & MATHEMATICS ─────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#0E1526] via-[#111A30] to-[#0E1526] border border-cyan-500/30 shadow-xl space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <span>Custom Seq2Seq Attention Architecture Specification</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
            The SankshepAI academic abstractive model implements a sequence-to-sequence recurrent neural network with a Bidirectional GRU/LSTM encoder and dynamic attention mechanisms. Alignment weights &alpha;<sub>t,i</sub> compute a dynamic context representation c<sub>t</sub> over input tokens for each decoding timestep t.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-[#070B14] border border-white/5 space-y-2">
            <div className="text-cyan-400 font-bold font-sans text-xs">Bahdanau (Additive) Attention</div>
            <div className="text-slate-300">
              e<sub>t,i</sub> = v<sub>a</sub><sup>T</sup> tanh(W<sub>a</sub> s<sub>t-1</sub> + U<sub>a</sub> h<sub>i</sub>)
            </div>
            <div className="text-slate-400">
              &alpha;<sub>t,i</sub> = exp(e<sub>t,i</sub>) / &sum;<sub>k</sub> exp(e<sub>t,k</sub>)
            </div>
            <div className="text-slate-400">
              c<sub>t</sub> = &sum;<sub>i</sub> &alpha;<sub>t,i</sub> h<sub>i</sub>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#070B14] border border-white/5 space-y-2">
            <div className="text-indigo-400 font-bold font-sans text-xs">Beam Search Length Penalty</div>
            <div className="text-slate-300">
              LP(Y) = ((5 + |Y|) / 6)<sup>&alpha;</sup>
            </div>
            <div className="text-slate-400">
              Score(Y) = &sum; log P(y<sub>t</sub> | y<sub>&lt;t</sub>, X) / LP(Y)
            </div>
            <div className="text-slate-400">
              Repetition penalty: Logits[token] &divide; 1.3
            </div>
          </div>
        </div>
      </div>

      {/* ── TRAINING RUN LAUNCHER & CHECKPOINTS ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Training Launcher Form */}
        <div className="lg:col-span-6 bg-[#0E1526] p-6 rounded-2xl border border-white/10 shadow-xl space-y-5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Train Model Checkpoint</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Fine-tune the custom bidirectional recurrent model with attention on domain summarization pairs.
            </p>
          </div>

          <form onSubmit={handleStartTraining} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Epochs</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={epochs}
                  onChange={(e) => setEpochs(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Batch Size</label>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={batchSize}
                  onChange={(e) => setBatchSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Learning Rate</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lr}
                  onChange={(e) => setLr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Attention Mechanism</label>
                <select
                  value={attentionType}
                  onChange={(e) => setAttentionType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="bahdanau">Bahdanau (Additive)</option>
                  <option value="luong">Luong (General)</option>
                </select>
              </div>
            </div>

            {/* Active Training Job Status */}
            {isTraining && (
              <div className="p-4 bg-[#070B14] rounded-xl border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                    <span>Training in Progress (Job: {activeJobId})</span>
                  </span>
                  <span className="font-mono text-white">
                    Epoch {trainingJobStatus?.current_epoch || 0} / {epochs}
                  </span>
                </div>
                {trainingJobStatus?.current_loss && (
                  <div className="text-xs text-slate-400">
                    Current Loss: <strong className="text-emerald-400">{trainingJobStatus.current_loss}</strong>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isTraining}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isTraining ? 'Training Model...' : 'Start Training Job'}</span>
            </button>
          </form>
        </div>

        {/* Checkpoint Registry */}
        <div className="lg:col-span-6 bg-[#0E1526] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              <span>Available Model Checkpoints</span>
            </h2>
            <button
              onClick={refreshStatus}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400"
              title="Refresh Checkpoints"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {checkpoints.length > 0 ? (
            <div className="space-y-3">
              {checkpoints.map((ckpt, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#070B14] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono">{ckpt.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {ckpt.size_mb} MB
                    </span>
                  </div>
                  {ckpt.metadata && (
                    <div className="text-[11px] text-slate-400 grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                      <div>Epochs: <strong className="text-white">{ckpt.metadata.epochs || 'N/A'}</strong></div>
                      <div>Saved: <strong className="text-white">{ckpt.metadata.saved_at || 'Recent'}</strong></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              No checkpoints saved yet. Train your first model checkpoint on the left.
            </div>
          )}
        </div>
      </div>

      {/* ── ROUGE BENCHMARK CALCULATOR ───────────────────────────────────────── */}
      <div className="bg-[#0E1526] p-6 sm:p-8 rounded-2xl border border-white/10 shadow-xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>ROUGE Metric Evaluation Suite (ROUGE-1, ROUGE-2, ROUGE-L)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Calculate verified n-gram overlap and longest common subsequence (LCS) against ground truth references.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Candidate Summary (Hypothesis)
            </label>
            <textarea
              rows={4}
              value={benchHypothesis}
              onChange={(e) => setBenchHypothesis(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 leading-relaxed font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Ground-Truth Reference Summary
            </label>
            <textarea
              rows={4}
              value={benchReference}
              onChange={(e) => setBenchReference(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 leading-relaxed font-sans"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500 italic">
            Evaluates Precision, Recall, and Harmonic Mean (F1-Score).
          </div>
          <button
            type="button"
            onClick={handleRunEvaluation}
            disabled={isEvaluating}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-white text-xs font-bold disabled:opacity-50"
          >
            {isEvaluating ? 'Evaluating...' : 'Compute ROUGE Scores'}
          </button>
        </div>

        {benchResult && benchResult.available && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
            {/* ROUGE-1 */}
            <div className="p-4 rounded-xl bg-[#070B14] border border-cyan-500/30 text-center space-y-1">
              <div className="text-xs font-bold text-cyan-400">ROUGE-1 (Unigram Overlap)</div>
              <div className="text-2xl font-extrabold text-white">
                {Math.round(benchResult.rouge1.f1 * 100)}%
              </div>
              <div className="text-[11px] text-slate-400">
                P: {Math.round(benchResult.rouge1.precision * 100)}% | R: {Math.round(benchResult.rouge1.recall * 100)}%
              </div>
            </div>

            {/* ROUGE-2 */}
            <div className="p-4 rounded-xl bg-[#070B14] border border-indigo-500/30 text-center space-y-1">
              <div className="text-xs font-bold text-indigo-400">ROUGE-2 (Bigram Overlap)</div>
              <div className="text-2xl font-extrabold text-white">
                {Math.round(benchResult.rouge2.f1 * 100)}%
              </div>
              <div className="text-[11px] text-slate-400">
                P: {Math.round(benchResult.rouge2.precision * 100)}% | R: {Math.round(benchResult.rouge2.recall * 100)}%
              </div>
            </div>

            {/* ROUGE-L */}
            <div className="p-4 rounded-xl bg-[#070B14] border border-violet-500/30 text-center space-y-1">
              <div className="text-xs font-bold text-violet-400">ROUGE-L (Longest Common Subsequence)</div>
              <div className="text-2xl font-extrabold text-white">
                {Math.round(benchResult.rougeL.f1 * 100)}%
              </div>
              <div className="text-[11px] text-slate-400">
                P: {Math.round(benchResult.rougeL.precision * 100)}% | R: {Math.round(benchResult.rougeL.recall * 100)}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── TRACKED EXPERIMENTS HISTORY TABLE ─────────────────────────────────── */}
      <div className="bg-[#0E1526] p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white">Tracked Experiment History ({experiments.length})</h2>
        {experiments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070B14] text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/5">
                <tr>
                  <th className="py-3 px-4">Experiment Name</th>
                  <th className="py-3 px-4">Model Type</th>
                  <th className="py-3 px-4">Beam Width</th>
                  <th className="py-3 px-4">ROUGE-1 F1</th>
                  <th className="py-3 px-4">ROUGE-L F1</th>
                  <th className="py-3 px-4">Runtime</th>
                  <th className="py-3 px-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {experiments.map((e) => (
                  <tr key={e.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-semibold text-white">{e.name}</td>
                    <td className="py-3 px-4 font-mono text-cyan-400">{e.model_type}</td>
                    <td className="py-3 px-4">{e.beam_width || 1}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      {e.rouge1?.f1 ? `${Math.round(e.rouge1.f1 * 100)}%` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-bold text-violet-400">
                      {e.rougeL?.f1 ? `${Math.round(e.rougeL.f1 * 100)}%` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{e.runtime_ms || 0}ms</td>
                    <td className="py-3 px-4 text-slate-500">{e.created_at || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-xs text-slate-500 py-6 text-center">No experiments logged yet.</div>
        )}
      </div>
    </div>
  );
}
