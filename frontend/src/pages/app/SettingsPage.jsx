import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Sliders,
  Moon,
  Sun,
  ShieldAlert,
  Sparkles,
  Lock,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useUIStore from '../../store/uiStore';
import { userApi, authApi } from '../../lib/api';

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useUIStore();

  const [settings, setSettings] = useState({
    theme: 'dark',
    defaultLength: 'balanced',
    defaultStyle: 'executive',
    defaultModel: 'textrank_baseline',
    allowGeminiFallback: true,
    emailNotifications: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Account deletion modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    userApi
      .getSettings()
      .then((res) => {
        if (res.data.success && res.data.settings) {
          setSettings(res.data.settings);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await userApi.updateSettings(settings);
      if (res.data.success) {
        toast.success('Preferences saved successfully.');
      }
    } catch {
      toast.error('Failed to update settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return toast.error('All password fields are required.');
    if (newPassword !== confirmPassword) return toast.error('New passwords do not match.');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters long.');

    setIsChangingPass(true);
    try {
      const res = await authApi.changePassword({ currentPassword, newPassword, confirmPassword });
      if (res.data.success) {
        toast.success('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await userApi.deleteAccount({ password: deletePassword });
      if (res.data.success) {
        toast.success('Account deleted.');
        logout();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete account.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Account & System Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure default summary generation options, AI fallback preferences, security, and appearance.
        </p>
      </div>

      {/* ── Summarization Defaults Form ──────────────────────────────────────── */}
      <div className="bg-[#0E1526] p-6 sm:p-8 rounded-2xl border border-white/10 shadow-xl space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Default Summarization Behavior</span>
        </h2>

        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                Default Engine
              </label>
              <select
                value={settings.defaultModel}
                onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="textrank_baseline">TextRank Extractive Baseline</option>
                <option value="custom_seq2seq_attention">Custom Attention Seq2Seq</option>
                <option value="gemini_api_fallback">Gemini API Fallback</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                Default Style
              </label>
              <select
                value={settings.defaultStyle}
                onChange={(e) => setSettings({ ...settings, defaultStyle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="executive">Executive Briefing</option>
                <option value="academic">Academic Rigor</option>
                <option value="bullet-point">Bullet-Point Takeaways</option>
                <option value="plain-language">Plain Language</option>
                <option value="structured">Structured Headings</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                Default Length
              </label>
              <select
                value={settings.defaultLength}
                onChange={(e) => setSettings({ ...settings, defaultLength: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="short">Short (~20%)</option>
                <option value="balanced">Balanced (~35%)</option>
                <option value="detailed">Detailed (~50%)</option>
              </select>
            </div>
          </div>

          {/* Gemini Fallback Preference */}
          <div className="p-4 rounded-xl bg-[#070B14] border border-white/5 flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span>Allow Intelligent Gemini API Fallback</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed max-w-xl">
                When enabled, if the custom neural model encounters an out-of-memory condition, truncation, or inference failure, the server automatically queries the Gemini API with strict fact-preserving constraints. External fallback is always clearly labeled.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={settings.allowGeminiFallback}
                onChange={(e) => setSettings({ ...settings, allowGeminiFallback: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Security & Password Management ───────────────────────────────────── */}
      <div className="bg-[#0E1526] p-6 sm:p-8 rounded-2xl border border-white/10 shadow-xl space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-cyan-400" />
          <span>Security & Password</span>
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPass}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 disabled:opacity-50"
          >
            {isChangingPass ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* ── Danger Zone ──────────────────────────────────────────────────────── */}
      <div className="bg-[#0E1526] p-6 sm:p-8 rounded-2xl border border-rose-500/20 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          <span>Danger Zone</span>
        </h2>
        <p className="text-xs text-slate-400 max-w-xl">
          Permanently delete your account and all associated documents, summary versions, collections, and audit records. This action cannot be undone.
        </p>

        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="px-5 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold border border-rose-500/30 flex items-center gap-2"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Account</span>
        </button>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1526] rounded-2xl border border-rose-500/30 p-6 max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold text-white">Confirm Account Deletion</h3>
            <p className="text-xs text-slate-400">
              Please enter your password to confirm permanent deletion of all your documents and data.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your password..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-rose-400"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
