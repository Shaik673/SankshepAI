import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Search, Menu, X, ChevronRight } from 'lucide-react';
import useUIStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { cn } from '../../lib/utils';

const PAGE_TITLES = {
  '/app/dashboard': { title: 'Dashboard', subtitle: 'Overview of your activity' },
  '/app/new-summary': { title: 'New Summary', subtitle: 'Summarize a document' },
  '/app/documents': { title: 'My Documents', subtitle: 'Your uploaded documents' },
  '/app/summaries': { title: 'Summary Library', subtitle: 'All generated summaries' },
  '/app/compare': { title: 'Compare Summaries', subtitle: 'Side-by-side comparison' },
  '/app/analytics': { title: 'Analytics & Evaluation', subtitle: 'Performance metrics' },
  '/app/lab': { title: 'Model Laboratory', subtitle: 'Academic experiments' },
  '/app/collections': { title: 'Collections', subtitle: 'Organized document groups' },
  '/app/activity': { title: 'Activity History', subtitle: 'Recent actions' },
  '/app/profile': { title: 'Profile', subtitle: 'Your account information' },
  '/app/settings': { title: 'Settings', subtitle: 'Preferences and configuration' },
  '/app/help': { title: 'Help & Documentation', subtitle: 'Guides and references' },
};

export default function TopBar({ onMobileMenuToggle }) {
  const { sidebarCollapsed } = useUIStore();
  const { user, profile } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const pathInfo = PAGE_TITLES[location.pathname] || { title: 'SankshepAI', subtitle: '' };

  const displayName = profile?.displayName || user?.fullName || 'User';
  const avatarUrl = profile?.avatarUrl;
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="h-16 border-b border-graphite-700/60 bg-graphite-900/80 backdrop-blur-sm flex items-center px-4 gap-4 shrink-0">
      {/* Mobile menu toggle */}
      <button
        onClick={onMobileMenuToggle}
        className="md:hidden p-2 rounded-lg text-graphite-400 hover:bg-graphite-700/60 hover:text-white transition-colors"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-white font-semibold text-base truncate">{pathInfo.title}</h1>
        {pathInfo.subtitle && (
          <p className="text-graphite-500 text-xs hidden sm:block">{pathInfo.subtitle}</p>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        {searchOpen ? (
          <div className="flex items-center gap-2 bg-graphite-700/60 border border-graphite-600/60 rounded-xl px-3 py-2 animate-scale-in">
            <Search size={14} className="text-graphite-400 shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchOpen(false);
                  setSearchQuery('');
                }
                if (e.key === 'Enter' && searchQuery.trim()) {
                  navigate(`/app/documents?q=${encodeURIComponent(searchQuery.trim())}`);
                  setSearchOpen(false);
                  setSearchQuery('');
                }
              }}
              className="bg-transparent text-white text-sm placeholder-graphite-500 focus:outline-none w-48"
            />
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
              className="text-graphite-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-xl text-graphite-400 hover:bg-graphite-700/60 hover:text-white transition-colors"
            aria-label="Search"
          >
            <Search size={18} />
          </button>
        )}

        {/* Notifications placeholder */}
        <button
          className="relative p-2 rounded-xl text-graphite-400 hover:bg-graphite-700/60 hover:text-white transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>

        {/* Avatar */}
        <button
          onClick={() => navigate('/app/profile')}
          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-graphite-700/60 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet flex items-center justify-center text-white text-xs font-bold overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
        </button>
      </div>
    </header>
  );
}
