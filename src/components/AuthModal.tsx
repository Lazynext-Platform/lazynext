'use client';

import { useState, useEffect, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { X } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

type ModalMode = 'signin' | 'signup' | 'forgot';

export function AuthModal({ open, onClose, initialMode = 'signin' }: {
  open: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<ModalMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMode(initialMode); }, [initialMode, open]);
  useEffect(() => { if (open) { setError(''); setInfo(''); setEmail(''); setPassword(''); setName(''); } }, [open]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: name || undefined }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || t('auth.signUpError'));
          setLoading(false);
          return;
        }
        // Auto sign-in after signup
        const result = await signIn('credentials', { email, password, redirect: false });
        if (result?.error) {
          setInfo(t('auth.signUpSuccess'));
          setMode('signin');
          setLoading(false);
          return;
        }
        onClose();
        window.location.reload();
      } else if (mode === 'signin') {
        const result = await signIn('credentials', { email, password, redirect: false });
        if (result?.error) {
          setError(t('auth.invalidCreds'));
          setLoading(false);
          return;
        }
        onClose();
        window.location.reload();
      } else if (mode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Request failed');
          setLoading(false);
          return;
        }
        setInfo(data.message || 'If an account exists, a reset link has been sent to your email.');
        setLoading(false);
      }
    } catch {
      setError(mode === 'signup' ? t('auth.signUpError') : mode === 'forgot' ? 'Request failed' : t('auth.signInError'));
      setLoading(false);
    }
  }, [mode, email, password, name, t, onClose]);

  const handleGoogle = useCallback(() => {
    signIn('google');
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-line bg-popover p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-fg">
            {mode === 'signin' && t('auth.signInTab')}
            {mode === 'signup' && t('auth.signUpTab')}
            {mode === 'forgot' && 'Forgot Password'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-fg-faint hover:bg-elevated hover:text-fg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Forgot password mode */}
        {mode === 'forgot' ? (
          <div className="space-y-4">
            <p className="text-sm text-fg-faint">Enter your email and we&apos;ll send you a link to reset your password.</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                placeholder={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-line bg-hover px-4 py-2.5 text-sm text-fg placeholder-fg-placeholder outline-none focus:border-brand-400"
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              {info && <p className="text-sm text-green-400">{info}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                style={{ background: '#00b2fc' }}
              >
                {loading ? '…' : 'Send Reset Link'}
              </button>
            </form>
            <p className="text-center text-sm text-fg-faint">
              <button onClick={() => { setMode('signin'); setError(''); setInfo(''); }} className="font-semibold text-brand-400 hover:underline">
                ← {t('auth.signInLink')}
              </button>
            </p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="mb-5 flex gap-1 rounded-lg bg-hover p-1">
              <button
                onClick={() => { setMode('signin'); setError(''); setInfo(''); }}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${mode === 'signin' ? 'bg-[#00b2fc] text-white' : 'text-fg-faint hover:text-fg'}`}
              >
                {t('auth.signInTab')}
              </button>
              <button
                onClick={() => { setMode('signup'); setError(''); setInfo(''); }}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${mode === 'signup' ? 'bg-[#00b2fc] text-white' : 'text-fg-faint hover:text-fg'}`}
              >
                {t('auth.signUpTab')}
              </button>
            </div>

            {/* Google button */}
            <button
              onClick={handleGoogle}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('auth.googleBtn')}
            </button>

            {/* Divider */}
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-elevated" />
              <span className="text-xs text-fg-faint">{t('auth.orContinueWith')}</span>
              <div className="h-px flex-1 bg-elevated" />
            </div>

            {/* Email/password form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <input
                  type="text"
                  placeholder={t('auth.name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-line bg-hover px-4 py-2.5 text-sm text-fg placeholder-fg-placeholder outline-none focus:border-brand-400"
                />
              )}
              <input
                type="email"
                placeholder={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-line bg-hover px-4 py-2.5 text-sm text-fg placeholder-fg-placeholder outline-none focus:border-brand-400"
              />
              <input
                type="password"
                placeholder={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-line bg-hover px-4 py-2.5 text-sm text-fg placeholder-fg-placeholder outline-none focus:border-brand-400"
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              {info && <p className="text-sm text-green-400">{info}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                style={{ background: '#00b2fc' }}
              >
                {loading ? '…' : mode === 'signin' ? t('auth.signInBtn') : t('auth.signUpBtn')}
              </button>
            </form>

            {/* Forgot password + switch mode links */}
            <div className="mt-4 flex items-center justify-between text-sm">
              {mode === 'signin' && (
                <button onClick={() => { setMode('forgot'); setError(''); setInfo(''); }} className="text-fg-faint hover:text-brand-400 hover:underline">
                  Forgot password?
                </button>
              )}
              <p className="text-fg-faint">
                {mode === 'signin' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
                <button
                  onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo(''); }}
                  className="font-semibold text-brand-400 hover:underline"
                >
                  {mode === 'signin' ? t('auth.signUpLink') : t('auth.signInLink')}
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
