import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { Mail, RefreshCw, CheckCircle } from 'lucide-react';
import { authApi } from '../../lib/api';
import useAuthStore from '../../store/authStore';
import Button from '../../components/ui/Button';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyEmailPage() {
  const { setEmailVerified, onboardingComplete, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || user?.email || '';

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [devOtp, setDevOtp] = useState(location.state?.devOtp || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (location.state?.devOtp) {
      const code = String(location.state.devOtp).slice(0, OTP_LENGTH);
      setDevOtp(code);
      setOtp(code.split(''));
    } else {
      inputRefs.current[0]?.focus();
    }
  }, [location.state]);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function handleInput(index, value) {
    const v = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = v;
    setOtp(newOtp);
    setError('');

    if (v && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (v && newOtp.every((d) => d !== '')) {
      handleVerify(newOtp.join(''));
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const newOtp = [...otp];
    pasted.split('').forEach((char, i) => {
      if (i < OTP_LENGTH) newOtp[i] = char;
    });
    setOtp(newOtp);
    const nextEmpty = newOtp.findIndex((d) => d === '');
    const focusIdx = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
    inputRefs.current[focusIdx]?.focus();
    if (newOtp.every((d) => d !== '')) {
      handleVerify(newOtp.join(''));
    }
  }

  async function handleVerify(code) {
    if (!code || code.length < OTP_LENGTH) return;
    setLoading(true);
    setError('');
    try {
      const res = await authApi.verifyEmail({ email, otp: code });
      setVerified(true);
      setEmailVerified(res.data);
      setTimeout(() => {
        navigate('/onboarding');
      }, 1000);
    } catch (err) {
      setError(err.message || 'Invalid or expired code. Please try again.');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setResendLoading(true);
    try {
      const res = await authApi.resendOtp({ email });
      setCooldown(RESEND_COOLDOWN);
      toast.success('Verification code resent! Check your inbox.');
      if (res.data?.devOtp) {
        const code = String(res.data.devOtp).slice(0, OTP_LENGTH);
        setDevOtp(code);
        setOtp(code.split(''));
      } else {
        setOtp(Array(OTP_LENGTH).fill(''));
        setError('');
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  }

  if (verified) {
    return (
      <div className="animate-scale-in flex flex-col items-center text-center py-8">
        <div className="w-16 h-16 rounded-full bg-emerald/10 border border-emerald/30 flex items-center justify-center mb-4">
          <CheckCircle size={32} className="text-emerald" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Email verified!</h2>
        <p className="text-graphite-400 text-sm">Taking you to onboarding…</p>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Verify Email — SankshepAI</title></Helmet>
      <div className="animate-fade-in">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center mb-4">
            <Mail size={24} className="text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Check your email</h1>
          <p className="text-graphite-400 text-sm mt-2 max-w-xs">
            We sent a {OTP_LENGTH}-digit verification code to{' '}
            <span className="text-white font-medium">{email}</span>
          </p>
        </div>

        {devOtp && (
          <div className="mb-5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 text-center flex items-center justify-between">
            <span>Dev code detected: <strong className="font-mono text-sm tracking-widest text-indigo-200">{devOtp}</strong></span>
            <button
              type="button"
              onClick={() => {
                const code = String(devOtp).slice(0, OTP_LENGTH);
                setOtp(code.split(''));
                handleVerify(code);
              }}
              className="ml-2 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition-colors"
            >
              Auto-Verify
            </button>
          </div>
        )}

        {/* OTP inputs */}
        <div className="flex justify-center gap-2 mb-4">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInput(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-150
                bg-graphite-800/60 text-white
                ${digit ? 'border-indigo-500' : 'border-graphite-600'}
                ${error ? 'border-rose' : ''}
                focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30`}
              aria-label={`Digit ${i + 1}`}
              disabled={loading}
            />
          ))}
        </div>

        {error && (
          <p className="text-rose text-sm text-center mb-4" role="alert">{error}</p>
        )}

        {loading && (
          <div className="flex justify-center mb-4">
            <div className="w-6 h-6 rounded-full border-2 border-graphite-600 border-t-indigo-500 animate-spin" />
          </div>
        )}

        <Button
          onClick={() => handleVerify(otp.join(''))}
          variant="primary"
          loading={loading}
          disabled={otp.some((d) => !d)}
          className="w-full mb-4"
        >
          Verify email
        </Button>

        <div className="text-center">
          <p className="text-graphite-400 text-sm mb-2">Didn't receive the code?</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resendLoading}
            className="flex items-center justify-center gap-2 mx-auto text-indigo-400 hover:text-indigo-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={14} className={resendLoading ? 'animate-spin' : ''} />
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>

        <div className="mt-6 p-3 rounded-xl bg-graphite-700/40 border border-graphite-600/40 text-xs text-graphite-400 text-center">
          The code expires in 10 minutes. Check your spam folder if you don't see the email.
        </div>
      </div>
    </>
  );
}
