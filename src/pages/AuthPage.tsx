import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api, setStoredToken } from '../lib/api.ts';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export function AuthPage({ initialMode = 'login' }: { initialMode?: AuthMode }) {
  const { setUser, refreshUser, navigate, notify } = useApp();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const res = await api.login({ email, password });
        setStoredToken(res.token);
        setUser(res.user);
        await refreshUser();
        notify(`Welcome back, ${res.user.name}.`, 'success');
        navigate(res.user.role === 'admin' ? '/admin' : '/dashboard');
      } else if (mode === 'register') {
        const res = await api.register({ name, email, password });
        setStoredToken(res.token);
        setUser(res.user);
        await refreshUser();
        notify('Account created! Complete your eligibility profile to get personalized recommendations.', 'success');
        navigate('/dashboard');
      } else if (mode === 'forgot') {
        const res = await api.forgotPassword(email);
        setInfoMessage(res.message);
        if (res.devResetCode) {
          setDevCode(res.devResetCode);
          setResetCode(res.devResetCode);
        }
        setMode('reset');
      } else if (mode === 'reset') {
        const res = await api.resetPassword(resetCode, newPassword);
        setInfoMessage(res.message);
        setDevCode(null);
        setPassword('');
        setMode('login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#138A55] mb-1">Citizen Account Access</p>
          <h1 className="font-display text-2xl font-bold text-[#172B4D]">
            {mode === 'login' && 'Log in to Yojana Sarthi'}
            {mode === 'register' && 'Create Your Free Account'}
            {mode === 'forgot' && 'Reset Your Password'}
            {mode === 'reset' && 'Enter Reset Code'}
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1.5">
            {mode === 'login' && 'Access saved schemes, document checklists, and your eligibility history.'}
            {mode === 'register' && 'Save your household profile once and track eligible schemes securely.'}
            {mode === 'forgot' && 'Enter your registered email to generate a time-limited reset code.'}
            {mode === 'reset' && 'Enter the reset code and choose a new password (minimum 8 characters).'}
          </p>
        </div>

        {/* Mode Tabs for Login / Register */}
        {(mode === 'login' || mode === 'register') && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F1F5F9] rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                mode === 'login' ? 'bg-white text-[#123B65] shadow-xs' : 'text-[#475467]'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                mode === 'register' ? 'bg-white text-[#123B65] shadow-xs' : 'text-[#475467]'
              }`}
            >
              Register
            </button>
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3.5 rounded-lg bg-[#138A55]/10 border border-[#138A55]/25 text-xs text-[#138A55]">
            <p>{infoMessage}</p>
            {devCode && (
              <p className="mt-1.5 font-mono font-semibold text-[#172B4D]">
                Local preview reset code: {devCode}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Full Name
              </label>
              <input
                id="auth-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Priya Sharma"
                className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg focus:border-[#123B65] focus:outline-none"
              />
            </div>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg focus:border-[#123B65] focus:outline-none"
              />
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="auth-password" className="block text-xs font-semibold text-[#172B4D]">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                    }}
                    className="text-xs font-medium text-[#123B65] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                required
                minLength={mode === 'register' ? 8 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Minimum 8 characters' : 'Enter your password'}
                className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg focus:border-[#123B65] focus:outline-none"
              />
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div>
                <label htmlFor="reset-code" className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  Reset Code
                </label>
                <input
                  id="reset-code"
                  type="text"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono border border-[#CBD5E1] rounded-lg focus:border-[#123B65] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="new-password" className="block text-xs font-semibold text-[#172B4D] mb-1.5">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg focus:border-[#123B65] focus:outline-none"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-[#123B65] hover:bg-[#0D2B4B] rounded-lg disabled:opacity-60"
          >
            {mode === 'forgot' || mode === 'reset' ? (
              <KeyRound className="w-4 h-4" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>
              {submitting
                ? 'Please wait...'
                : mode === 'login'
                ? 'Log In'
                : mode === 'register'
                ? 'Create Account'
                : mode === 'forgot'
                ? 'Generate Reset Code'
                : 'Update Password'}
            </span>
          </button>
        </form>

        {(mode === 'forgot' || mode === 'reset') && (
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className="mt-4 w-full text-center text-xs font-medium text-[#123B65] hover:underline"
          >
            Back to Log In
          </button>
        )}

        <div className="mt-6 pt-5 border-t border-[#F1F5F9] space-y-3">
          <div className="flex items-start gap-2 text-xs text-[#667085]">
            <ShieldCheck className="w-4 h-4 text-[#138A55] shrink-0 mt-0.5" />
            <span>
              No Aadhaar, PAN, or bank account is ever collected. You can also explore schemes and run eligibility checks as a guest.
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/eligibility')}
            className="w-full py-2 text-xs font-semibold text-[#123B65] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg"
          >
            Continue as Guest to Check Eligibility
          </button>
        </div>
      </div>
    </div>
  );
}
