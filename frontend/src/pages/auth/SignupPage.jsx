import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { User, Mail, Lock, UserPlus } from 'lucide-react';
import { authApi } from '../../lib/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import SocialAuthButtons from '../../components/auth/SocialAuthButtons';
import PasswordStrength from '../../components/auth/PasswordStrength';
import { isValidEmail, checkPasswordStrength } from '../../lib/utils';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const passwordStrength = checkPasswordStrength(form.password);

  function validate() {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!isValidEmail(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (passwordStrength.strength === 'very-weak') e.password = 'Password is too weak';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.acceptTerms) e.acceptTerms = 'You must accept the terms to continue';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await authApi.signup({
        fullName: form.fullName.trim(),
        email: form.email.toLowerCase().trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        acceptTerms: form.acceptTerms,
      });
      toast.success('Account created! Please verify your email.');
      navigate('/verify-email', { state: { email: form.email, devOtp: res.data?.devOtp } });
    } catch (err) {
      const msg = err.message || 'Signup failed';
      if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('exist')) {
        setErrors({ email: 'An account with this email already exists' });
      } else if (msg.toLowerCase().includes('email')) {
        setErrors({ email: msg });
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <>
      <Helmet><title>Create Account — SankshepAI</title></Helmet>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-graphite-400 text-sm mt-1">Start summarizing documents with AI</p>
        </div>

        <SocialAuthButtons mode="signup" />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-graphite-700/60" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-navy-900 px-3 text-graphite-500 text-xs">or sign up with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            id="fullName"
            label="Full name"
            type="text"
            placeholder="Dr. Jane Smith"
            value={form.fullName}
            onChange={set('fullName')}
            error={errors.fullName}
            leftIcon={<User />}
            required
            autoComplete="name"
          />

          <Input
            id="email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={set('email')}
            error={errors.email}
            leftIcon={<Mail />}
            required
            autoComplete="email"
          />

          <div className="space-y-1.5">
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="Create a strong password"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              leftIcon={<Lock />}
              required
              autoComplete="new-password"
            />
            {form.password && <PasswordStrength strength={passwordStrength} />}
          </div>

          <Input
            id="confirmPassword"
            label="Confirm password"
            type="password"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            error={errors.confirmPassword}
            leftIcon={<Lock />}
            required
            autoComplete="new-password"
          />

          <div className="space-y-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, acceptTerms: e.target.checked }));
                  setErrors((prev) => ({ ...prev, acceptTerms: '' }));
                }}
                className="w-4 h-4 mt-0.5 rounded border-graphite-600 bg-graphite-700 text-indigo-500 focus:ring-indigo-500/30 shrink-0"
              />
              <span className="text-graphite-400 text-sm">
                I agree to the{' '}
                <Link to="/terms" className="text-indigo-400 hover:text-indigo-300">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</Link>
              </span>
            </label>
            {errors.acceptTerms && (
              <p className="text-xs text-rose pl-6">{errors.acceptTerms}</p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full"
            leftIcon={<UserPlus />}
          >
            Create account
          </Button>
        </form>

        <p className="text-center text-graphite-400 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}
