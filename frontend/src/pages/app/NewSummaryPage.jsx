import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import {
  Sparkles,
  FileText,
  Upload,
  Globe,
  Sliders,
  Cpu,
  Layers,
  Copy,
  Download,
  Edit3,
  RefreshCw,
  BookmarkPlus,
  Scale,
  Check,
  ChevronDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
  SplitSquareVertical,
  X,
  FileCheck
} from 'lucide-react';
import { summaryApi, documentApi, collectionApi, nlpApi, downloadBlob } from '../../lib/api';

const SAMPLE_TEXTS = {
  circular: {
    title: 'Ministry of Finance Circular No. 14/2026',
    text: 'The Ministry of Finance has issued Circular No. 14/2026 notifying all scheduled commercial banks regarding the updated priority sector lending targets. Under the revised guidelines, banks are mandated to allocate 40 percent of Adjusted Net Bank Credit (ANBC) to priority sectors, including micro, small, and medium enterprises (MSMEs), agriculture, and renewable energy. The new norms shall take effect from April 1, 2026, and all non-compliant institutions will be subject to penal interest levies as determined by the Reserve Bank of India.',
  },
  research: {
    title: 'Attention Mechanisms in Sequence-to-Sequence Models',
    text: 'Deep neural sequence-to-sequence models with attention have emerged as the state of the art for abstractive summarization. Unlike extractive methods that select verbatim sentences, abstractive architectures generate novel paraphrases while preserving core semantic factualness. The Luong attention mechanism computes alignment scores between decoder states and encoder representations using dot product or general bilinear matrices, significantly reducing gradient vanishing over long input sequences and improving ROUGE-L scores.',
  },
};

