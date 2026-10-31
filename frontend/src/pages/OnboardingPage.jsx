import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Sparkles,
  User,
  Sliders,
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Building2,
  Globe2,
  BookOpen,
  Briefcase,
  GraduationCap,
  Scale,
  Newspaper,
  FileCheck,
  Check
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { onboardingApi, userApi } from '../lib/api';

const OCCUPATION_OPTIONS = [
  { id: 'student', label: 'Student', icon: GraduationCap, desc: 'Undergraduate or graduate studying' },
  { id: 'faculty', label: 'Faculty / Educator', icon: BookOpen, desc: 'Teaching or lecturing at an institution' },
  { id: 'researcher', label: 'Researcher / Scientist', icon: Sparkles, desc: 'Conducting academic or industrial R&D' },
  { id: 'government_employee', label: 'Government / Public Sector', icon: Scale, desc: 'Handling policies, notices, and circulars' },
  { id: 'journalist', label: 'Journalist / Writer', icon: Newspaper, desc: 'Covering news, policy reports, and events' },
  { id: 'professional', label: 'Corporate / Legal Professional', icon: Briefcase, desc: 'Reviewing business briefs, contracts, memos' },
  { id: 'other', label: 'Other', icon: User, desc: 'General enthusiast or independent practitioner' },
];

const DOCUMENT_INTERESTS = [
  { id: 'gov_circulars', label: 'Government Circulars & Public Notices' },
  { id: 'news_reports', label: 'News & Current Affairs' },
  { id: 'research_papers', label: 'Academic & Scientific Research Papers' },
  { id: 'study_materials', label: 'Course Textbooks & Lecture Notes' },
  { id: 'business_reports', label: 'Business & Financial Reports' },
  { id: 'legal_policies', label: 'Legal Briefs & Compliance Policies' },
  { id: 'general_docs', label: 'General Articles & Longform Reads' },
];

const STYLE_OPTIONS = [
  { id: 'executive', title: 'Concise Executive Summary', desc: 'High-level synthesis focused on bottom lines and key decisions.' },
  { id: 'academic', title: 'Academic Rigor Summary', desc: 'Highlights research questions, methodology, evidence, and conclusions.' },
  { id: 'bullet-point', title: 'Bullet-Point Key Takeaways', desc: 'Digestible, categorized bullet points for rapid reading.' },
  { id: 'plain-language', title: 'Plain-Language Explanation', desc: 'Accessible prose free of dense jargon and legalese.' },
  { id: 'structured', title: 'Detailed Structured Summary', desc: 'Organized with section headings: Background, Findings, Impact.' },
];

