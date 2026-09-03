'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, CreditCard, Settings, FolderOpen, Boxes, LayoutDashboard, Shield, Menu } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { useMounted } from '@/lib/use-mounted';
import { AuthModal } from './AuthModal';
import { fetchWithRetry } from '@/lib/fetch-retry';

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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchWithRetry('/api/me').then((r) => r.json()).then((j) => setIsAdmin(!!j.isAdmin)).catch(() => {});
  }, [status]);

  // Close on Escape / outside interaction when the signed-in dropdown is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDoc);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open]);

  if (!mounted || status === 'loading') return null;

  if (status !== 'authenticated') {
    return (
      <>
        {/* Signed-out toolbar: pricing link hidden on the narrowest screens to
            keep the toolbar from overflowing; sign-in/up remain reachable. */}
        <div className="flex min-w-0 items-center gap-1">
          <a href="/pricing" className="hidden rounded-full px-3 py-2 text-xs font-medium text-fg-muted hover:text-fg transition md:block">{t('nav.pricing')}</a>
          <button onClick={() => { setAuthMode('signin'); setAuthOpen(true); }} className="rounded-full px-2.5 py-2 text-xs font-medium text-fg-secondary hover:text-fg transition sm:px-3.5">{t('nav.signIn')}</button>
          <button onClick={() => { setAuthMode('signup'); setAuthOpen(true); }} className="rounded-full px-2.5 py-2 text-xs font-bold text-white shadow-lg transition hover:brightness-110 sm:px-3.5" style={{ background: '#0064d9' }}>{t('home.signUp')}</button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
      </>
    );
  }

  const u = session.user;
  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex max-w-[40vw] items-center gap-2 rounded-full bg-elevated py-1 pl-1 pr-2 sm:pr-3 hover:bg-active transition"
      >
        {u?.image && /^https?:\/\//i.test(u.image) ? (
          <img src={u.image} alt="" className="h-7 w-7 shrink-0 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: '#0064d9' }}>{(u?.name || u?.email || 'U')[0]?.toUpperCase()}</div>
        )}
        <span className="hidden truncate text-xs text-fg-secondary xs:inline max-w-[90px] sm:max-w-[120px]">{u?.name || t('userMenu.account')}</span>
        <Menu className="h-3.5 w-3.5 shrink-0 text-fg-faint sm:hidden" />
      </button>
      {open && (
        <>
          {/* Transparent backdrop captures outside clicks/taps so the menu
              closes reliably on touch devices (not just desktop hover-out). */}
          <div className="fixed inset-0 z-[-1]" onClick={() => setOpen(false)} aria-hidden />
          {/* Dropdown is right-aligned and capped so it never overflows the
              viewport on small screens; min width keeps labels readable. */}
          <div role="menu" className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] min-w-[12rem] rounded-xl border border-line bg-popover p-1 shadow-xl">
            <div className="truncate px-3 py-2 text-[11px] text-fg-faint">{u?.email}</div>
            <a role="menuitem" href="/dashboard" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-fg-secondary hover:bg-hover"><LayoutDashboard className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t('nav.dashboard')}</span></a>
            <a role="menuitem" href="/my-work" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-fg-secondary hover:bg-hover"><FolderOpen className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t('nav.myWork')}</span></a>
            <a role="menuitem" href="/assets" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-fg-secondary hover:bg-hover"><Boxes className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t('nav.assets')}</span></a>
            <a role="menuitem" href="/pricing" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-fg-secondary hover:bg-hover"><CreditCard className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t('nav.pricing')}</span></a>
            <a role="menuitem" href="/settings" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-fg-secondary hover:bg-hover"><Settings className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t('nav.settings')}</span></a>
            {isAdmin && (
              <>
                <div className="my-1 h-px bg-hover" />
                <a role="menuitem" href="/admin" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-brand-accent hover:bg-hover"><Shield className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Admin</span></a>
              </>
            )}
            <div className="my-1 h-px bg-hover" />
            <button role="menuitem" onClick={() => signOut({ callbackUrl: window.location.origin })} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-fg-secondary hover:bg-hover"><LogOut className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t('userMenu.signOut')}</span></button>
          </div>
        </>
      )}
    </div>
  );
}
