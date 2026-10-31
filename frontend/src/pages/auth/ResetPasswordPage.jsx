import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { Lock, CheckCircle } from 'lucide-react';
import { authApi } from '../../lib/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PasswordStrength from '../../components/auth/PasswordStrength';
import { checkPasswordStrength } from '../../lib/utils';

const OTP_LENGTH = 6;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');

  const [step, setStep] = useState('otp'); // 'otp' | 'password' | 'done'
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);
  const passwordStrength = checkPasswordStrength(form.password);

  useEffect(() => {
    if (step === 'otp') inputRefs.current[0]?.focus();
  }, [step]);

  function handleOtpInput(index, value) {
    const v = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = v;
    setOtp(newOtp);
    if (v && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (v && newOtp.every((d) => d !== '')) {
      setStep('password');
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  }

  async function handleReset(e) {
    e.preventDefault();
    const errs = {};
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await authApi.resetPassword({
        email,
        otp: otp.join(''),
        newPassword: form.password,
      });
      setStep('done');
    } catch (err) {
      const msg = err.message || 'Reset failed';
      if (msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('token') || msg.toLowerCase().includes('expired')) {
        toast.error(msg);
        setStep('otp');
        setOtp(Array(OTP_LENGTH).fill(''));
      } else {
        setErrors({ general: msg });
      }
    } finally {
      setLoading(false);
    }
  }

  if (step === 'done') {
    return (
      <div className="animate-scale-in flex flex-col items-center text-center py-8">
        <div className="w-16 h-16 rounded-full bg-emerald/10 border border-emerald/30 flex items-center justify-center mb-4">
          <CheckCircle size={32} className="text-emerald" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Password reset!</h2>
        <p className="text-graphite-400 text-sm mb-6">Your password has been updated successfully.</p>
        <Link to="/login" className="btn-primary">Sign in with new password</Link>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Reset Password — SankshepAI</title></Helmet>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            {step === 'otp' ? 'Enter your code' : 'Set new password'}
          </h1>
          <p className="text-graphite-400 text-sm mt-1">
            {step === 'otp'
              ? `Enter the 6-digit code sent to ${email || 'your email'}`
              : 'Choose a strong new password'}
          </p>
        </div>

        {step === 'otp' && (
          <div className="space-y-4">
            {!location.state?.email && (
              <Input
                id="resetEmail"
                label="Your account email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}
            <div className="flex justify-center gap-2">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpInput(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all
                    bg-graphite-800/60 text-white
                    ${digit ? 'border-indigo-500' : 'border-graphite-600'}
                    focus:outline-none focus:border-indigo-500`}
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>
            <Button
              onClick={() => setStep('password')}
              variant="secondary"
              disabled={otp.some((d) => !d)}
              className="w-full"
            >
              Continue
            </Button>
          </div>
        )}

        {step === 'password' && (
          <form onSubmit={handleReset} className="space-y-4" noValidate>
            {errors.general && (
              <div className="p-3 rounded-xl bg-rose/10 border border-rose/20 text-rose text-sm">
                {errors.general}
              </div>
            )}
            <div className="space-y-1.5">
              <Input
                id="password"
                label="New password"
                type="password"
                placeholder="New strong password"
                value={form.password}
                onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: '' }); }}
                error={errors.password}
                leftIcon={<Lock />}
                required
              />
              {form.password && <PasswordStrength strength={passwordStrength} />}
            </div>
            <Input
              id="confirmPassword"
              label="Confirm new password"
              type="password"
              placeholder="Repeat new password"
              value={form.confirmPassword}
              onChange={(e) => { setForm({ ...form, confirmPassword: e.target.value }); setErrors({ ...errors, confirmPassword: '' }); }}
              error={errors.confirmPassword}
              leftIcon={<Lock />}
              required
            />
            <Button type="submit" variant="primary" loading={loading} className="w-full">
              Reset password
            </Button>
            <button
              type="button"
              onClick={() => setStep('otp')}
              className="w-full text-graphite-400 hover:text-white text-sm transition-colors"
            >
              ← Back to code entry
            </button>
          </form>
        )}
      </div>
    </>
  );
}
