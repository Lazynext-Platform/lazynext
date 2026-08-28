'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Loader2, Check, AlertCircle, Users } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';

function TeamJoinContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [result, setResult] = useState<'idle' | 'success' | 'error' | 'already'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated' && !authOpen) {
      setAuthOpen(true);
    }
  }, [status, authOpen]);

  const handleAccept = async () => {
    setAccepting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.alreadyMember) {
          setResult('already');
        } else {
          setResult('success');
        }
      } else {
        setResult('error');
        const errMap: Record<string, string> = {
          invalid_token: t('teams.joinInvalid'),
          expired: t('teams.joinExpired'),
          email_mismatch: t('teams.joinEmailMismatch'),
          already_accepted: t('teams.joinAlreadyMember'),
          token_required: t('teams.joinInvalid'),
        };
        setErrorMsg(errMap[data.error] || t('teams.joinError'));
      }
    } catch {
      setResult('error');
      setErrorMsg(t('teams.joinError'));
    } finally {
      setAccepting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app px-6 text-fg">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-danger" />
          <h1 className="mb-2 text-xl font-bold text-fg">{t('teams.joinInvalid')}</h1>
          <Link href="/settings" className="text-sm text-fg-secondary underline hover:text-fg">
            {t('teams.backToSettings')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-6 text-fg">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8">
        <div className="mb-6 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-fg-secondary" />
          <h1 className="mb-2 text-xl font-bold text-fg">{t('teams.joinTitle')}</h1>
          <p className="text-sm text-fg-faint">{t('teams.joinDescription')}</p>
        </div>

        {status === 'loading' && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-fg-secondary" />
          </div>
        )}

        {status === 'unauthenticated' && (
          <div className="space-y-4">
            <p className="text-center text-sm text-fg-secondary">{t('teams.joinSignIn')}</p>
            <button
              onClick={() => setAuthOpen(true)}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
              style={{ background: '#0064d9' }}
            >
              {t('common.signIn')}
            </button>
          </div>
        )}

        {status === 'authenticated' && result === 'idle' && (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            style={{ background: '#0064d9' }}
          >
            {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            {t('teams.joinAccept')}
          </button>
        )}

        {result === 'success' && (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center">
              <Check className="h-10 w-10 text-success" />
            </div>
            <p role="status" className="text-sm font-medium text-success">{t('teams.joinSuccess')}</p>
            <Link
              href="/settings"
              className="inline-block rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
              style={{ background: '#0064d9' }}
            >
              {t('teams.backToSettings')}
            </Link>
          </div>
        )}

        {result === 'already' && (
          <div className="space-y-4 text-center">
            <p role="status" className="text-sm font-medium text-fg-secondary">{t('teams.joinAlreadyMember')}</p>
            <Link
              href="/settings"
              className="inline-block rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
              style={{ background: '#0064d9' }}
            >
              {t('teams.backToSettings')}
            </Link>
          </div>
        )}

        {result === 'error' && (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-danger" />
            </div>
            <p role="alert" className="text-sm font-medium text-danger">{errorMsg}</p>
            <Link
              href="/settings"
              className="inline-block text-sm text-fg-secondary underline hover:text-fg"
            >
              {t('teams.backToSettings')}
            </Link>
          </div>
        )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="signin" />
    </div>
  );
}

export default function TeamJoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-app">
          <Loader2 className="h-6 w-6 animate-spin text-fg-secondary" />
        </div>
      }
    >
      <TeamJoinContent />
    </Suspense>
  );
}
