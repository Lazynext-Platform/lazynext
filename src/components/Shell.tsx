'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Sparkles, BarChart3, Megaphone, Radar, ChevronDown, Menu, X } from 'lucide-react';
import { UserMenu } from '@/components/UserMenu';
import { LangToggle } from '@/components/LangToggle';
import { CreditBadge } from '@/components/CreditBadge';
import { HistoryButton } from '@/components/HistoryButton';
import { FeatureSearch } from '@/components/FeatureSearch';
import { NAV_CATEGORIES } from '@/config/navCategories';
import { appTitle } from '@/config/appCatalog';
import { trackAppVisit } from '@/lib/recent-apps';

// All pages use the unified immersive dark shell with a single sticky header.
const LOCALE_RE = /^\/(en|zh|ja|es|ko|pt|fr|de|ar|hi|vi|th|id)(?=\/|$)/;

// Primary nav — 5 core workflow destinations, always visible
const PRIMARY_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/creative-director', label: 'Create', icon: Sparkles },
  { href: '/performance', label: 'Optimize', icon: BarChart3 },
  { href: '/ads', label: 'Manage', icon: Megaphone },
  { href: '/competitor-intel', label: 'Insights', icon: Radar },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const raw = usePathname() || '';
  const p = raw.replace(LOCALE_RE, '') || '/';
  const [browseOpen, setBrowseOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const browseRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on route change + track recently visited apps
  useEffect(() => {
    setBrowseOpen(false);
    setMobileOpen(false);
    // Track app visits (skip non-app routes)
    const slug = p.replace(/^\//, '').split('/')[0];
    if (slug && !['api', '_next', 'dashboard', 'pricing', 'assets', 'settings', 'my-work', 'admin', 'auth'].includes(slug)) {
      trackAppVisit(slug, appTitle(slug, 'en'));
    }
  }, [p]);

  // Close browse dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (browseRef.current && !browseRef.current.contains(e.target as Node)) {
        setBrowseOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-app text-fg">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="sticky top-0 z-50 border-b border-line bg-app/80 pt-safe backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-2 px-3 sm:px-4 md:gap-4">
          {/* Left: logo + primary nav */}
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/" className="flex shrink-0 items-center gap-2 hover:opacity-80 transition">
              <img src="/lazynext-mark.png" alt="Lazynext" className="h-7 w-7 shrink-0 rounded-lg sm:h-8 sm:w-8" />
              <span className="hidden text-base font-bold tracking-tight sm:inline">Lazynext</span>
            </Link>

            {/* Primary nav — 5 core links + Browse dropdown */}
            <nav aria-label="Primary" className="hidden md:flex items-center gap-0.5">
              {PRIMARY_NAV.map((link) => {
                const Icon = link.icon;
                const isActive = p === link.href || p.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                      isActive
                        ? 'bg-[#00b2fc]/15 text-[#00b2fc]'
                        : 'text-fg-faint hover:bg-hover hover:text-fg'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {link.label}
                  </Link>
                );
              })}

              {/* Browse dropdown */}
              <div ref={browseRef} className="relative">
                <button
                  onClick={() => setBrowseOpen(!browseOpen)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    browseOpen ? 'bg-[#00b2fc]/15 text-[#00b2fc]' : 'text-fg-faint hover:bg-hover hover:text-fg'
                  }`}
                  aria-expanded={browseOpen}
                  aria-haspopup="true"
                >
                  Browse
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${browseOpen ? 'rotate-180' : ''}`} />
                </button>

                {browseOpen && (
                  <div className="absolute top-full left-0 mt-1 w-[640px] rounded-xl border border-border bg-bg-card shadow-xl z-50 overflow-hidden">
                    {/* Search in dropdown */}
                    <div className="p-3 border-b border-border">
                      <FeatureSearch showShortcut={false} onSelect={() => setBrowseOpen(false)} />
                    </div>
                    {/* Category grid */}
                    <div className="grid grid-cols-2 gap-px bg-border max-h-[60vh] overflow-y-auto">
                      {NAV_CATEGORIES.map((cat) => (
                        <div key={cat.id} className="bg-bg-card p-3">
                          <h3 className="text-xs font-bold text-fg mb-2">{cat.label}</h3>
                          <div className="space-y-0.5">
                            {cat.apps.slice(0, 6).map((app) => (
                              <Link
                                key={app.slug}
                                href={app.href}
                                className="block text-xs text-fg-muted hover:text-brand-accent truncate transition-colors"
                              >
                                {appTitle(app.slug, app.slug.replace(/-/g, ' '))}
                              </Link>
                            ))}
                            {cat.apps.length > 6 && (
                              <Link
                                href="/dashboard"
                                className="block text-xs text-brand-accent hover:underline"
                              >
                                +{cat.apps.length - 6} more
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-fg-faint hover:bg-hover"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Right: toolbar */}
          <nav aria-label="Toolbar" className="flex min-w-0 items-center justify-end gap-1 sm:gap-1.5 md:gap-2">
            <HistoryButton />
            <CreditBadge />
            <LangToggle />
            <UserMenu />
          </nav>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-line bg-app">
            <div className="px-4 py-3 space-y-3">
              <FeatureSearch showShortcut={false} onSelect={() => setMobileOpen(false)} />
              <div className="grid grid-cols-2 gap-2">
                {PRIMARY_NAV.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-faint hover:bg-hover hover:text-fg"
                    >
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
              {NAV_CATEGORIES.slice(0, 6).map((cat) => (
                <div key={cat.id}>
                  <h3 className="text-xs font-bold text-fg-muted mb-1">{cat.label}</h3>
                  <div className="grid grid-cols-2 gap-1">
                    {cat.apps.slice(0, 4).map((app) => (
                      <Link
                        key={app.slug}
                        href={app.href}
                        className="text-xs text-fg-faint hover:text-brand-accent truncate"
                      >
                        {appTitle(app.slug, app.slug.replace(/-/g, ' '))}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <Link
                href="/dashboard"
                className="block text-center text-xs text-brand-accent hover:underline pt-2"
              >
                View all features on Dashboard →
              </Link>
            </div>
          </div>
        )}
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
