import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { Spinner } from '../../components/ui/LoadingSpinner';

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuthStore();
  const [error, setError] = useState('');

  useEffect(() => {
    async function handleCallback() {
      const errorParam = searchParams.get('error');
      if (errorParam) {
        setError(decodeURIComponent(errorParam));
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // Re-check auth session — the OAuth callback sets a cookie server-side
        await checkAuth();
        const { isAuthenticated, isVerified, onboardingComplete } = useAuthStore.getState();

        if (!isAuthenticated) {
          setError('Authentication failed. Please try again.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
        if (!isVerified) {
          navigate('/verify-email');
          return;
        }
        if (!onboardingComplete) {
          navigate('/onboarding');
          return;
        }
        navigate('/app/dashboard');
      } catch {
        setError('Authentication failed. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
      }
    }

    handleCallback();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-rose/10 border border-rose/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-white font-semibold text-lg mb-2">Authentication failed</h2>
          <p className="text-graphite-400 text-sm mb-4">{error}</p>
          <p className="text-graphite-500 text-xs">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-graphite-400 text-sm">Completing sign in…</p>
      </div>
    </div>
  );
}
