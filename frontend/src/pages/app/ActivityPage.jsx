import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Clock,
  Sparkles,
  FileText,
  Sliders,
  UserCheck,
  Trash2,
  BookmarkPlus,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { analyticsApi } from '../../lib/api';

const ACTION_ICONS = {
  summary_generated: Sparkles,
  summary_edited: Sliders,
  summary_exported: FileText,
  document_uploaded: FileText,
  document_deleted: Trash2,
  collection_created: BookmarkPlus,
  onboarding_completed: UserCheck,
  user_login: Activity,
  user_signup: UserCheck,
  email_verified: UserCheck,
  settings_updated: Sliders,
};

export default function ActivityPage() {
  const [activities, setActivities] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActivities() {
      setIsLoading(true);
      try {
        const res = await analyticsApi.getActivity({ page, limit: 15 });
        if (res.data.success) {
          setActivities(res.data.activities);
          setTotal(res.data.pagination.total);
          setPages(res.data.pagination.pages);
        }
      } catch {
        toast.error('Failed to load activity history.');
      } finally {
        setIsLoading(false);
      }
    }
    loadActivities();
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Activity History</h1>
        <p className="text-xs text-slate-400 mt-1">
          Complete transparent audit trail of account actions, document ingestions, summaries, and edits.
        </p>
      </div>

      <div className="bg-[#0E1526] rounded-2xl border border-white/10 shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-slate-400">Loading activities...</div>
        ) : activities.length > 0 ? (
          <div className="divide-y divide-white/5">
            {activities.map((act) => {
              const Icon = ACTION_ICONS[act.actionType] || Activity;
              return (
                <div key={act._id} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-white/[0.015] transition-colors">
                  <div className="p-2.5 rounded-xl bg-white/5 text-cyan-400 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-white truncate">{act.description}</span>
                      <span className="text-[11px] text-slate-500 shrink-0">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Action: {act.actionType}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center text-xs text-slate-500">
            No activity records logged yet.
          </div>
        )}

        {pages > 1 && (
          <div className="p-4 bg-[#070B14] border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <div>
              Page {page} of {pages} ({total} entries)
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
    </div>
  );
}
