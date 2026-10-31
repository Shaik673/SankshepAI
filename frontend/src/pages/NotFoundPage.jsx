import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#070B14] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center mb-6 shadow-xl shadow-indigo-600/25">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-6xl font-extrabold tracking-tight text-white mb-3">404</h1>
      <h2 className="text-xl font-semibold text-slate-300 mb-2">Page Not Found</h2>
      <p className="text-sm text-slate-400 max-w-md mb-8">
        The destination you requested does not exist or may have been moved. Return to your workspace or home.
      </p>
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </Link>
        <Link
          to="/app/dashboard"
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30"
        >
          <Home className="w-4 h-4" />
          <span>Go to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
