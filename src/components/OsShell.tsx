'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  FileText,
  Folder,
  Sparkles,
  Zap,
  Bot,
  Plug,
  Calendar,
  Users,
  MessageSquare,
  BarChart3,
  Search,
  Settings,
  Bell,
  Menu,
  X,
  Command,
  ChevronDown,
  User as UserIcon,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Globe,
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from '@/lib/theme';
import { useI18n } from '@/i18n/provider';
import { useWorkspace } from '@/lib/workspace-provider';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/i18n/messages';
import { NotificationsBell } from '@/components/NotificationsBell';

// OS module navigation — the primary nav items
const OS_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/files', label: 'Files', icon: Folder },
  { href: '/creative', label: 'Creative', icon: Sparkles },
  { href: '/automations', label: 'Automations', icon: Zap },
  { href: '/agents', label: 'AI Agents', icon: Bot },
  { href: '/integrations', label: 'Integrations', icon: Plug },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
] as const;

const LOCALE_RE = /^\/(en|zh|ja|es|ko|pt|fr|de|ar|hi|vi|th|id)(?=\/|$)/;

export function OsShell({ children }: { children: React.ReactNode }) {
  const raw = usePathname() || '';
  const p = raw.replace(LOCALE_RE, '') || '/';
  const router = useRouter();
  const { data: session, status } = useSession();
  const { selected, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const { workspaces, current, switchWorkspace } = useWorkspace();

  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [localeMenuOpen, setLocaleMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [wsMenuOpen, setWsMenuOpen] = useState(false);

  // Mark as mounted after hydration to avoid hydration mismatches.
  // Session/workspace state may differ between server render and client
  // hydration (e.g. auth() fails on cold start but client has cached session).
  // Session-dependent UI only renders after mount.
  useEffect(() => {
    setMounted(true);
  }, []);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const localeRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setUserMenuOpen(false);
    setLocaleMenuOpen(false);
    setThemeMenuOpen(false);
    setWsMenuOpen(false);
  }, [p]);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (localeRef.current && !localeRef.current.contains(e.target as Node)) setLocaleMenuOpen(false);
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeMenuOpen(false);
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) setWsMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Command palette: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      setSearchQuery('');
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [searchOpen]);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchQuery.trim();
      if (q) {
        router.push(`/search?q=${encodeURIComponent(q)}`);
        setSearchOpen(false);
      }
    },
    [router, setSearchOpen, searchQuery],
  );

  const filteredNav = searchQuery.trim()
    ? OS_NAV.filter((item) => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : OS_NAV;

  const isActive = (href: string) => p === href || p.startsWith(href + '/');

  const ThemeIcon = selected === 'dark' ? Moon : selected === 'light' ? Sun : Monitor;

  return (
    <>
      {/* Skip link */}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      {/* ── Top bar ── */}
      <header
        className="sticky top-0 z-40 border-b-2 bg-surface pt-safe"
        style={{ borderColor: 'var(--c-ink)' }}
      >
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 border-2 rounded-[var(--radius-sm)] bg-surface hover:bg-hover transition-colors"
            style={{ borderColor: 'var(--c-ink)' }}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <span
              className="flex h-8 w-8 items-center justify-center border-2 font-display text-sm font-black"
              style={{
                borderColor: 'var(--c-ink)',
                backgroundColor: 'var(--c-accent)',
                color: 'var(--c-accent-fg)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              L
            </span>
            <span className="heading-display text-base hidden sm:block">Lazynext</span>
          </Link>

          {/* Workspace switcher — only render after mount to avoid hydration mismatch */}
          {mounted && current && (
            <div ref={wsRef} className="relative hidden md:block">
              <button
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border-2 rounded-[var(--radius-sm)] bg-surface hover:bg-hover transition-colors max-w-[160px]"
                style={{ borderColor: 'var(--c-ink)' }}
                onClick={() => setWsMenuOpen((v) => !v)}
                aria-label="Switch workspace"
                aria-expanded={wsMenuOpen}
              >
                <span
                  className="flex h-5 w-5 items-center justify-center text-xs font-bold border shrink-0"
                  style={{
                    borderColor: 'var(--c-ink)',
                    backgroundColor: 'var(--c-surface-alt)',
                  }}
                >
                  {current.name[0]?.toUpperCase()}
                </span>
                <span className="truncate">{current.name}</span>
                <ChevronDown className="h-3 w-3 shrink-0" />
              </button>
              {wsMenuOpen && (
                <div
                  className="absolute left-0 top-full mt-1 w-64 bg-surface border-2 rounded-[var(--radius-md)] py-1 z-50 max-h-80 overflow-y-auto"
                  style={{ borderColor: 'var(--c-ink)', boxShadow: 'var(--shadow-hard)' }}
                  role="menu"
                >
                  <p className="label-mono px-3 py-2">Workspaces</p>
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        switchWorkspace(ws.id);
                        setWsMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-hover transition-colors"
                      style={current.id === ws.id ? { backgroundColor: 'var(--c-active)' } : undefined}
                      role="menuitem"
                    >
                      <span
                        className="flex h-5 w-5 items-center justify-center text-xs font-bold border shrink-0"
                        style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)' }}
                      >
                        {ws.name[0]?.toUpperCase()}
                      </span>
                      <span className="truncate flex-1">{ws.name}</span>
                      <span className="label-mono">{ws.role}</span>
                    </button>
                  ))}
                  <div className="border-t-2 mt-1 pt-1" style={{ borderColor: 'var(--c-ink)' }}>
                    <Link
                      href="/workspaces"
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover transition-colors"
                      role="menuitem"
                      onClick={() => setWsMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Manage workspaces
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 ml-4" aria-label="Main navigation">
            {OS_NAV.slice(0, 7).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border-2 rounded-[var(--radius-sm)] transition-colors ${
                  isActive(item.href) ? '' : 'border-transparent hover:bg-hover'
                }`}
                style={
                  isActive(item.href)
                    ? { borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-active)' }
                    : undefined
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
            {/* More menu for remaining nav items */}
            <NavOverflow items={OS_NAV.slice(7)} isActive={isActive} />
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search trigger */}
          <button
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-fg-muted border-2 rounded-[var(--radius-sm)] bg-surface hover:bg-hover transition-colors min-w-[120px] sm:min-w-[200px]"
            style={{ borderColor: 'var(--c-ink)' }}
            onClick={() => setSearchOpen(true)}
            aria-label="Open search"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="kbd ml-auto hidden sm:inline-flex">⌘K</kbd>
          </button>

          {/* Theme switcher */}
          <div ref={themeRef} className="relative">
            <button
              className="p-2 border-2 rounded-[var(--radius-sm)] bg-surface hover:bg-hover transition-colors"
              style={{ borderColor: 'var(--c-ink)' }}
              onClick={() => setThemeMenuOpen((v) => !v)}
              aria-label="Change theme"
              aria-expanded={themeMenuOpen}
            >
              <ThemeIcon className="h-4 w-4" />
            </button>
            {themeMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-40 bg-surface border-2 rounded-[var(--radius-md)] py-1 z-50"
                style={{ borderColor: 'var(--c-ink)', boxShadow: 'var(--shadow-hard)' }}
                role="menu"
              >
                {(['light', 'dark', 'system'] as const).map((mode) => {
                  const ModeIcon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;
                  return (
                    <button
                      key={mode}
                      onClick={() => {
                        setTheme(mode);
                        setThemeMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-hover transition-colors capitalize"
                      style={selected === mode ? { backgroundColor: 'var(--c-active)' } : undefined}
                      role="menuitem"
                    >
                      <ModeIcon className="h-4 w-4" />
                      {mode}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Locale switcher */}
          <div ref={localeRef} className="relative hidden sm:block">
            <button
              className="flex items-center gap-1 p-2 border-2 rounded-[var(--radius-sm)] bg-surface hover:bg-hover transition-colors"
              style={{ borderColor: 'var(--c-ink)' }}
              onClick={() => setLocaleMenuOpen((v) => !v)}
              aria-label="Change language"
              aria-expanded={localeMenuOpen}
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs font-mono uppercase">{locale}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {localeMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-48 max-h-72 overflow-y-auto bg-surface border-2 rounded-[var(--radius-md)] py-1 z-50"
                style={{ borderColor: 'var(--c-ink)', boxShadow: 'var(--shadow-hard)' }}
                role="menu"
              >
                {LOCALES.map((l: Locale) => (
                  <button
                    key={l}
                    onClick={() => {
                      setLocale(l);
                      setLocaleMenuOpen(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-hover transition-colors"
                    style={locale === l ? { backgroundColor: 'var(--c-active)' } : undefined}
                    role="menuitem"
                  >
                    {LOCALE_NAMES[l]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <NotificationsBell />

          {/* User menu — only render after mount to avoid hydration mismatch */}
          {mounted && status === 'authenticated' && session?.user ? (
            <div ref={userMenuRef} className="relative">
              <button
                className="flex items-center gap-2 p-1 pr-2 border-2 rounded-[var(--radius-sm)] bg-surface hover:bg-hover transition-colors"
                style={{ borderColor: 'var(--c-ink)' }}
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-label="Account menu"
                aria-expanded={userMenuOpen}
              >
                {session.user.image ? (
                  <img src={session.user.image} alt="" className="h-6 w-6 rounded-[var(--radius-sm)]" />
                ) : (
                  <span
                    className="flex h-6 w-6 items-center justify-center text-xs font-bold border-2 rounded-[var(--radius-sm)]"
                    style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)' }}
                  >
                    {(session.user.name || session.user.email || '?')[0].toUpperCase()}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 hidden sm:block" />
              </button>
              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-surface border-2 rounded-[var(--radius-md)] py-1 z-50"
                  style={{ borderColor: 'var(--c-ink)', boxShadow: 'var(--shadow-hard)' }}
                  role="menu"
                >
                  <div className="px-3 py-2 border-b-2" style={{ borderColor: 'var(--c-ink)' }}>
                    <p className="text-sm font-semibold truncate">{session.user.name || 'User'}</p>
                    <p className="text-xs text-fg-muted truncate">{session.user.email}</p>
                  </div>
                  <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover transition-colors" role="menuitem">
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                  <Link href="/developers" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover transition-colors" role="menuitem">
                    <Command className="h-4 w-4" /> Developer
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-hover transition-colors border-t-2"
                    style={{ borderColor: 'var(--c-ink)' }}
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="btn-primary px-4 py-1.5 text-sm"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* ── Mobile nav drawer ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 pt-14">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'var(--c-ink)', opacity: 0.8 }}
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <nav
            className="absolute left-0 top-14 bottom-0 w-72 overflow-y-auto bg-surface border-r-2 p-4"
            style={{ borderColor: 'var(--c-ink)' }}
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-1">
              {OS_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium border-2 rounded-[var(--radius-sm)] transition-colors ${
                    isActive(item.href) ? '' : 'border-transparent hover:bg-hover'
                  }`}
                  style={
                    isActive(item.href)
                      ? { borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-active)' }
                      : undefined
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}

      {/* ── Command palette / search dialog ── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'var(--c-ink)', opacity: 0.8 }}
            onClick={() => setSearchOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative w-full max-w-xl bg-surface border-[3px] rounded-[var(--radius-md)]"
            style={{ borderColor: 'var(--c-ink)', boxShadow: 'var(--shadow-hard-lg)' }}
          >
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 border-b-2 p-4" style={{ borderColor: 'var(--c-ink)' }}>
              <Search className="h-5 w-5 shrink-0 text-fg-muted" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects, tasks, documents..."
                className="flex-1 bg-transparent text-base outline-none text-fg placeholder:text-fg-muted"
              />
              <kbd className="kbd">ESC</kbd>
            </form>
            <div className="p-2">
              <p className="label-mono px-3 py-2">Quick navigation</p>
              {filteredNav.length === 0 ? (
                <p className="px-3 py-4 text-sm text-fg-muted">
                  No matches. Press Enter to search all content.
                </p>
              ) : (
                filteredNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-[var(--radius-sm)] hover:bg-hover transition-colors"
                    onClick={() => setSearchOpen(false)}
                  >
                    <item.icon className="h-4 w-4 text-fg-muted" />
                    {item.label}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main id="main-content" className="flex-1">
        {children}
      </main>
    </>
  );
}

// Overflow nav items (shown in a "More" dropdown on desktop)
function NavOverflow({
  items,
  isActive,
}: {
  items: readonly { href: string; label: string; icon: typeof LayoutDashboard }[];
  isActive: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border-2 border-transparent rounded-[var(--radius-sm)] hover:bg-hover transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-label="More navigation"
        aria-expanded={open}
      >
        More
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 w-48 bg-surface border-2 rounded-[var(--radius-md)] py-1 z-50"
          style={{ borderColor: 'var(--c-ink)', boxShadow: 'var(--shadow-hard)' }}
          role="menu"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover transition-colors"
              style={isActive(item.href) ? { backgroundColor: 'var(--c-active)' } : undefined}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
