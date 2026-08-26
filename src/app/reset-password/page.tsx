'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('No reset token found. Please use the link from your email.');
      setStatus('error');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      setStatus('error');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
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
        setError(data.error || 'Reset failed');
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch {
      setError('Network error. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-4">
        <div className="w-full rounded-2xl border border-white/10 bg-[#1a1b1e] p-8 text-center">
          <div className="mb-4 text-5xl">✅</div>
          <h1 className="mb-2 text-xl font-bold text-white">Password Reset</h1>
          <p className="mb-6 text-sm text-white/60">Your password has been changed successfully. You can now sign in with your new password.</p>
          <Link href="/" className="inline-block rounded-xl px-6 py-2.5 text-sm font-bold text-white" style={{ background: '#00b2fc' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-4">
      <div className="w-full rounded-2xl border border-white/10 bg-[#1a1b1e] p-8">
        <h1 className="mb-2 text-xl font-bold text-white">Reset Password</h1>
        <p className="mb-6 text-sm text-white/50">Enter your new password below.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-brand-400"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-brand-400"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={status === 'loading' || !token}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            style={{ background: '#00b2fc' }}
          >
            {status === 'loading' ? 'Resetting…' : 'Reset Password'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-400">
          <Link href="/" className="text-brand-400 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-white/40">Loading…</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