export default function NewSummaryPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Input State
  const [inputMode, setInputMode] = useState('paste'); // 'paste' | 'upload' | 'url'
  const [sourceText, setSourceText] = useState('');
  const [title, setTitle] = useState('');
  const [docId, setDocId] = useState(searchParams.get('docId') || null);
  const [urlInput, setUrlInput] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Generation Controls
  const [method, setMethod] = useState('textrank_baseline'); // 'textrank_baseline' | 'custom_seq2seq_attention' | 'gemini_api_fallback'
  const [lengthMode, setLengthMode] = useState('balanced');
  const [styleMode, setStyleMode] = useState('executive');
  const [beamWidth, setBeamWidth] = useState(4);
  const [maxLen, setMaxLen] = useState(60);
  const [extractKeyPoints, setExtractKeyPoints] = useState(true);
  const [extractEntities, setExtractEntities] = useState(true);
  const [referenceSummary, setReferenceSummary] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Output State
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  // If docId is in URL, fetch its text
  useEffect(() => {
    if (docId) {
      documentApi
        .get(docId)
        .then((res) => {
          if (res.data.success) {
            setSourceText(res.data.document.extractedText);
            setTitle(`Summary of ${res.data.document.title}`);
          }
        })
        .catch(() => toast.error('Could not load referenced document.'));
    }
  }, [docId]);

  // Load user collections for assignment
  useEffect(() => {
    collectionApi
      .list()
      .then((res) => {
        if (res.data.success) setCollections(res.data.collections);
      })
      .catch(() => {});
  }, []);

  // Dropzone for file uploads
  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setUploadedFileName(file.name);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

    const toastId = toast.loading('Extracting document text...');
    try {
      const res = await documentApi.upload(formData);
      if (res.data.success) {
        toast.success('Document uploaded and text extracted!', { id: toastId });
        setDocId(res.data.document._id);
        setSourceText(res.data.document.extractedText);
        setTitle(`Summary of ${res.data.document.title}`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to extract text from document.', { id: toastId });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
  });

  // URL Import Handler
  const handleUrlImport = async () => {
    if (!urlInput.trim()) return toast.error('Please enter a valid URL.');
    const toastId = toast.loading('Importing web article text...');
    try {
      const res = await documentApi.importUrl({ url: urlInput.trim() });
      if (res.data.success) {
        toast.success('Article imported successfully!', { id: toastId });
        setDocId(res.data.document._id);
        setSourceText(res.data.document.extractedText);
        setTitle(res.data.document.title);
      }
    } catch (err) {
      toast.error(err.message || 'URL import failed.', { id: toastId });
    }
  };

  // Generate Summary Action
  const handleGenerate = async () => {
    if (!sourceText.trim() || sourceText.trim().length < 10) {
      return toast.error('Please provide at least 10 characters of document text.');
    }

    setIsGenerating(true);
    setResult(null);
    setIsEditing(false);

    try {
      const payload = {
        text: sourceText,
        documentId: docId || null,
        method,
        length: lengthMode,
        style: styleMode,
        beamWidth: parseInt(beamWidth, 10),
        maxLen: parseInt(maxLen, 10),
        extractKeyPoints,
        extractEntities,
        referenceSummary: referenceSummary.trim() || null,
        title: title.trim() || undefined,
      };

      const res = await summaryApi.generate(payload);
      if (res.data.success) {
        setResult(res.data.summary);
        setEditedContent(res.data.summary.content);
        if (res.data.fallbackTriggered) {
          toast('Notice: Custom model fell back to Gemini API for completeness.', {
            icon: 'ℹ️',
          });
        } else {
          toast.success('Summary generated successfully!');
        }
      }
    } catch (err) {
      toast.error(err.message || 'Summarization failed. Please check your configuration.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save User Edit
  const handleSaveEdit = async () => {
    if (!result) return;
    try {
      const res = await summaryApi.update(result._id, {
        content: editedContent,
        changeNote: 'Edited in workspace',
      });
      if (res.data.success) {
        setResult(res.data.summary);
        setIsEditing(false);
        toast.success('Edits saved as a new version.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save edits.');
    }
  };

  // Export File
  const handleExport = async (format) => {
    if (!result) return;
    try {
      const res = await summaryApi.export(result._id, format);
      const ext = format === 'pdf' ? 'pdf' : format === 'docx' ? 'docx' : format === 'md' ? 'md' : format === 'json' ? 'json' : 'txt';
      downloadBlob(res.data, `${result.title.replace(/\s+/g, '_')}.${ext}`);
      toast.success(`Exported as .${ext.toUpperCase()}`);
    } catch (err) {
      toast.error('Export failed.');
    }
  };

  // Assign to Collection
  const handleAssignCollection = async () => {
    if (!result || !selectedCollection) return;
    try {
      await summaryApi.addToCollection(result._id, selectedCollection);
      toast.success('Added to collection!');
      setShowCollectionModal(false);
    } catch (err) {
      toast.error('Failed to add to collection.');
    }
  };

  const wordCount = sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">New Document Summary</h1>
          <p className="text-xs text-slate-400 mt-1">
            Split-panel workspace: configure NLP models, input text, and view source-grounded outputs.
          </p>
        </div>

        {/* Quick Sample Text Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Insert Sample:</span>
          <button
            type="button"
            onClick={() => {
              setSourceText(SAMPLE_TEXTS.circular.text);
              setTitle(SAMPLE_TEXTS.circular.title);
              setDocId(null);
            }}
            className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
          >
            Govt Circular
          </button>
          <button
            type="button"
            onClick={() => {
              setSourceText(SAMPLE_TEXTS.research.text);
              setTitle(SAMPLE_TEXTS.research.title);
              setDocId(null);
            }}
            className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
          >
            Research Paper
          </button>
        </div>
      </div>

      {/* ── SPLIT PANEL WORKSPACE ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT PANEL: INGESTION & CONTROLS ───────────────────────────────── */}
        <div className="lg:col-span-6 space-y-5 bg-[#0E1526] p-6 rounded-2xl border border-white/10 shadow-xl">
          {/* Input Mode Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-[#070B14] rounded-xl border border-white/5">
            {[
              { id: 'paste', label: 'Paste Text', icon: Edit3 },
              { id: 'upload', label: 'Upload File', icon: Upload },
              { id: 'url', label: 'Import URL', icon: Globe },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInputMode(tab.id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    inputMode === tab.id
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Document / Summary Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. RBI Notification on Priority Sector Lending"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B14] border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400 placeholder:text-slate-600"
            />
          </div>

          {/* Mode 1: Paste Text */}
          {inputMode === 'paste' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Source Document Text
                </label>
                <span className="text-xs text-slate-400">{wordCount} words</span>
              </div>
              <textarea
                rows={9}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste government circulars, scientific paper abstracts, news reports, or business documents..."
                className="w-full p-4 rounded-xl bg-[#070B14] border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400 placeholder:text-slate-600 leading-relaxed font-sans"
              />
            </div>
          )}

          {/* Mode 2: Upload File */}
          {inputMode === 'upload' && (
            <div>
              <div
                {...getRootProps()}
                className={`p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-white/10 hover:border-white/20 bg-[#070B14]'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2 opacity-80" />
                <div className="text-sm font-semibold text-white">
                  {isDragActive ? 'Drop file here' : 'Click to select or drag & drop file'}
                </div>
                <div className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, TXT, Markdown (up to 15MB)</div>
                {uploadedFileName && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Uploaded: {uploadedFileName}</span>
                  </div>
                )}
              </div>

              {sourceText && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Extracted Content Preview</span>
                    <span>{wordCount} words</span>
                  </div>
                  <div className="p-3 bg-[#070B14] rounded-xl border border-white/5 text-xs text-slate-300 max-h-36 overflow-y-auto leading-relaxed">
                    {sourceText}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 3: Import URL */}
          {inputMode === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Web Article / Publication URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.gov/notifications/circular.html"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#070B14] border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400 placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={handleUrlImport}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    Fetch
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>Protected against SSRF. Private IPs and internal subnets are blocked.</span>
                </div>
              </div>

              {sourceText && (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Fetched Content Preview</span>
                    <span>{wordCount} words</span>
                  </div>
                  <div className="p-3 bg-[#070B14] rounded-xl border border-white/5 text-xs text-slate-300 max-h-36 overflow-y-auto leading-relaxed">
                    {sourceText}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MODEL SELECTION CARDS ────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Select Summarization Engine
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: TextRank */}
              <button
                type="button"
                onClick={() => setMethod('textrank_baseline')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  method === 'textrank_baseline'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                    : 'bg-[#070B14] border-white/5 text-slate-400 hover:border-white/15'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">TextRank Baseline</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Extractive graph PageRank. Zero hallucination risk.
                </p>
              </button>

              {/* Option 2: Custom Seq2Seq */}
              <button
                type="button"
                onClick={() => setMethod('custom_seq2seq_attention')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  method === 'custom_seq2seq_attention'
                    ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md'
                    : 'bg-[#070B14] border-white/5 text-slate-400 hover:border-white/15'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">Seq2Seq + Attention</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Custom BiGRU neural model with Beam Search.
                </p>
              </button>

              {/* Option 3: Gemini Fallback */}
              <button
                type="button"
                onClick={() => setMethod('gemini_api_fallback')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  method === 'gemini_api_fallback'
                    ? 'bg-violet-500/20 border-violet-400 text-white shadow-md'
                    : 'bg-[#070B14] border-white/5 text-slate-400 hover:border-white/15'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-bold text-white">Gemini Fallback</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  External AI engine with fact-grounded constraints.
                </p>
              </button>
            </div>
          </div>

          {/* ── STYLE & LENGTH CONTROLS ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Output Style
              </label>
              <select
                value={styleMode}
                onChange={(e) => setStyleMode(e.target.value)}
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Target Length
              </label>
              <select
                value={lengthMode}
                onChange={(e) => setLengthMode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="short">Short (~20% of original)</option>
                <option value="balanced">Balanced (~35% of original)</option>
                <option value="detailed">Detailed (~50% of original)</option>
              </select>
            </div>
          </div>

          {/* ── ADVANCED DECODING & ROUGE TOGGLE ──────────────────────────────── */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Advanced Decoding & ROUGE Evaluation</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 bg-[#070B14] rounded-xl border border-white/5 space-y-4">
                {method === 'custom_seq2seq_attention' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                        <span>Beam Width (B)</span>
                        <span className="font-bold text-cyan-400">{beamWidth}</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={8}
                        value={beamWidth}
                        onChange={(e) => setBeamWidth(e.target.value)}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                        <span>Max Output Tokens</span>
                        <span className="font-bold text-cyan-400">{maxLen}</span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={120}
                        step={10}
                        value={maxLen}
                        onChange={(e) => setMaxLen(e.target.value)}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  </div>
                )}

                {/* Optional Reference Summary for ROUGE */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ground-Truth Reference Summary (for ROUGE scoring)
                  </label>
                  <textarea
                    rows={2}
                    value={referenceSummary}
                    onChange={(e) => setReferenceSummary(e.target.value)}
                    placeholder="Provide a human reference summary to calculate exact ROUGE-1, ROUGE-2, and ROUGE-L scores..."
                    className="w-full p-2.5 rounded-lg bg-[#0E1526] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Leave blank if evaluating unannotated real-world documents. ROUGE scores will never be fabricated.
                  </div>
                </div>

                {/* Feature Checkboxes */}
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extractKeyPoints}
                      onChange={(e) => setExtractKeyPoints(e.target.checked)}
                      className="rounded accent-indigo-500"
                    />
                    <span>Extract Key Takeaway Points</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extractEntities}
                      onChange={(e) => setExtractEntities(e.target.checked)}
                      className="rounded accent-indigo-500"
                    />
                    <span>Extract Legal Circulars, Dates & Figures</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !sourceText.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-400 hover:from-indigo-500 hover:to-cyan-300 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 disabled:opacity-50 transition-all transform hover:-translate-y-0.5"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Processing Document & Running NLP Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>Generate Summary</span>
              </>
            )}
          </button>
        </div>

        {/* ── RIGHT PANEL: RESULTS & VERIFICATION ────────────────────────────── */}
        <div className="lg:col-span-6 bg-[#0E1526] p-6 rounded-2xl border border-white/10 shadow-xl min-h-[500px] flex flex-col justify-between">
          {isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center animate-pulse mb-4">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Generating Summary</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Executing {method === 'custom_seq2seq_attention' ? 'Seq2Seq Beam Search' : 'TextRank PageRank iteration'} and verifying source grounding...
              </p>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* Results Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                      {result.methodLabel || result.method}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{result.processingTimeMs}ms</span>
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white mt-1.5">{result.title}</h2>
                </div>

                {/* Compression Pill */}
                <div className="text-right">
                  <div className="text-xs text-slate-400">Compression</div>
                  <div className="text-sm font-extrabold text-emerald-400">
                    {Math.round((1 - result.compressionRatio) * 100)}% reduction
                  </div>
                </div>
              </div>

              {/* Summary Text / Edit Box */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Generated Summary
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isEditing ? 'Cancel Edit' : 'Edit Text'}</span>
                  </button>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      rows={6}
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full p-4 rounded-xl bg-[#070B14] border border-cyan-400 text-white text-sm focus:outline-none leading-relaxed"
                    />
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                    >
                      Save Version
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[#070B14] border border-white/5 text-sm leading-relaxed text-slate-100 whitespace-pre-line">
                    {result.content}
                  </div>
                )}
              </div>

              {/* Key Takeaways */}
              {result.keyPoints && result.keyPoints.length > 0 && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                    Key Takeaways
                  </span>
                  <div className="space-y-2">
                    {result.keyPoints.map((kp, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{kp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Entities Drawer */}
              {result.entities && Object.keys(result.entities).length > 0 && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                    Extracted Legal & Domain Entities
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.entities.circulars_and_statutory?.map((c, i) => (
                      <span key={`c-${i}`} className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 font-mono">
                        {c}
                      </span>
                    ))}
                    {result.entities.dates?.map((d, i) => (
                      <span key={`d-${i}`} className="text-[11px] px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 font-mono">
                        {d}
                      </span>
                    ))}
                    {result.entities.figures_and_amounts?.map((f, i) => (
                      <span key={`f-${i}`} className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-mono">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ROUGE Evaluation Card */}
              <div className="p-4 rounded-xl bg-[#070B14] border border-white/5">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-300">ROUGE Benchmark Evaluation</span>
                  <span className="text-[10px] text-slate-500 font-mono">F1-Scores</span>
                </div>
                {result.evaluation?.available ? (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="text-[10px] text-slate-400">ROUGE-1</div>
                      <div className="text-sm font-bold text-cyan-400">
                        {Math.round(result.evaluation.rouge1.f1 * 100)}%
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="text-[10px] text-slate-400">ROUGE-2</div>
                      <div className="text-sm font-bold text-indigo-400">
                        {Math.round(result.evaluation.rouge2.f1 * 100)}%
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="text-[10px] text-slate-400">ROUGE-L</div>
                      <div className="text-sm font-bold text-violet-400">
                        {Math.round(result.evaluation.rougeL.f1 * 100)}%
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic">
                    Reference-based evaluation unavailable (no reference summary supplied).
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(result.content);
                      toast.success('Summary copied to clipboard!');
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCollectionModal(true)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>Add to Collection</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/app/compare?text=${encodeURIComponent(sourceText.slice(0, 500))}`)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <SplitSquareVertical className="w-3.5 h-3.5" />
                    <span>Compare</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExport('pdf')}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-xs font-medium"
                  >
                    .PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('docx')}
                    className="px-2.5 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/30 text-xs font-medium"
                  >
                    .DOCX
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('txt')}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
                  >
                    .TXT
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('md')}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
                  >
                    .MD
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('json')}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
                  >
                    .JSON
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center text-slate-500">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <h3 className="text-base font-semibold text-slate-300">Ready to Summarize</h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Paste or upload your document on the left, pick an NLP engine, and click Generate Summary to inspect results.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Add to Collection Modal ──────────────────────────────────────────── */}
      {showCollectionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1526] rounded-2xl border border-white/10 p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add to Collection</h3>
              <button onClick={() => setShowCollectionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {collections.length > 0 ? (
              <div className="space-y-2">
                {collections.map((col) => (
                  <button
                    key={col._id}
                    type="button"
                    onClick={() => setSelectedCollection(col._id)}
                    className={`w-full p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between ${
                      selectedCollection === col._id
                        ? 'bg-indigo-600/20 border-indigo-400 text-white'
                        : 'bg-[#070B14] border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                      <span>{col.name}</span>
                    </div>
                    {selectedCollection === col._id && <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400">
                You have no collections yet.{' '}
                <button
                  onClick={() => navigate('/app/collections')}
                  className="text-cyan-400 underline font-semibold"
                >
                  Create one here
                </button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCollectionModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignCollection}
                disabled={!selectedCollection}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50"
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
