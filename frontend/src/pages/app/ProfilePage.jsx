import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  User,
  Building2,
  Globe2,
  Mail,
  ShieldCheck,
  Calendar,
  Save,
  CheckCircle2,
  Upload
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { userApi } from '../../lib/api';

const OCCUPATION_OPTIONS = [
  'student',
  'faculty',
  'researcher',
  'government_employee',
  'journalist',
  'professional',
  'other',
];

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuthStore();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [occupation, setOccupation] = useState(profile?.occupation || '');
  const [institution, setInstitution] = useState(profile?.institution || '');
  const [country, setCountry] = useState(profile?.country || 'India');
  const [preferredLanguage, setPreferredLanguage] = useState(profile?.preferredLanguage || 'en');
  const [bio, setBio] = useState(profile?.bio || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || user?.fullName || '');
      setOccupation(profile.occupation || '');
      setInstitution(profile.institution || '');
      setCountry(profile.country || 'India');
      setPreferredLanguage(profile.preferredLanguage || 'en');
      setBio(profile.bio || '');
    }
  }, [profile, user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await userApi.updateProfile({
        fullName,
        displayName,
        occupation,
        institution,
        country,
        preferredLanguage,
        bio,
      });

      if (res.data.success) {
        updateProfile(res.data.profile);
        toast.success('Profile updated successfully.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Profile & Identity</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your personal details, academic or organizational affiliation, and display preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Account Identity Card */}
        <div className="md:col-span-4 bg-[#0E1526] p-6 rounded-2xl border border-white/10 shadow-xl space-y-5 text-center">
          <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-tr from-indigo-600 to-cyan-400 p-1 flex items-center justify-center">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-[#0E1526] flex items-center justify-center text-white font-bold text-2xl">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">{user?.fullName}</h2>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-2 text-left text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span>Account Status:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Role:</span>
              <span className="font-mono uppercase text-cyan-400 text-[10px] font-bold">
                {user?.role || 'User'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Member Since:</span>
              <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '2026'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile Form */}
        <div className="md:col-span-8 bg-[#0E1526] p-6 sm:p-8 rounded-2xl border border-white/10 shadow-xl space-y-6">
          <h2 className="text-base font-bold text-white">Edit Profile Details</h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Role / Occupation
                </label>
                <select
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="">Select occupation</option>
                  {OCCUPATION_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Institution / Organization
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. University, Ministry, Organization"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                Bio / Research Interests
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A brief note about your work..."
                className="w-full p-3.5 rounded-xl bg-[#070B14] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 leading-relaxed font-sans"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Profile'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