const DISCOVERY_OPTIONS = [
  'Google Search',
  'University or college',
  'Friend or colleague',
  'LinkedIn',
  'GitHub',
  'X (Twitter)',
  'YouTube',
  'Instagram',
  'Professional Network',
  'Blog or online article',
  'Online community or forum',
  'Other',
  'Prefer not to say',
];

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, profile, completeOnboarding } = useAuthStore();

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1: Identity
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [occupation, setOccupation] = useState('');
  const [institution, setInstitution] = useState('');
  const [country, setCountry] = useState('India');
  const [preferredLanguage, setPreferredLanguage] = useState('en');

  // Step 2: Preferences
  const [interests, setInterests] = useState(['gov_circulars', 'research_papers']);
  const [summaryStyle, setSummaryStyle] = useState('executive');
  const [summaryLength, setSummaryLength] = useState('balanced');

  // Step 3: Discovery
  const [discoverySources, setDiscoverySources] = useState(['Google Search']);
  const [discoveryOther, setDiscoveryOther] = useState('');

  // Fetch saved onboarding progress on load
  useEffect(() => {
    async function loadProgress() {
      try {
        const res = await onboardingApi.getProgress();
        const data = res.data;
        if (data.isCompleted) {
          completeOnboarding();
          navigate('/app/dashboard', { replace: true });
          return;
        }

        if (data.currentStep) setStep(data.currentStep);

        if (data.identityData) {
          setDisplayName(data.identityData.displayName || user?.fullName || '');
          setAvatar(data.identityData.avatar || '');
          setOccupation(data.identityData.occupation || '');
          setInstitution(data.identityData.institution || '');
          setCountry(data.identityData.country || 'India');
          setPreferredLanguage(data.identityData.preferredLanguage || 'en');
        } else {
          setDisplayName(user?.fullName || '');
        }

        if (data.preferencesData) {
          if (data.preferencesData.documentInterests?.length) {
            setInterests(data.preferencesData.documentInterests);
          }
          if (data.preferencesData.preferredSummaryStyle) {
            setSummaryStyle(data.preferencesData.preferredSummaryStyle);
          }
          if (data.preferencesData.preferredSummaryLength) {
            setSummaryLength(data.preferencesData.preferredSummaryLength);
          }
        }

        if (data.discoverySources?.length) setDiscoverySources(data.discoverySources);
        if (data.discoveryOther) setDiscoveryOther(data.discoveryOther);
      } catch (err) {
        setDisplayName(user?.fullName || '');
      }
    }
    loadProgress();
  }, [user]);

  // Calculate meaningful profile completion
  const calculateCompletion = () => {
    let score = 0;
    if (displayName) score += 20;
    if (occupation) score += 20;
    if (institution) score += 10;
    if (interests.length > 0) score += 20;
    if (summaryStyle) score += 15;
    if (discoverySources.length > 0) score += 15;
    return score;
  };

  const handleToggleInterest = (id) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleDiscovery = (src) => {
    setDiscoverySources((prev) =>
      prev.includes(src) ? prev.filter((item) => item !== src) : [...prev, src]
    );
  };

  const handleNextStep1 = async () => {
    if (!displayName.trim()) {
      toast.error('Please enter a display name.');
      return;
    }
    setIsSaving(true);
    try {
      await onboardingApi.saveStep(1, {
        displayName: displayName.trim(),
        avatar,
        occupation,
        institution: institution.trim(),
        country,
        preferredLanguage,
      });
      setStep(2);
    } catch (err) {
      toast.error(err.message || 'Failed to save step.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextStep2 = async () => {
    setIsSaving(true);
    try {
      await onboardingApi.saveStep(2, {
        documentInterests: interests,
        preferredSummaryStyle: summaryStyle,
        preferredSummaryLength: summaryLength,
      });
      setStep(3);
    } catch (err) {
      toast.error(err.message || 'Failed to save step.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSaving(true);
    try {
      await onboardingApi.complete({
        identityData: {
          displayName,
          avatar,
          occupation,
          institution,
          country,
          preferredLanguage,
        },
        preferencesData: {
          documentInterests: interests,
          preferredSummaryStyle: summaryStyle,
          preferredSummaryLength: summaryLength,
        },
        discoverySources,
        discoveryOther,
      });

      completeOnboarding();
      toast.success('Onboarding complete! Welcome to SankshepAI.');
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to complete onboarding.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white">SankshepAI</span>
        </div>

        {/* Meaningful Profile Completion Badge */}
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
          <span>Profile Setup:</span>
          <span className="font-semibold text-cyan-400">{calculateCompletion()}% Complete</span>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto w-full my-8 bg-[#0E1526] rounded-2xl border border-white/10 p-6 sm:p-10 shadow-2xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
          {[
            { num: 1, label: 'Identity', icon: User },
            { num: 2, label: 'Preferences', icon: Sliders },
            { num: 3, label: 'Discovery', icon: Compass },
          ].map((item) => {
            const Icon = item.icon;
            const isCurrent = step === item.num;
            const isDone = step > item.num;
            return (
              <div key={item.num} className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-gradient-to-tr from-indigo-600 to-cyan-400 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-white/5 text-slate-400 border border-white/10'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : item.num}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs text-slate-400">Step {item.num}</div>
                  <div className={`text-xs font-semibold ${isCurrent ? 'text-white' : 'text-slate-500'}`}>
                    {item.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: WELCOME & IDENTITY ────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight mb-1">Welcome! Let’s set up your profile</h2>
              <p className="text-sm text-slate-400">
                Help us tailor summarization terminology to your domain and workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Display Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Dr. A. Sharma"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#070B14] border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Institution / Organization
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. IIT Delhi, Ministry of Finance, Law Corp"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#070B14] border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Avatar Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Choose an Avatar
              </label>
              <div className="flex items-center gap-3">
                {AVATAR_PRESETS.map((pUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatar(pUrl)}
                    className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${
                      avatar === pUrl ? 'border-cyan-400 scale-110 shadow-lg shadow-cyan-500/25' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={pUrl} alt="Avatar" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Role / Occupation Selection Cards */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Your Primary Role or Occupation
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {OCCUPATION_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = occupation === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setOccupation(opt.id)}
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-md'
                          : 'bg-[#070B14] border-white/5 text-slate-300 hover:border-white/15'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{opt.label}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={handleNextStep1}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 disabled:opacity-50"
              >
                <span>{isSaving ? 'Saving...' : 'Continue to Preferences'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: INTERESTS & PREFERENCES ──────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight mb-1">Your Summarization Preferences</h2>
              <p className="text-sm text-slate-400">
                Choose the documents you summarize most frequently and your default summary presentation.
              </p>
            </div>

            {/* Document Types */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                What types of documents will you summarize? (Select multiple)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DOCUMENT_INTERESTS.map((doc) => {
                  const isSelected = interests.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleToggleInterest(doc.id)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-400 text-white'
                          : 'bg-[#070B14] border-white/5 text-slate-300 hover:border-white/15'
                      }`}
                    >
                      <span className="font-medium">{doc.label}</span>
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                          isSelected ? 'bg-cyan-400 border-cyan-400 text-slate-900' : 'border-white/20'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary Style */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Preferred Summary Style
              </label>
              <div className="space-y-2">
                {STYLE_OPTIONS.map((style) => {
                  const isSelected = summaryStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setSummaryStyle(style.id)}
                      className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-md'
                          : 'bg-[#070B14] border-white/5 text-slate-300 hover:border-white/15'
                      }`}
                    >
                      <div className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-white/20'}`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{style.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{style.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Default Length */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Default Summary Length
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'short', label: 'Short (~20%)', desc: 'Quick overview' },
                  { id: 'balanced', label: 'Balanced (~35%)', desc: 'Standard synthesis' },
                  { id: 'detailed', label: 'Detailed (~50%)', desc: 'Thorough coverage' },
                ].map((len) => (
                  <button
                    key={len.id}
                    type="button"
                    onClick={() => setSummaryLength(len.id)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      summaryLength === len.id
                        ? 'bg-cyan-500/10 border-cyan-400 text-white'
                        : 'bg-[#070B14] border-white/5 text-slate-400 hover:border-white/15'
                    }`}
                  >
                    <div className="text-xs font-semibold text-white">{len.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{len.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleNextStep2}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 disabled:opacity-50"
              >
                <span>{isSaving ? 'Saving...' : 'Continue to Discovery'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: DISCOVERY SOURCE ────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight mb-1">How did you hear about SankshepAI?</h2>
              <p className="text-sm text-slate-400">
                Help us understand how researchers and professionals discover our platform.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DISCOVERY_OPTIONS.map((src) => {
                const isSelected = discoverySources.includes(src);
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => handleToggleDiscovery(src)}
                    className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-400 text-white'
                        : 'bg-[#070B14] border-white/5 text-slate-400 hover:border-white/15'
                    }`}
                  >
                    <span>{src}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                );
              })}
            </div>

            {discoverySources.includes('Other') && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Please specify (optional)
                </label>
                <input
                  type="text"
                  value={discoveryOther}
                  onChange={(e) => setDiscoveryOther(e.target.value)}
                  placeholder="e.g. Recommended at NLP Conference 2026"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#070B14] border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 leading-relaxed">
              Your preferences will be saved securely to your account. You can adjust your default summary lengths, styles, and external fallback settings anytime under Account Settings.
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSaving}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-400 hover:from-indigo-500 hover:to-cyan-300 text-white text-sm font-bold flex items-center gap-2 shadow-xl shadow-indigo-600/30 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isSaving ? 'Finalizing Setup...' : 'Complete Setup & Go to Dashboard'}</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer info */}
      <div className="max-w-4xl mx-auto text-center text-xs text-slate-500 py-2">
        SankshepAI &copy; {new Date().getFullYear()} — Enterprise & Academic NLP
      </div>
    </div>
  );
}
