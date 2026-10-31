import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import useUIStore from './store/uiStore';

// Layouts
import AppLayout from './components/layout/AppLayout';
import AuthLayout from './components/layout/AuthLayout';

// Public pages
import LandingPage from './pages/LandingPage';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';

// Onboarding
import OnboardingPage from './pages/OnboardingPage';

// App pages
import DashboardPage from './pages/app/DashboardPage';
import NewSummaryPage from './pages/app/NewSummaryPage';
import DocumentsPage from './pages/app/DocumentsPage';
import DocumentDetailPage from './pages/app/DocumentDetailPage';
import SummaryLibraryPage from './pages/app/SummaryLibraryPage';
import SummaryDetailPage from './pages/app/SummaryDetailPage';
import ComparePageWrapper from './pages/app/ComparePage';
import AnalyticsPage from './pages/app/AnalyticsPage';
import ModelLabPage from './pages/app/ModelLabPage';
import CollectionsPage from './pages/app/CollectionsPage';
import ActivityPage from './pages/app/ActivityPage';
import ProfilePage from './pages/app/ProfilePage';
import SettingsPage from './pages/app/SettingsPage';
import HelpPage from './pages/app/HelpPage';
import AdminPage from './pages/app/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

// Route guards
function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function VerifiedRoute({ children }) {
  const { isAuthenticated, isVerified, isLoading, user } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isVerified) return <Navigate to="/verify-email" state={{ email: user?.email }} replace />;
  return children;
}

function OnboardedRoute({ children }) {
  const { isAuthenticated, isVerified, onboardingComplete, isLoading, user } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isVerified) return <Navigate to="/verify-email" state={{ email: user?.email }} replace />;
  if (!onboardingComplete) return <Navigate to="/onboarding" replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isVerified, onboardingComplete, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated && isVerified && onboardingComplete) {
    return <Navigate to="/app/dashboard" replace />;
  }
  if (isAuthenticated && isVerified && !onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }
  if (isAuthenticated && !isVerified) {
    return <Navigate to="/verify-email" replace />;
  }
  return children;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan flex items-center justify-center animate-pulse">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h12M4 18h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { checkAuth } = useAuthStore();
  const { theme } = useUIStore();

  useEffect(() => {
    // Apply persisted theme
    document.documentElement.classList.toggle('dark', theme === 'dark');
    // Check existing session
    checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#22262f',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#f43f5e', secondary: '#fff' },
          },
        }}
      />

      <Routes>
        {/* ── Public ─────────────────────────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

        {/* ── Auth ───────────────────────────────── */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicOnlyRoute>
                <SignupPage />
              </PublicOnlyRoute>
            }
          />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* ── Onboarding ─────────────────────────── */}
        <Route
          path="/onboarding"
          element={
            <VerifiedRoute>
              <OnboardingPage />
            </VerifiedRoute>
          }
        />

        {/* ── App ────────────────────────────────── */}
        <Route
          path="/app"
          element={
            <OnboardedRoute>
              <AppLayout />
            </OnboardedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="new-summary" element={<NewSummaryPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="documents/:id" element={<DocumentDetailPage />} />
          <Route path="summaries" element={<SummaryLibraryPage />} />
          <Route path="summaries/:id" element={<SummaryDetailPage />} />
          <Route path="compare" element={<ComparePageWrapper />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="lab" element={<ModelLabPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>

        {/* ── 404 ────────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
