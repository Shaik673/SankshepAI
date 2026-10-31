import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import useAuthStore from '../../store/authStore';
import useUIStore from '../../store/uiStore';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  FilePlus,
  FolderOpen,
  BookMarked,
  GitCompare,
  BarChart3,
  FlaskConical,
  FolderKanban,
  Clock,
  UserCircle,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/app/dashboard', icon: LayoutDashboard, section: 'main' },
  { label: 'New Summary', to: '/app/new-summary', icon: FilePlus, section: 'main', accent: true },
  { label: 'My Documents', to: '/app/documents', icon: FolderOpen, section: 'library' },
  { label: 'Summary Library', to: '/app/summaries', icon: BookMarked, section: 'library' },
  { label: 'Compare', to: '/app/compare', icon: GitCompare, section: 'library' },
  { label: 'Analytics', to: '/app/analytics', icon: BarChart3, section: 'tools' },
  { label: 'Model Lab', to: '/app/lab', icon: FlaskConical, section: 'tools' },
  { label: 'Collections', to: '/app/collections', icon: FolderKanban, section: 'tools' },
  { label: 'Activity', to: '/app/activity', icon: Clock, section: 'tools' },
  { label: 'Profile', to: '/app/profile', icon: UserCircle, section: 'account' },
  { label: 'Settings', to: '/app/settings', icon: Settings, section: 'account' },
  { label: 'Help & Docs', to: '/app/help', icon: HelpCircle, section: 'account' },
  { label: 'Admin Portal', to: '/app/admin', icon: ShieldCheck, section: 'account', adminOnly: true },
];

const SECTIONS = [
  { id: 'main', label: null },
  { id: 'library', label: 'Library' },
  { id: 'tools', label: 'Tools' },
  { id: 'account', label: 'Account' },
];

export default function Sidebar() {
  const { user, profile, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      toast.error('Logout failed. Please try again.');
    }
  };

  const displayName = profile?.displayName || user?.fullName || 'User';
  const avatarUrl = profile?.avatarUrl;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen bg-graphite-900/95 border-r border-graphite-700/60 backdrop-blur-sm',
        'transition-[width] duration-250 ease-in-out overflow-hidden shrink-0',
        sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-graphite-700/60 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan flex items-center justify-center shadow-glow-indigo shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <span className="text-white font-bold text-base whitespace-nowrap">SankshepAI</span>
            <div className="text-graphite-500 text-[10px] font-medium tracking-wider uppercase whitespace-nowrap">
              NLP Platform
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {SECTIONS.map((section) => {
          const items = NAV_ITEMS.filter((i) => {
            if (i.section !== section.id) return false;
            if (i.adminOnly && user?.role !== 'admin') return false;
            return true;
          });
          if (items.length === 0) return null;
          return (
            <div key={section.id} className="mb-1">
              {section.label && !sidebarCollapsed && (
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-graphite-500">
                  {section.label}
                </div>
              )}
              {section.label && sidebarCollapsed && (
                <div className="my-2 border-t border-graphite-700/40" />
              )}
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      sidebarCollapsed ? 'justify-center' : '',
                      isActive
                        ? item.accent
                          ? 'bg-gradient-to-r from-indigo-600/30 to-cyan/10 text-indigo-300 border border-indigo-500/20'
                          : 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/15'
                        : item.accent
                        ? 'text-indigo-400 hover:bg-indigo-600/10 hover:text-indigo-300'
                        : 'text-graphite-400 hover:bg-graphite-700/60 hover:text-white'
                    )
                  }
                >
                  <item.icon className="w-4.5 h-4.5 shrink-0" size={18} />
                  {!sidebarCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-graphite-700/60 p-3 shrink-0">
        {/* User info */}
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-xl hover:bg-graphite-700/40 transition-colors cursor-pointer',
            sidebarCollapsed && 'justify-center'
          )}
          onClick={() => navigate('/app/profile')}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{displayName}</div>
              <div className="text-graphite-500 text-xs truncate">{user?.email}</div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={sidebarCollapsed ? 'Logout' : undefined}
          className={cn(
            'mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-xl text-graphite-400 text-sm',
            'hover:bg-rose/10 hover:text-rose transition-colors',
            sidebarCollapsed && 'justify-center'
          )}
        >
          <LogOut size={16} className="shrink-0" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute top-1/2 -right-3 -translate-y-1/2 z-10 w-6 h-6 rounded-full
          bg-graphite-700 border border-graphite-600 text-graphite-400
          hover:bg-graphite-600 hover:text-white transition-all
          flex items-center justify-center shadow-lg"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
