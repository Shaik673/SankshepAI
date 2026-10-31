import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { X, Sparkles, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, FilePlus, FolderOpen, BookMarked, GitCompare,
  BarChart3, FlaskConical, FolderKanban, Clock, UserCircle, Settings, HelpCircle,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/app/dashboard', icon: LayoutDashboard },
  { label: 'New Summary', to: '/app/new-summary', icon: FilePlus },
  { label: 'My Documents', to: '/app/documents', icon: FolderOpen },
  { label: 'Summary Library', to: '/app/summaries', icon: BookMarked },
  { label: 'Compare', to: '/app/compare', icon: GitCompare },
  { label: 'Analytics', to: '/app/analytics', icon: BarChart3 },
  { label: 'Model Lab', to: '/app/lab', icon: FlaskConical },
  { label: 'Collections', to: '/app/collections', icon: FolderKanban },
  { label: 'Activity', to: '/app/activity', icon: Clock },
  { label: 'Profile', to: '/app/profile', icon: UserCircle },
  { label: 'Settings', to: '/app/settings', icon: Settings },
  { label: 'Help & Docs', to: '/app/help', icon: HelpCircle },
];

export default function MobileNav({ isOpen, onClose }) {
  const { user, profile, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
      navigate('/login');
    } catch {
      toast.error('Logout failed.');
    }
  };

  const displayName = profile?.displayName || user?.fullName || 'User';
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  if (!isOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute left-0 top-0 h-full w-72 bg-graphite-900 border-r border-graphite-700/60 flex flex-col animate-slide-down">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-graphite-700/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="text-white font-bold">SankshepAI</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-graphite-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/15'
                    : 'text-graphite-400 hover:bg-graphite-700/60 hover:text-white'
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-graphite-700/60 p-3">
          <div className="flex items-center gap-3 p-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{displayName}</div>
              <div className="text-graphite-500 text-xs truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-graphite-400 text-sm hover:bg-rose/10 hover:text-rose transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
