import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import {
  FileText,
  Upload,
  Search,
  Filter,
  Trash2,
  Edit2,
  Eye,
  Sparkles,
  Plus,
  X,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { documentApi } from '../../lib/api';

export default function DocumentsPage() {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Selected States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [renameDoc, setRenameDoc] = useState(null);
  const [newName, setNewName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchDocuments = async (pageNum = page, searchQuery = search) => {
    setIsLoading(true);
    try {
      const res = await documentApi.list({ page: pageNum, limit: 10, search: searchQuery });
      if (res.data.success) {
        setDocuments(res.data.documents);
        setTotal(res.data.pagination.total);
        setPages(res.data.pagination.pages);
      }
    } catch (err) {
      toast.error('Failed to load documents.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments(page, search);
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchDocuments(1, search);
  };

  // Upload & URL Import state
  const [uploadTab, setUploadTab] = useState('file'); // 'file' or 'url'
  const [importUrl, setImportUrl] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Upload dropzone supporting single or batch files
  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    if (acceptedFiles.length === 1) {
      const file = acceptedFiles[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

      const toastId = toast.loading(`Uploading and extracting ${file.name}...`);
      try {
        const res = await documentApi.upload(formData);
        if (res.data.success) {
          toast.success('Document uploaded!', { id: toastId });
          setShowUploadModal(false);
          fetchDocuments(1, search);
        }
      } catch (err) {
        toast.error(err.message || 'Upload failed.', { id: toastId });
      }
    } else {
      // Batch upload
      const formData = new FormData();
      acceptedFiles.forEach((f) => formData.append('files', f));

      const toastId = toast.loading(`Batch uploading ${acceptedFiles.length} documents...`);
      try {
        const res = await documentApi.batchUpload(formData);
        if (res.data.success) {
          toast.success(res.data.message || `Uploaded ${acceptedFiles.length} documents!`, { id: toastId });
          setShowUploadModal(false);
          fetchDocuments(1, search);
        }
      } catch (err) {
        toast.error(err.message || 'Batch upload failed.', { id: toastId });
      }
    }
  };

  const handleUrlImport = async (e) => {
    e.preventDefault();
    if (!importUrl.trim()) return;
    setIsImporting(true);
    const toastId = toast.loading('Extracting article content from URL...');
    try {
      const res = await documentApi.importUrl({ url: importUrl.trim(), title: importTitle.trim() });
      if (res.data.success) {
        toast.success('URL content imported successfully!', { id: toastId });
        setShowUploadModal(false);
        setImportUrl('');
        setImportTitle('');
        fetchDocuments(1, search);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to import from URL.', { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 10,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document? Any linked summaries will also be removed.')) return;
    try {
      await documentApi.delete(id);
      toast.success('Document deleted.');
      fetchDocuments(page, search);
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } catch {
      toast.error('Delete failed.');
    }
  };

  const handleBatchDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected documents?`)) return;
    try {
      await documentApi.batchDelete(selectedIds);
      toast.success('Selected documents deleted.');
      setSelectedIds([]);
      fetchDocuments(page, search);
    } catch {
      toast.error('Batch delete failed.');
    }
  };

  const handleRenameSubmit = async () => {
    if (!renameDoc || !newName.trim()) return;
    try {
      await documentApi.rename(renameDoc._id, newName.trim());
      toast.success('Document renamed.');
      setRenameDoc(null);
      fetchDocuments(page, search);
    } catch {
      toast.error('Rename failed.');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Documents</h1>
          <p className="text-xs text-slate-400 mt-1">
            Personal document library with extracted text, metadata, and grounded Q&A support.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBatchDelete}
              className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 bg-[#0E1526] rounded-2xl border border-white/10 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by title or filename..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 placeholder:text-slate-500"
          />
        </form>
        <div className="text-xs text-slate-400 shrink-0">
          Total Documents: <strong className="text-white">{total}</strong>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-[#0E1526] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-slate-400">Loading documents...</div>
        ) : documents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070B14] text-slate-400 uppercase tracking-wider text-[10px] border-b border-white/5">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === documents.length && documents.length > 0}
                      onChange={(e) =>
                        setSelectedIds(e.target.checked ? documents.map((d) => d._id) : [])
                      }
                      className="rounded accent-indigo-500"
                    />
                  </th>
                  <th className="py-3 px-4">Title & Source</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Word Count</th>
                  <th className="py-3 px-4">Date Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {documents.map((doc) => {
                  const isChecked = selectedIds.includes(doc._id);
                  return (
                    <tr key={doc._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(doc._id)}
                          className="rounded accent-indigo-500"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/app/documents/${doc._id}`}
                          className="font-semibold text-white hover:text-cyan-400 transition-colors block truncate max-w-xs"
                        >
                          {doc.title}
                        </Link>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{doc.originalFilename}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-400 uppercase">
                          {doc.mimeType?.split('/')[1] || 'TEXT'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">{doc.wordCount?.toLocaleString() || 0} words</td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/app/new-summary?docId=${doc._id}`}
                            title="Generate Summary"
                            className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            to={`/app/documents/${doc._id}`}
                            title="Inspect Text & QA"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setRenameDoc(doc);
                              setNewName(doc.title);
                            }}
                            title="Rename"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(doc._id)}
                            title="Delete"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-xs text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <div>No documents found.</div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-2 text-cyan-400 font-semibold underline"
            >
              Upload your first document
            </button>
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

      {/* ── Upload Modal ────────────────────────────────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1526] rounded-2xl border border-white/10 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Ingest Documents</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-2">
              <button
                type="button"
                onClick={() => setUploadTab('file')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  uploadTab === 'file' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                File & Batch Upload
              </button>
              <button
                type="button"
                onClick={() => setUploadTab('url')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  uploadTab === 'url' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Import from URL
              </button>
            </div>

            {uploadTab === 'file' ? (
              <div
                {...getRootProps()}
                className={`p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                  isDragActive ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/10 hover:border-white/20 bg-[#070B14]'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2 opacity-80" />
                <div className="text-sm font-semibold text-white">Click or drag files to upload</div>
                <div className="text-xs text-slate-400 mt-1">
                  Supports batch upload (up to 10 files: PDF, DOCX, TXT, MD)
                </div>
              </div>
            ) : (
              <form onSubmit={handleUrlImport} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Public News / Gazette Article URL
                  </label>
                  <input
                    type="url"
                    required
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://pib.gov.in/PressReleasePage.aspx?PRID=..."
                    className="w-full px-3 py-2 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Custom Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={importTitle}
                    onChange={(e) => setImportTitle(e.target.value)}
                    placeholder="e.g. Press Release on Economic Stimulus Package"
                    className="w-full px-3 py-2 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isImporting || !importUrl.trim()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold disabled:opacity-40"
                >
                  {isImporting ? 'Fetching and Extracting...' : 'Import Content'}
                </button>
              </form>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rename Modal ────────────────────────────────────────────────────── */}
      {renameDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1526] rounded-2xl border border-white/10 p-6 max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold text-white">Rename Document</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameDoc(null)}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenameSubmit}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
