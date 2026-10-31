import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  BookmarkPlus,
  Plus,
  Folder,
  Trash2,
  Edit2,
  FileText,
  Sparkles,
  X
} from 'lucide-react';
import { collectionApi } from '../../lib/api';

const COLOR_PRESETS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);

  const fetchCollections = async () => {
    setIsLoading(true);
    try {
      const res = await collectionApi.list();
      if (res.data.success) setCollections(res.data.collections);
    } catch {
      toast.error('Failed to load collections.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Collection name is required.');
    try {
      const res = await collectionApi.create({
        name: name.trim(),
        description: description.trim(),
        color,
      });
      if (res.data.success) {
        toast.success('Collection created!');
        setShowCreateModal(false);
        setName('');
        setDescription('');
        fetchCollections();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create collection.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this collection? Linked summaries and documents will remain in your library.')) return;
    try {
      await collectionApi.delete(id);
      toast.success('Collection deleted.');
      fetchCollections();
    } catch {
      toast.error('Delete failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Collections & Projects</h1>
          <p className="text-xs text-slate-400 mt-1">
            Group related documents, policy briefings, research papers, and summaries into dedicated project workspaces.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Grid of Collections */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading collections...</div>
      ) : collections.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((col) => (
            <div
              key={col._id}
              className="p-5 rounded-2xl bg-[#0E1526] border border-white/5 hover:border-white/15 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: col.color }} />
                    <h3 className="text-base font-bold text-white truncate">{col.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(col._id)}
                    className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {col.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <span>{col.documentCount || 0} docs</span>
                  <span>&bull;</span>
                  <span>{col.summaryCount || 0} summaries</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-xs text-slate-500 bg-[#0E1526] rounded-2xl border border-white/5">
          <Folder className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <div>No collections created yet.</div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-2 text-cyan-400 font-semibold underline block mx-auto"
          >
            Create your first collection
          </button>
        </div>
      )}

      {/* ── Create Modal ────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1526] rounded-2xl border border-white/10 p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">New Collection</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Legal Circulars 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details about this project..."
                  className="w-full p-3 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Color Tag</label>
                <div className="flex items-center gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${
                        color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#0E1526]' : 'opacity-70'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-xs font-bold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
