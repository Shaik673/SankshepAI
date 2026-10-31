import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import SocialAuthButtons from '../../components/auth/SocialAuthButtons';
import { isValidEmail } from '../../lib/utils';

export default function LoginPage() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/app/dashboard';

  function validate() {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!isValidEmail(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const result = await login({ email: form.email.toLowerCase().trim(), password: form.password });
      if (!result.user.emailVerified) {
        toast.success('Verification code sent to your email.');
        navigate('/verify-email', { state: { email: form.email, devOtp: result.devOtp } });
        return;
      }
      if (!result.onboardingComplete) {
        navigate('/onboarding');
        return;
      }
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.message || 'Login failed';
      if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('password') || msg.toLowerCase().includes('credentials')) {
        setErrors({ general: msg });
      } else if (msg.toLowerCase().includes('verified')) {
        setErrors({ general: msg });
        setTimeout(() => navigate('/verify-email', { state: { email: form.email } }), 1500);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Helmet><title>Sign In — SankshepAI</title></Helmet>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-graphite-400 text-sm mt-1">Sign in to your SankshepAI account</p>
        </div>

        {/* Social auth */}
        <SocialAuthButtons mode="login" />

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-graphite-700/60" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-navy-900 px-3 text-graphite-500 text-xs">or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errors.general && (
            <div className="p-3 rounded-xl bg-rose/10 border border-rose/20 text-rose text-sm" role="alert">
              {errors.general}
            </div>
          )}

          <Input
            id="email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: '' }); }}
            error={errors.email}
            leftIcon={<Mail />}
            required
            autoComplete="email"
          />

          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: '' }); }}
            error={errors.password}
            leftIcon={<Lock />}
            required
            autoComplete="current-password"
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.remember}
                onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                className="w-4 h-4 rounded border-graphite-600 bg-graphite-700 text-indigo-500 focus:ring-indigo-500/30"
              />
              <span className="text-graphite-400 text-sm">Remember me</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full"
            leftIcon={<LogIn />}
          >
            Sign in
          </Button>
        </form>

        <p className="text-center text-graphite-400 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Create account
          </Link>
        </p>
      </div>
    </>
  );
}
