'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Megaphone, BarChart3, LayoutDashboard } from 'lucide-react';
import { UserMenu } from '@/components/UserMenu';
import { LangToggle } from '@/components/LangToggle';
import { CreditBadge } from '@/components/CreditBadge';
import { HistoryButton } from '@/components/HistoryButton';

// All pages use the unified immersive dark shell with a single sticky header.
const LOCALE_RE = /^\/(en|zh|ja|es|ko|pt|fr|de|ar|hi|vi|th|id)(?=\/|$)/;

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/creative-director', label: 'Director', icon: Sparkles },
  { href: '/ads', label: 'Ads', icon: Megaphone },
  { href: '/performance', label: 'Performance', icon: BarChart3 },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const raw = usePathname() || '';
  const p = raw.replace(LOCALE_RE, '') || '/';

  return (
    <div className="min-h-screen bg-app text-fg">
      <a href="#main-content" className="skip-link">Skip to content</a>
      {/* Unified sticky header — single source of truth for top navigation.
          Left: logo + brand + primary nav links. Right: history, credits, language, user menu.
          Uses proper flexbox with min-w-0 and shrink-0 to prevent overlap at all viewport sizes. */}
      <header className="sticky top-0 z-50 border-b border-line bg-app/80 pt-safe backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-2 px-3 sm:px-4 md:gap-4">
          {/* Left group: logo + brand name + nav links */}
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <Link href="/" className="flex shrink-0 items-center gap-2 hover:opacity-80 transition">
              <img src="/lazynext-mark.png" alt="Lazynext" className="h-7 w-7 shrink-0 rounded-lg sm:h-8 sm:w-8" />
              <span className="hidden text-base font-bold tracking-tight sm:inline">Lazynext</span>
            </Link>
            {/* Primary nav links — hidden on very narrow screens, visible sm+ */}
            <nav aria-label="Primary" className="hidden items-center gap-0.5 md:flex">
              {NAV_LINKS.map((link) => {
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
            </nav>
          </div>
          {/* Right group: toolbar items — nav is min-w-0 so it can shrink; items
              themselves are shrink-0 so they never compress each other. Toolbar
              gap tightens on narrow screens. */}
          <nav aria-label="Toolbar" className="flex min-w-0 items-center justify-end gap-1 sm:gap-1.5 md:gap-2">
            <HistoryButton />
            <CreditBadge />
            <LangToggle />
            <UserMenu />
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
