'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/i18n/provider';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError(t('reset.errInvalidToken'));
      setStatus('error');
    }
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError(t('reset.errMismatch'));
      setStatus('error');
      return;
    }
    if (password.length < 8) {
      setError(t('reset.errTooShort'));
      setStatus('error');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('reset.errFailed'));
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch {
      setError(t('reset.errFailed'));
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-4 app-grid-bg bg-app">
        <div className="w-full rounded-2xl border border-line bg-popover p-8 text-center">
          <div className="mb-4 text-5xl">✅</div>
          <h1 className="mb-2 text-xl font-bold text-fg">{t('reset.title')}</h1>
          <p className="mb-6 text-sm text-fg-muted">{t('reset.successMessage')}</p>
          <Link href="/" className="inline-block rounded-xl px-6 py-2.5 text-sm font-bold text-white" style={{ background: '#0064d9' }}>
            {t('reset.backToSignIn')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-4 app-grid-bg bg-app">
      <div className="w-full rounded-2xl border border-line bg-popover p-8">
        <h1 className="mb-2 text-xl font-bold text-fg">{t('reset.heading')}</h1>
        <p className="mb-6 text-sm text-fg-faint">{t('reset.subtitle')}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            autoComplete="new-password"
            aria-label={t('reset.newPassword')}
            placeholder={t('reset.newPassword')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-xl border border-line bg-hover px-4 py-2.5 text-sm text-fg placeholder-fg-placeholder outline-none focus:border-brand-400"
          />
          <input
            type="password"
            autoComplete="new-password"
            aria-label={t('reset.confirmPassword')}
            placeholder={t('reset.confirmPassword')}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-xl border border-line bg-hover px-4 py-2.5 text-sm text-fg placeholder-fg-placeholder outline-none focus:border-brand-400"
          />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={status === 'loading' || !token}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            style={{ background: '#0064d9' }}
          >
            {status === 'loading' ? t('reset.resetting') : t('reset.reset')}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-fg-faint">
          <Link href="/" className="text-brand-400 hover:underline">{t('reset.backToSignIn2')}</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const { t } = useI18n();
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-fg-faint">{t('reset.loading')}</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
