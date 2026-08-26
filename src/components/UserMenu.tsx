'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, CreditCard, Settings, FolderOpen, Boxes, LayoutDashboard, Shield } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { useMounted } from '@/lib/use-mounted';
import { AuthModal } from './AuthModal';

// Unified top-right user area (shared by all immersive pages):
// Signed out -> Pricing / Sign in / Sign up; signed in -> avatar + name + dropdown (Pricing / Sign out). Bilingual.
export function UserMenu() {
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isAdmin, setIsAdmin] = useState(false);
  const mounted = useMounted();

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/me').then((r) => r.json()).then((j) => setIsAdmin(!!j.isAdmin)).catch(() => {});
  }, [status]);

  if (!mounted || status === 'loading') return null;

  if (status !== 'authenticated') {
    return (
      <>
        <div className="flex items-center gap-1">
          <a href="/pricing" className="hidden rounded-full px-3 py-2 text-xs font-medium text-white/60 hover:text-white transition sm:block">{t('nav.pricing')}</a>
          <button onClick={() => { setAuthMode('signin'); setAuthOpen(true); }} className="rounded-full px-2.5 py-2 text-xs font-medium text-white/75 hover:text-white transition sm:px-3.5">{t('nav.signIn')}</button>
          <button onClick={() => { setAuthMode('signup'); setAuthOpen(true); }} className="rounded-full px-2.5 py-2 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:px-3.5" style={{ background: '#00b2fc' }}>{t('home.signUp')}</button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
      </>
    );
  }

  const u = session.user;
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 hover:bg-white/15 transition">
        {u?.image ? (
           
          <img src={u.image} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white" style={{ background: '#00b2fc' }}>{(u?.name || u?.email || 'U')[0]?.toUpperCase()}</div>
        )}
        <span className="max-w-[90px] truncate text-xs text-white/80">{u?.name || t('userMenu.account')}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[-1]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#1c1e21] p-1 shadow-xl">
            <div className="truncate px-3 py-2 text-[11px] text-white/40">{u?.email}</div>
            <a href="/dashboard" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/5"><LayoutDashboard className="h-3.5 w-3.5" /> {t('nav.dashboard')}</a>
            <a href="/my-work" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/5"><FolderOpen className="h-3.5 w-3.5" /> {t('nav.myWork')}</a>
            <a href="/assets" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/5"><Boxes className="h-3.5 w-3.5" /> {t('nav.assets')}</a>
            <a href="/pricing" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/5"><CreditCard className="h-3.5 w-3.5" /> {t('nav.pricing')}</a>
            <a href="/settings" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/5"><Settings className="h-3.5 w-3.5" /> {t('nav.settings')}</a>
            {isAdmin && (
              <>
                <div className="my-1 h-px bg-white/5" />
                <a href="/admin" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[#00b2fc] hover:bg-white/5"><Shield className="h-3.5 w-3.5" /> Admin</a>
              </>
            )}
            <div className="my-1 h-px bg-white/5" />
            <button onClick={() => signOut({ callbackUrl: window.location.origin })} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/5"><LogOut className="h-3.5 w-3.5" /> {t('userMenu.signOut')}</button>
          </div>
        </>
      )}
    </div>
  );
}
