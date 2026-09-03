'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Mail, Lock, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import { Button, Input } from '@/components/ui';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') || '/dashboard';
  const errorParam = params.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === 'EmailNotVerified'
      ? 'Please verify your email before signing in. Check your inbox for a verification link.'
      : errorParam === 'MfaRequired'
      ? 'Please enter your MFA code.'
      : errorParam === 'MfaInvalid'
      ? 'Invalid MFA code. Please try again.'
      : errorParam ? 'Authentication failed. Please try again.' : null,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        totpCode: mfaRequired ? mfaCode : undefined,
        redirect: false,
      });

      if (result?.error) {
        // Check if MFA is required — the error URL contains MfaRequired
        const errorUrl = result.error;
        if (errorUrl?.includes('MfaRequired')) {
          setMfaRequired(true);
          setError('Please enter your authenticator code.');
          setLoading(false);
          return;
        }
        if (errorUrl?.includes('MfaInvalid')) {
          setError('Invalid MFA code. Please try again.');
          setLoading(false);
          return;
        }
        if (errorUrl?.includes('EmailNotVerified')) {
          setError('Please verify your email before signing in. Check your inbox for a verification link.');
          setLoading(false);
          return;
        }
        setError('Invalid email or password.');
        setLoading(false);
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError('Something went wrong. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    signIn('google', { callbackUrl });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <span
            className="flex h-12 w-12 items-center justify-center border-2 text-xl font-black"
            style={{
              borderColor: 'var(--c-ink)',
              backgroundColor: 'var(--c-accent)',
              color: 'var(--c-accent-fg)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-hard)',
            }}
          >
            L
          </span>
          <span className="heading-display text-2xl">Lazynext</span>
        </Link>

        {/* Card */}
        <div
          className="border-[3px] bg-surface p-8"
          style={{
            borderColor: 'var(--c-ink)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-hard-lg)',
          }}
        >
          <h1 className="heading-display text-xl mb-1">Sign In</h1>
          <p className="text-sm text-fg-secondary mb-6">
            Welcome back. Sign in to your workspace.
          </p>

          {error && (
            <div
              className="flex items-start gap-2 p-3 mb-4 border-2 text-sm"
              style={{
                borderColor: 'var(--c-danger)',
                backgroundColor: 'var(--c-surface-alt)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--c-danger)',
              }}
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="btn-secondary w-full mb-4"
          >
            <GoogleIcon className="h-5 w-5" />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 border-t-2" style={{ borderColor: 'var(--c-ink)' }} />
            <span className="label-mono">Or</span>
            <div className="flex-1 border-t-2" style={{ borderColor: 'var(--c-ink)' }} />
          </div>

          {/* Credentials form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            {mfaRequired && (
              <div className="flex items-center gap-2 p-3 border-2 rounded-sm" style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)' }}>
                <Shield className="h-4 w-4 shrink-0" />
                <Input
                  label="MFA Code"
                  type="text"
                  name="totpCode"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="123456"
                  required
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  autoFocus
                />
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in...' : 'Sign in'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-sm text-center text-fg-secondary">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-fg underline underline-offset-2 hover:text-accent transition-colors">
              Sign up
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-fg-muted">
          <Link href="/" className="hover:text-fg transition-colors">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
