'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Mail, Lock, User as UserIcon, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { Button, Input, Checkbox } from '@/components/ui';

function SignupForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordChecks = {
    length: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /\d/.test(password),
  };
  const passwordValid = passwordChecks.length && passwordChecks.hasLetter && passwordChecks.hasNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password) {
      setError('All fields are required.');
      return;
    }
    if (!passwordValid) {
      setError('Password must be at least 8 characters with a letter and a number.');
      return;
    }
    if (!agree) {
      setError('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      // Auto sign-in after successful registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        // Registration succeeded but auto-login failed — send to login
        router.push('/login?registered=1');
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    signIn('google', { callbackUrl: '/dashboard' });
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
          <h1 className="heading-display text-xl mb-1">Create Account</h1>
          <p className="text-sm text-fg-secondary mb-6">
            Start building your workspace in seconds.
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
              label="Name"
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              autoComplete="name"
              autoFocus
            />
            <Input
              label="Email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <div>
              <Input
                label="Password"
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                autoComplete="new-password"
                error={password && !passwordValid ? 'Password too weak' : undefined}
              />
              {/* Password requirements */}
              {password && (
                <div className="mt-2 flex flex-col gap-1">
                  <PasswordCheck ok={passwordChecks.length} label="At least 8 characters" />
                  <PasswordCheck ok={passwordChecks.hasLetter} label="Contains a letter" />
                  <PasswordCheck ok={passwordChecks.hasNumber} label="Contains a number" />
                </div>
              )}
            </div>

            <div className="flex items-start gap-2">
              <Checkbox checked={agree} onChange={setAgree} label="" id="agree-terms" />
              <label htmlFor="agree-terms" className="text-sm text-fg-secondary cursor-pointer select-none">
                I agree to the{' '}
                <Link href="/terms" className="font-semibold text-fg underline underline-offset-2 hover:text-accent transition-colors">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="font-semibold text-fg underline underline-offset-2 hover:text-accent transition-colors">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating account...' : 'Create account'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-sm text-center text-fg-secondary">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-fg underline underline-offset-2 hover:text-accent transition-colors">
              Sign in
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

function PasswordCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Check
        className="h-3 w-3"
        style={{ color: ok ? 'var(--c-success)' : 'var(--c-fg-muted)' }}
        strokeWidth={3}
      />
      <span style={{ color: ok ? 'var(--c-fg)' : 'var(--c-fg-muted)' }}>{label}</span>
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

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
