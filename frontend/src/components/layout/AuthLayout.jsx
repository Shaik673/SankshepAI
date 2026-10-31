import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function AuthLayout() {
  return (
    <>
      <Helmet>
        <title>SankshepAI — Sign In</title>
      </Helmet>
      <div className="min-h-screen bg-navy-900 flex">
        {/* Left panel — branding */}
        <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-mesh-gradient" />
          <div className="absolute inset-0 bg-hero-gradient" />
          {/* Decorative orbs */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-cyan/15 blur-3xl pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan flex items-center justify-center shadow-glow-indigo">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                  <path d="M4 6h16M4 12h12M4 18h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">SankshepAI</span>
            </Link>
          </div>

          {/* Center content */}
          <div className="relative z-10 space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-white leading-tight">
                Intelligent Document{' '}
                <span className="gradient-text">Summarization</span>
              </h2>
              <p className="text-graphite-400 text-lg leading-relaxed">
                Transform lengthy government circulars, research papers, and reports into
                clear, concise summaries powered by custom NLP models.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="space-y-4">
              {[
                {
                  icon: '🧠',
                  title: 'Custom Attention Model',
                  desc: 'Encoder-decoder LSTM with Bahdanau attention',
                },
                {
                  icon: '📊',
                  title: 'ROUGE Evaluation',
                  desc: 'Rigorous academic evaluation metrics',
                },
                {
                  icon: '⚡',
                  title: 'TextRank Baseline',
                  desc: 'Graph-based extractive summarization',
                },
              ].map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
                >
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <div className="text-white font-semibold text-sm">{f.title}</div>
                    <div className="text-graphite-400 text-xs mt-0.5">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 text-graphite-500 text-sm">
            © 2024 SankshepAI. Academic NLP Research Platform.
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <path d="M4 6h16M4 12h12M4 18h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">SankshepAI</span>
            </Link>
          </div>

          <div className="w-full max-w-md mx-auto">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}
