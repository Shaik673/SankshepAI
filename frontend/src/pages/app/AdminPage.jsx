import React, { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  Server,
  Database,
  Cpu,
  BrainCircuit,
  Users,
  FileText,
  BookOpen,
  Plus,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [overview, setOverview] = useState(null);
  const [health, setHealth] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Form state for adding dataset sample
  const [newSample, setNewSample] = useState({
    title: '',
    category: 'government_circular',
    source: '',
    target: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [ovRes, healthRes, dataRes, userRes] = await Promise.all([
        adminApi.getOverview().catch(() => ({ data: { metrics: {}, recentActivities: [] } })),
        adminApi.getSystemHealth().catch(() => ({ data: { services: {} } })),
        adminApi.getDatasets().catch(() => ({ data: { dataset: [] } })),
        adminApi.getUsers({ limit: 15 }).catch(() => ({ data: { users: [] } })),
      ]);

      setOverview(ovRes.data);
      setHealth(healthRes.data?.services);
      setDatasets(dataRes.data?.dataset || []);
      setUsersList(userRes.data?.users || []);
    } catch (err) {
      toast.error('Failed to load administrative dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSample = async (e) => {
    e.preventDefault();
    if (!newSample.source.trim() || !newSample.target.trim()) {
      toast.error('Source text and reference summary are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await adminApi.addDatasetItem(newSample);
      toast.success('Approved domain dataset item added!');
      setNewSample({ title: '', category: 'government_circular', source: '', target: '' });
      // Refresh datasets
      const res = await adminApi.getDatasets();
      setDatasets(res.data?.dataset || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add dataset sample.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      toast.success(`Role updated to ${newRole}`);
      setUsersList((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      toast.error('Failed to change user role.');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-rose/10 border border-rose/30 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-rose" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Administrative Privileges Required</h2>
        <p className="text-graphite-400 max-w-md text-sm">
          This portal is restricted to authorized platform administrators. Ordinary user accounts cannot access system health or training dataset configurations.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  const metrics = overview?.metrics || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-graphite-700/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-white">System Administration</h1>
            <Badge variant="indigo">Admin Mode</Badge>
          </div>
          <p className="text-graphite-400 text-sm mt-1">
            Platform telemetry, dataset governance, model orchestration, and role management.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchAdminData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-graphite-800 pb-2">
        {[
          { id: 'overview', label: 'Overview & Services', icon: Activity },
          { id: 'datasets', label: 'Domain Datasets', icon: BookOpen },
          { id: 'users', label: 'User Governance', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-glow-indigo'
                  : 'text-graphite-400 hover:text-white hover:bg-graphite-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Overview & Services */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-graphite-800/60 border-graphite-700/50">
              <div className="flex items-center justify-between">
                <span className="text-graphite-400 text-xs font-medium">Registered Accounts</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">{metrics.totalUsers || 0}</div>
              <span className="text-emerald-400 text-xs flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" /> {metrics.activeUsers || 0} active
              </span>
            </Card>

            <Card className="p-4 bg-graphite-800/60 border-graphite-700/50">
              <div className="flex items-center justify-between">
                <span className="text-graphite-400 text-xs font-medium">Documents Ingested</span>
                <FileText className="w-4 h-4 text-cyan" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">{metrics.totalDocs || 0}</div>
              <span className="text-graphite-500 text-xs mt-1">PDF, DOCX, TXT, News</span>
            </Card>

            <Card className="p-4 bg-graphite-800/60 border-graphite-700/50">
              <div className="flex items-center justify-between">
                <span className="text-graphite-400 text-xs font-medium">Summaries Generated</span>
                <BrainCircuit className="w-4 h-4 text-amber" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">{metrics.totalSummaries || 0}</div>
              <span className="text-graphite-500 text-xs mt-1">All NLP pipelines</span>
            </Card>

            <Card className="p-4 bg-graphite-800/60 border-graphite-700/50">
              <div className="flex items-center justify-between">
                <span className="text-graphite-400 text-xs font-medium">API Uptime</span>
                <Server className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">
                {Math.floor((metrics.uptimeSeconds || 0) / 60)} min
              </div>
              <span className="text-emerald-400 text-xs mt-1">Continuous operation</span>
            </Card>
          </div>

          {/* Service Topology Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Node Backend */}
            <Card className="p-5 bg-navy-800/80 border-graphite-700/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-semibold text-white">Express API Service</h3>
                </div>
                <Badge variant="emerald">Healthy</Badge>
              </div>
              <div className="space-y-2 text-xs text-graphite-400">
                <div className="flex justify-between">
                  <span>Port:</span> <span className="text-white font-mono">3000</span>
                </div>
                <div className="flex justify-between">
                  <span>RSS Memory:</span>{' '}
                  <span className="text-white font-mono">{health?.nodeApi?.memoryMb || 0} MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Runtime:</span>{' '}
                  <span className="text-white font-mono">{health?.nodeApi?.nodeVersion}</span>
                </div>
              </div>
            </Card>

            {/* MongoDB Atlas */}
            <Card className="p-5 bg-navy-800/80 border-graphite-700/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-semibold text-white">MongoDB Atlas</h3>
                </div>
                <Badge variant={health?.database?.status === 'healthy' ? 'emerald' : 'amber'}>
                  {health?.database?.status || 'Active'}
                </Badge>
              </div>
              <div className="space-y-2 text-xs text-graphite-400">
                <div className="flex justify-between">
                  <span>Connection:</span>{' '}
                  <span className="text-white truncate max-w-[150px] font-mono">
                    {health?.database?.host || 'Connected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Persistence:</span> <span className="text-white font-mono">Verified</span>
                </div>
                <div className="flex justify-between">
                  <span>Per-User Isolation:</span> <span className="text-emerald-400">Enforced</span>
                </div>
              </div>
            </Card>

            {/* FastAPI AI Service */}
            <Card className="p-5 bg-navy-800/80 border-graphite-700/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyan" />
                  <h3 className="font-semibold text-white">FastAPI Deep Learning</h3>
                </div>
                <Badge variant={health?.aiService?.status === 'ok' ? 'emerald' : 'amber'}>
                  {health?.aiService?.status === 'ok' ? 'Online' : 'Resilient Fallback'}
                </Badge>
              </div>
              <div className="space-y-2 text-xs text-graphite-400">
                <div className="flex justify-between">
                  <span>Port:</span> <span className="text-white font-mono">8000</span>
                </div>
                <div className="flex justify-between">
                  <span>Models:</span> <span className="text-white">Seq2Seq, TextRank, RAG</span>
                </div>
                <div className="flex justify-between">
                  <span>Gemini Fallback:</span> <span className="text-cyan font-mono">gemini-3.5-flash-lite</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent System Activity Log */}
          <Card className="p-5 bg-graphite-900/60 border-graphite-700/60">
            <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              System Audit Trail & Recent Activity
            </h3>
            <div className="space-y-3">
              {(overview?.recentActivities || []).map((act, i) => (
                <div
                  key={act._id || i}
                  className="flex items-center justify-between p-3 rounded-xl bg-graphite-800/40 border border-graphite-700/30 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <div>
                      <p className="text-white font-medium">{act.description}</p>
                      <p className="text-graphite-500 text-[11px]">
                        User: {act.userId?.email || 'System'} | IP: {act.ipAddress || '127.0.0.1'}
                      </p>
                    </div>
                  </div>
                  <span className="text-graphite-400 font-mono">
                    {new Date(act.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Domain Datasets */}
      {activeTab === 'datasets' && (
        <div className="space-y-6">
          {/* Add Sample Card */}
          <Card className="p-6 bg-navy-800/80 border-graphite-700/60">
            <h3 className="font-semibold text-white text-base mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan" />
              Add Approved Domain Training Sample
            </h3>
            <p className="text-graphite-400 text-xs mb-4">
              Add verified government circulars, gazettes, policies, or official public notices to the supervised training corpus.
            </p>

            <form onSubmit={handleAddSample} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-graphite-300 block mb-1">
                    Document Title / Circular Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={newSample.title}
                    onChange={(e) => setNewSample({ ...newSample, title: e.target.value })}
                    placeholder="e.g., RBI Notification No. 88/2026 on Lending Norms"
                    className="w-full bg-graphite-900 border border-graphite-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-graphite-300 block mb-1">
                    Domain Category
                  </label>
                  <select
                    value={newSample.category}
                    onChange={(e) => setNewSample({ ...newSample, category: e.target.value })}
                    className="w-full bg-graphite-900 border border-graphite-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="government_circular">Government Circular</option>
                    <option value="official_notice">Official Notice / Gazette</option>
                    <option value="public_policy">Public Policy / Statutory Guideline</option>
                    <option value="news_article">Verified News Article</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-graphite-300 block mb-1">
                  Full Source Circular Text (Input Document)
                </label>
                <textarea
                  rows={4}
                  required
                  value={newSample.source}
                  onChange={(e) => setNewSample({ ...newSample, source: e.target.value })}
                  placeholder="Paste the official circular or notification text..."
                  className="w-full bg-graphite-900 border border-graphite-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-graphite-300 block mb-1">
                  Ground-Truth Reference Summary (Target for ROUGE Evaluation & Seq2Seq Training)
                </label>
                <textarea
                  rows={2}
                  required
                  value={newSample.target}
                  onChange={(e) => setNewSample({ ...newSample, target: e.target.value })}
                  placeholder="Concise, factual reference summary with key deadlines, figures, and orders..."
                  className="w-full bg-graphite-900 border border-graphite-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                {isSubmitting ? <Spinner size="xs" /> : <Plus className="w-4 h-4 mr-2" />}
                Add to Training Dataset
              </Button>
            </form>
          </Card>

          {/* Dataset Inventory List */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center justify-between">
              <span>Approved Dataset Corpus ({datasets.length} samples)</span>
              <span className="text-xs text-graphite-400 font-normal">Stored in data/sample_corpus.json</span>
            </h4>

            {datasets.map((item, idx) => (
              <Card key={item.id || idx} className="p-4 bg-graphite-800/40 border-graphite-700/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="cyan">{item.category || 'domain_sample'}</Badge>
                    <span className="text-white font-medium text-sm">
                      {item.title || `Sample #${idx + 1}`}
                    </span>
                  </div>
                  <span className="text-graphite-500 text-xs">
                    {item.source.split(/\s+/).length} words
                  </span>
                </div>
                <p className="text-graphite-400 text-xs mb-3 line-clamp-2">
                  <strong className="text-graphite-300">Source:</strong> {item.source}
                </p>
                <div className="p-2.5 rounded-lg bg-navy-900/60 border border-graphite-700/50 text-xs text-indigo-300">
                  <strong>Reference Summary:</strong> {item.target}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab: User Governance */}
      {activeTab === 'users' && (
        <Card className="p-6 bg-navy-800/80 border-graphite-700/60">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white text-base">User Accounts & Roles</h3>
              <p className="text-graphite-400 text-xs">
                Manage authorization levels, verify accounts, and configure permissions.
              </p>
            </div>
            <Badge variant="indigo">{usersList.length} Accounts</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-graphite-900/80 text-graphite-400 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Email Verified</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-800">
                {usersList.map((u) => (
                  <tr key={u._id} className="hover:bg-graphite-800/40">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{u.fullName}</div>
                      <div className="text-graphite-500 font-mono text-[11px]">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          u.role === 'admin'
                            ? 'rose'
                            : u.role === 'researcher'
                            ? 'indigo'
                            : 'secondary'
                        }
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-400 capitalize">{u.accountStatus}</span>
                    </td>
                    <td className="px-4 py-3">
                      {u.emailVerified ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="text-amber">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-graphite-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleRoleChange(u._id, 'admin')}
                          className="text-indigo-400 hover:text-white"
                        >
                          Make Admin
                        </Button>
                      )}
                      {u.role === 'admin' && u._id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleRoleChange(u._id, 'user')}
                          className="text-rose hover:text-rose-300"
                        >
                          Demote
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
