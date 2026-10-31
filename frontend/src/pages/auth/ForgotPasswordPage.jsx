import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { authApi } from '../../lib/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { isValidEmail } from '../../lib/utils';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) { setEmailError('Email is required'); return; }
    if (!isValidEmail(email)) { setEmailError('Enter a valid email address'); return; }
    setEmailError('');
    setLoading(true);
    try {
      // Always show success to prevent email enumeration
      await authApi.forgotPassword({ email: email.toLowerCase().trim() });
    } catch {
      // Swallow error — we show same success message regardless
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <>
        <Helmet><title>Check Email — SankshepAI</title></Helmet>
        <div className="animate-fade-in text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald/10 border border-emerald/30 flex items-center justify-center mx-auto mb-4">
            <Mail size={24} className="text-emerald" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Check your email</h1>
          <p className="text-graphite-400 text-sm mb-6 max-w-xs mx-auto">
            If an account exists for <span className="text-white font-medium">{email}</span>, we sent a password reset code.
          </p>
          <p className="text-graphite-500 text-xs mb-8">
            Check your spam folder. The code expires in 15 minutes.
          </p>
          <Link
            to="/reset-password"
            state={{ email }}
            className="btn-primary inline-flex items-center gap-2 mb-4"
          >
            Enter reset code
          </Link>
          <br />
          <Link
            to="/login"
            className="text-graphite-400 hover:text-white text-sm transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>Forgot Password — SankshepAI</title></Helmet>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Reset your password</h1>
          <p className="text-graphite-400 text-sm mt-1">
            Enter your email and we'll send you a reset code
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            id="email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
            error={emailError}
            leftIcon={<Mail />}
            required
            autoComplete="email"
          />

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full"
            leftIcon={<Send />}
          >
            Send reset code
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-graphite-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>
      </div>
    </>
  );
}
