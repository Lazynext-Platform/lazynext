'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { Coins, LogOut, Settings } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { AuthModal } from './AuthModal';
import { useI18n } from '@/i18n/provider';
import { formatNumber } from '@/lib/i18n-format';

export function Navbar() {
  const { data: session } = useSession();
  const { t, locale } = useI18n();
  const [credits, setCredits] = useState<number | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/me');
      if (r.ok) setCredits((await r.json()).credits);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (session) refresh();
    else setCredits(null);
  }, [session, refresh]);

  useEffect(() => {
    const h = () => refresh();
    window.addEventListener('lazynext:credits', h);
    return () => window.removeEventListener('lazynext:credits', h);
  }, [refresh]);

  const navLink =
    'rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition hover:bg-white/[0.06] hover:text-white';

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#131416]/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold">
          { }
          <img src="/lazynext-mark.png" alt="Lazynext" className="h-7 w-7 rounded-lg sm:h-8 sm:w-8" />
          <span className="hidden text-[15px] tracking-tight sm:inline">Lazynext</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-1.5">
          <Link href="/pricing" className={`hidden sm:inline-flex ${navLink}`}>
            {t('nav.pricing')}
          </Link>
          {session ? (
            <>
              <Link href="/my-work" className={`hidden md:inline-flex ${navLink}`}>
                {t('nav.myWork')}
              </Link>
              <Link href="/settings" aria-label={t('nav.settings')} title={t('nav.settings')} className={`hidden md:inline-flex ${navLink}`}>
                <Settings className="h-4 w-4" />
              </Link>
              <span className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-xs font-semibold text-white/80 sm:px-3 sm:text-sm">
                <Coins className="h-3.5 w-3.5" />
                {credits === null ? '·' : formatNumber(credits, locale)}
              </span>
              {session.user?.image && (

                <img
                  src={session.user.image}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="hidden h-8 w-8 shrink-0 rounded-full border border-white/10 md:block"
                />
              )}
              <button
                onClick={() => signOut()}
                title={t('common.signOut')}
                className="shrink-0 rounded-lg p-2 text-white/40 transition hover:bg-white/[0.06] hover:text-white/80"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setAuthMode('signup'); setAuthOpen(true); }}
                className="ml-0.5 shrink-0 rounded-lg px-2.5 py-2 text-xs font-medium text-white/60 transition hover:bg-white/[0.06] hover:text-white sm:ml-1 sm:px-3 sm:text-sm"
              >
                {t('auth.signUpTab')}
              </button>
              <button
                onClick={() => { setAuthMode('signin'); setAuthOpen(true); }}
                className="btn-brand ml-0.5 shrink-0 px-3 py-2 text-xs sm:ml-1 sm:px-4 sm:text-sm"
              >
                {t('nav.signIn')}
              </button>
            </>
          )}
          <LanguageSwitcher />
        </nav>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
    </header>
  );
}
