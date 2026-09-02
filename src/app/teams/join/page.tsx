'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Loader2, Check, AlertCircle, Users } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';

function TeamJoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [result, setResult] = useState<'idle' | 'success' | 'error' | 'already'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [teamId, setTeamId] = useState<string | null>(null);

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
        if (data.teamId) setTeamId(data.teamId);
        if (data.alreadyMember) {
          setResult('already');
        } else {
          setResult('success');
          // Redirect to the team page after a brief success confirmation
          if (data.teamId) {
            setTimeout(() => router.push(`/teams/${data.teamId}`), 1200);
          }
        }
      } else {
        setResult('error');
        const errMap: Record<string, string> = {
          invalid_token: t('teamJoin.invalid'),
          expired: t('teamJoin.expired'),
          email_mismatch: t('teamJoin.emailMismatch'),
          already_accepted: t('teamJoin.alreadyMember'),
          token_required: t('teamJoin.invalid'),
          unauthorized: t('teamJoin.signIn'),
        };
        setErrorMsg(errMap[data.error] || t('teamJoin.error'));
      }
    } catch {
      setResult('error');
      setErrorMsg(t('teamJoin.error'));
    } finally {
      setAccepting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app px-6 text-fg">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-danger" />
          <h1 className="mb-2 text-xl font-bold text-fg">{t('teamJoin.invalid')}</h1>
          <Link href="/settings" className="text-sm text-fg-secondary underline hover:text-fg">
            {t('teamJoin.back')}
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
          <h1 className="mb-2 text-xl font-bold text-fg">{t('teamJoin.title')}</h1>
          <p className="text-sm text-fg-faint">{t('teamJoin.description')}</p>
        </div>

        {status === 'loading' && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-fg-secondary" />
          </div>
        )}

        {status === 'unauthenticated' && (
          <div className="space-y-4">
            <p className="text-center text-sm text-fg-secondary">{t('teamJoin.signIn')}</p>
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
            {t('teamJoin.accept')}
          </button>
        )}

        {result === 'success' && (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center">
              <Check className="h-10 w-10 text-success" />
            </div>
            <p role="status" className="text-sm font-medium text-success">{t('teamJoin.success')}</p>
            {teamId ? (
              <Link
                href={`/teams/${teamId}`}
                className="inline-block rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
                style={{ background: '#0064d9' }}
              >
                {t('teamJoin.goToTeam')}
              </Link>
            ) : (
              <Link
                href="/settings"
                className="inline-block rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
                style={{ background: '#0064d9' }}
              >
                {t('teamJoin.back')}
              </Link>
            )}
          </div>
        )}

        {result === 'already' && (
          <div className="space-y-4 text-center">
            <p role="status" className="text-sm font-medium text-fg-secondary">{t('teamJoin.alreadyMember')}</p>
            {teamId ? (
              <Link
                href={`/teams/${teamId}`}
                className="inline-block rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
                style={{ background: '#0064d9' }}
              >
                {t('teamJoin.goToTeam')}
              </Link>
            ) : (
              <Link
                href="/settings"
                className="inline-block rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
                style={{ background: '#0064d9' }}
              >
                {t('teamJoin.back')}
              </Link>
            )}
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
              {t('teamJoin.back')}
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
