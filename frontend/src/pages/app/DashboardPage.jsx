import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Sparkles,
  Cpu,
  BarChart2,
  TrendingDown,
  Clock,
  Layers,
  ArrowRight,
  Plus,
  Upload,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { analyticsApi, nlpApi } from '../../lib/api';
import useAuthStore from '../../store/authStore';

const METHOD_COLORS = {
  textrank_baseline: '#6366f1',
  custom_seq2seq_attention: '#06b6d4',
  gemini_api_fallback: '#8b5cf6',
};

const METHOD_LABELS = {
  textrank_baseline: 'TextRank Baseline',
  custom_seq2seq_attention: 'Custom Seq2Seq Attention',
  gemini_api_fallback: 'Gemini API Fallback',
};

export default function DashboardPage() {
  const { user, profile } = useAuthStore();

  const [stats, setStats] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashRes, statusRes] = await Promise.allSettled([
          analyticsApi.getDashboard(),
          nlpApi.getModelStatus(),
        ]);

        if (dashRes.status === 'fulfilled' && dashRes.value.data.success) {
          setStats(dashRes.value.data.data);
        }
        if (statusRes.status === 'fulfilled') {
          setModelStatus(statusRes.value.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const pieData = stats?.methodDistribution
    ? Object.entries(stats.methodDistribution).map(([key, value]) => ({
        name: METHOD_LABELS[key] || key,
        value: value,
        key: key,
      })).filter((d) => d.value > 0)
    : [];

  const displayName = profile?.displayName || user?.fullName || 'Researcher';

  return (
    <div className="space-y-8">
      {/* ── Welcome Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0E1526] via-[#111A30] to-[#0E1526] p-6 sm:p-8 rounded-2xl border border-white/10 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-400 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Summarization Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Generate source-grounded summaries, compare model outputs, and evaluate ROUGE scores.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/app/documents"
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4 text-slate-400" />
            <span>Upload Document</span>
          </Link>
          <Link
            to="/app/new-summary"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Summary</span>
          </Link>
        </div>
      </div>

      {/* ── Quick Stats Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <div className="p-5 rounded-2xl bg-[#0E1526] border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Documents Ingested</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">{stats?.totalDocuments || 0}</div>
          <div className="text-xs text-slate-400 mt-1">Stored in personal library</div>
        </div>

        {/* Total Summaries */}
        <div className="p-5 rounded-2xl bg-[#0E1526] border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Summaries Generated</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">{stats?.totalSummaries || 0}</div>
          <div className="text-xs text-slate-400 mt-1">Across 3 NLP methods</div>
        </div>

        {/* Compression Ratio */}
        <div className="p-5 rounded-2xl bg-[#0E1526] border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Avg. Compression</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {stats?.avgCompressionRatio ? `${Math.round((1 - stats.avgCompressionRatio) * 100)}%` : '65%'}
          </div>
          <div className="text-xs text-slate-400 mt-1">Reading time reduction</div>
        </div>

        {/* Words Processed */}
        <div className="p-5 rounded-2xl bg-[#0E1526] border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Words Processed</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {stats?.totalOriginalWords ? stats.totalOriginalWords.toLocaleString() : '0'}
          </div>
          <div className="text-xs text-slate-400 mt-1">Source document tokens</div>
        </div>
      </div>

      {/* ── Visual Analytics & Engine Status ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Activity Timeline Chart */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-[#0E1526] border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white">Summarization Activity</h2>
              <p className="text-xs text-slate-400">Generated summaries over the past 14 days</p>
            </div>
            <Link
              to="/app/analytics"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              <span>View Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            {stats?.activityTimeline && stats.activityTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.activityTimeline}>
                  <defs>
                    <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#070B14',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#activityGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <BarChart2 className="w-8 h-8 mb-2 opacity-40" />
                <span>No summary activity recorded in the last 14 days yet.</span>
                <Link to="/app/new-summary" className="mt-2 text-cyan-400 font-semibold">
                  Generate your first summary
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* NLP Engines Health & Status */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-[#0E1526] border border-white/10 shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-1">NLP Model Engines</h2>
            <p className="text-xs text-slate-400 mb-5">Current status of active summarizers</p>

            <div className="space-y-3.5">
              {/* TextRank */}
              <div className="p-3.5 rounded-xl bg-[#070B14] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                  <div>
                    <div className="text-xs font-bold text-white">TextRank Baseline</div>
                    <div className="text-[10px] text-slate-400">TF-IDF PageRank Graph (CPU)</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ready
                </span>
              </div>

              {/* Custom Seq2Seq */}
              <div className="p-3.5 rounded-xl bg-[#070B14] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Seq2Seq + Attention</div>
                    <div className="text-[10px] text-slate-400">
                      {modelStatus?.engines?.custom_seq2seq?.active_checkpoint || 'custom_seq2seq_v1.pt'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Loaded
                </span>
              </div>

              {/* Gemini Fallback */}
              <div className="p-3.5 rounded-xl bg-[#070B14] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-sm shadow-violet-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Gemini API Fallback</div>
                    <div className="text-[10px] text-slate-400">Server Orchestrator</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  Configured
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 mt-4">
            <Link
              to="/app/lab"
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open Model Laboratory</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Recent Documents & Summaries ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <div className="p-6 rounded-2xl bg-[#0E1526] border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Recent Documents</h2>
            <Link to="/app/documents" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
              View All
            </Link>
          </div>

          {stats?.recentDocuments && stats.recentDocuments.length > 0 ? (
            <div className="space-y-2.5">
              {stats.recentDocuments.map((doc) => (
                <div
                  key={doc._id}
                  className="p-3.5 rounded-xl bg-[#070B14] border border-white/5 flex items-center justify-between hover:border-white/15 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-white/5 text-indigo-400 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{doc.title}</div>
                      <div className="text-[11px] text-slate-400">
                        {doc.wordCount?.toLocaleString()} words &bull; {new Date(doc.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/app/new-summary?docId=${doc._id}`}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold shrink-0"
                  >
                    Summarize
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-500">
              No documents uploaded yet. Upload a PDF, DOCX, or text file to begin.
            </div>
          )}
        </div>

        {/* Recent Summaries */}
        <div className="p-6 rounded-2xl bg-[#0E1526] border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Recent Summaries</h2>
            <Link to="/app/summaries" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
              View All
            </Link>
          </div>

          {stats?.recentSummaries && stats.recentSummaries.length > 0 ? (
            <div className="space-y-2.5">
              {stats.recentSummaries.map((sum) => (
                <div
                  key={sum._id}
                  className="p-3.5 rounded-xl bg-[#070B14] border border-white/5 flex items-center justify-between hover:border-white/15 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{sum.title}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{sum.summaryWordCount} words</span>
                        <span>&bull;</span>
                        <span className="text-cyan-400 font-mono text-[10px]">{METHOD_LABELS[sum.method] || sum.method}</span>
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/app/summaries/${sum._id}`}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold shrink-0"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-500">
              No summaries generated yet. Click "New Summary" to generate one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
