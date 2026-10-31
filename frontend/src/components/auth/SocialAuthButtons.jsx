import React from 'react';
import { authApi } from '../../lib/api';

const PROVIDERS_CONFIGURED = {
  google: !!import.meta.env.VITE_GOOGLE_CLIENT_ID,
  github: !!import.meta.env.VITE_GITHUB_CLIENT_ID,
  linkedin: !!import.meta.env.VITE_LINKEDIN_CLIENT_ID,
};

// Official brand SVGs
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.28.73-.55v-1.84c-3.03.64-3.67-1.46-3.67-1.46-.55-1.29-1.28-1.65-1.28-1.65-.92-.65.1-.65.1-.65 1.1 0 1.73 1.1 1.73 1.1.92 1.65 2.57 1.2 3.21.92a2 2 0 01.64-1.47c-2.47-.27-5.04-1.19-5.04-5.5 0-1.1.46-2.1 1.2-2.84a3.76 3.76 0 010-2.93s.91-.28 3.11 1.1c1.8-.49 3.7-.49 5.5 0 2.1-1.38 3.02-1.1 3.02-1.1a3.76 3.76 0 010 2.93c.83.74 1.2 1.74 1.2 2.84 0 4.31-2.57 5.23-5.04 5.5.45.37.82 1.1.82 2.2v3.21c0 .27.18.64.73.55A11 11 0 0012 1.27" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#0A66C2" d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
    </svg>
  );
}

export default function SocialAuthButtons({ mode = 'login' }) {
  const allUnconfigured = !PROVIDERS_CONFIGURED.google && !PROVIDERS_CONFIGURED.linkedin && !PROVIDERS_CONFIGURED.github;
  const verb = mode === 'signup' ? 'Sign up' : 'Continue';

  if (allUnconfigured && import.meta.env.PROD) return null;

  return (
    <div className="space-y-3">
      {/* Development notice when no providers are configured */}
      {allUnconfigured && !import.meta.env.PROD && (
        <div className="p-3 rounded-xl bg-amber/10 border border-amber/20 text-amber text-xs">
          Social login requires OAuth credentials. See <code className="font-mono">.env.example</code> for setup.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {/* Google */}
        <button
          type="button"
          onClick={() => PROVIDERS_CONFIGURED.google
            ? authApi.googleAuth()
            : window.alert('Google OAuth not configured. See .env.example.')
          }
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
            bg-graphite-700/60 border border-graphite-600/60 text-white text-sm font-medium
            hover:bg-graphite-600/60 hover:border-graphite-500/60 transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
          aria-label={`${verb} with Google`}
        >
          <GoogleIcon />
          <span className="hidden sm:inline text-xs">Google</span>
        </button>

        {/* GitHub */}
        <button
          type="button"
          onClick={() => PROVIDERS_CONFIGURED.github
            ? authApi.githubAuth()
            : window.alert('GitHub OAuth not configured. See .env.example.')
          }
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
            bg-graphite-700/60 border border-graphite-600/60 text-white text-sm font-medium
            hover:bg-graphite-600/60 hover:border-graphite-500/60 transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
          aria-label={`${verb} with GitHub`}
        >
          <GitHubIcon />
          <span className="hidden sm:inline text-xs">GitHub</span>
        </button>

        {/* LinkedIn */}
        <button
          type="button"
          onClick={() => PROVIDERS_CONFIGURED.linkedin
            ? authApi.linkedinAuth()
            : window.alert('LinkedIn OAuth not configured. See .env.example.')
          }
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
            bg-graphite-700/60 border border-graphite-600/60 text-white text-sm font-medium
            hover:bg-graphite-600/60 hover:border-graphite-500/60 transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
          aria-label={`${verb} with LinkedIn`}
        >
          <LinkedInIcon />
          <span className="hidden sm:inline text-xs">LinkedIn</span>
        </button>
      </div>
    </div>
  );
}
