import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { isValidUsernameFormat, normalizeUsername } from '../lib/firebase';
import { BrandLogo } from './BrandLogo';
import { FernhollowCanvas } from './FernhollowCanvas';

interface AuthViewProps {
  initialMode: 'login' | 'register';
  onBackToLanding: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode,
  onBackToLanding,
}) => {
  const {
    user,
    needsUsernameSetup,
    registerWithEmail,
    loginWithEmail,
    sendResetEmail,
    claimUsernameAndInitProfile,
    logout,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Onboarding username state if username still needs claiming
  const [onboardingUsername, setOnboardingUsername] = useState(
    () => normalizeUsername(user?.displayName || '').replace(/[^a-z0-9_]/g, '').slice(0, 24)
  );

  useEffect(() => {
    if (needsUsernameSetup && !onboardingUsername && user?.displayName) {
      const candidate = normalizeUsername(user.displayName).replace(/[^a-z0-9_]/g, '').slice(0, 24);
      if (candidate) setOnboardingUsername(candidate);
    }
  }, [needsUsernameSetup, onboardingUsername, user?.displayName]);

  const mapAuthError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes('auth/operation-not-allowed')) {
      return 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication > Sign-in method).';
    }
    if (raw.includes('auth/email-already-in-use')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password')) {
      return 'Invalid email or password.';
    }
    if (raw.includes('auth/user-not-found')) {
      return 'No account found with that email address.';
    }
    if (raw.includes('auth/weak-password')) {
      return 'Password should be at least 6 characters.';
    }
    return raw.replace('Firebase: ', '').replace(/\s*\(auth\/[^)]+\)\.?/, '');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanUser = normalizeUsername(username);
    if (!isValidUsernameFormat(cleanUser)) {
      setErrorMsg(
        'Username must be 3-24 characters using lowercase letters, numbers, or underscores.'
      );
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await registerWithEmail(email, cleanUser, password);
      showToast('Account created! Welcome to MySphere.', 'success');
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await loginWithEmail(email, password, rememberMe);
      showToast('Welcome back to MySphere.', 'success');
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    setSubmitting(true);
    try {
      await sendResetEmail(email);
      showToast('Password reset link sent to your email.', 'success');
      setMode('login');
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };


  const handleClaimUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await claimUsernameAndInitProfile(onboardingUsername);
      showToast('Your MySphere workspace is ready.', 'success');
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-slate-900 dark:text-slate-100">
      <FernhollowCanvas variant="hero" />

      {/* Top minimal bar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <BrandLogo />

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Main auth card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-white/12 bg-white/85 dark:bg-slate-950/75 backdrop-blur-2xl p-7 sm:p-8 shadow-2xl">
          {needsUsernameSetup ? (
            <form onSubmit={handleClaimUsername}>
              <h1 className="font-display text-2xl font-semibold text-slate-950 dark:text-white">
                Claim your username
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Choose a unique handle so friends can find you and invite you to shared goals.
              </p>

              {errorMsg && (
                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-200">
                  {errorMsg}
                </div>
              )}

              <div className="mt-5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={onboardingUsername}
                  onChange={(e) => setOnboardingUsername(normalizeUsername(e.target.value))}
                  placeholder="e.g. aria_chen"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900/70 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  3–24 characters: lowercase letters, numbers, or underscores.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Enter MySphere</span>
              </button>

              <button
                type="button"
                onClick={() => void logout()}
                className="mt-3 w-full py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Sign out
              </button>
            </form>
          ) : mode === 'forgot' ? (
            <form onSubmit={handleForgot}>
              <h1 className="font-display text-2xl font-semibold text-slate-950 dark:text-white">
                Reset password
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Enter your email address and we will send you a password reset link.
              </p>

              {errorMsg && (
                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-200">
                  {errorMsg}
                </div>
              )}

              <div className="mt-5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900/70 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Send Reset Link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setMode('login');
                }}
                className="mt-4 w-full text-center text-xs text-violet-600 dark:text-violet-300 hover:underline cursor-pointer"
              >
                Back to Sign In
              </button>
            </form>
          ) : mode === 'register' ? (
            <form onSubmit={handleRegister}>
              <h1 className="font-display text-2xl font-semibold text-slate-950 dark:text-white">
                Create your account
              </h1>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                Begin your private workspace inside MySphere.
              </p>

              {errorMsg && (
                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-200 leading-relaxed">
                  {errorMsg}
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900/70 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                    placeholder="choose_a_username"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900/70 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    3–24 lowercase letters, numbers, or underscores.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900/70 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900/70 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Create Account</span>
              </button>

              <p className="mt-5 text-center text-xs text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setMode('login');
                  }}
                  className="text-violet-600 dark:text-violet-300 font-medium hover:underline cursor-pointer"
                >
                  Login
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <h1 className="font-display text-2xl font-semibold text-slate-950 dark:text-white">
                Welcome back
              </h1>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                Sign in to your MySphere workspace.
              </p>

              {errorMsg && (
                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-200 leading-relaxed">
                  {errorMsg}
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900/70 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-900/70 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-600 text-violet-600 focus:ring-violet-500"
                    />
                    <span>Remember Me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg('');
                      setMode('forgot');
                    }}
                    className="text-violet-600 dark:text-violet-300 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Login</span>
              </button>

              <p className="mt-5 text-center text-xs text-slate-600 dark:text-slate-400">
                New to MySphere?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setMode('register');
                  }}
                  className="text-violet-600 dark:text-violet-300 font-medium hover:underline cursor-pointer"
                >
                  Create Account
                </button>
              </p>
            </form>
          )}
        </div>
      </main>

      <footer className="py-5 text-center text-xs text-slate-500 dark:text-slate-400">
        MySphere — Your space. Your goals. Your growth.
      </footer>
    </div>
  );
};
