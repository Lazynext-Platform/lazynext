'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserMenu } from '@/components/UserMenu';
import { LangToggle } from '@/components/LangToggle';
import { CreditBadge } from '@/components/CreditBadge';
import { HistoryButton } from '@/components/HistoryButton';

// All pages use the unified immersive dark shell with a single sticky header.
const LOCALE_RE = /^\/(en|zh|ja|es|ko|pt|fr|de|ar|hi|vi|th|id)(?=\/|$)/;

export function Shell({ children }: { children: React.ReactNode }) {
  const raw = usePathname() || '';
  const p = raw.replace(LOCALE_RE, '') || '/';

  return (
    <div className="min-h-screen bg-[#131416] text-[#f7f7f8]" style={{ colorScheme: 'dark' }}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      {/* Unified sticky header — single source of truth for top navigation.
          Left: logo + brand. Right: history, credits, language, user menu.
          Uses proper flexbox with min-w-0 and shrink-0 to prevent overlap at all viewport sizes. */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#131416]/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-2 px-3 sm:px-4 md:gap-4">
          {/* Left group: logo + brand name */}
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2 hover:opacity-80 transition">
            <img src="/lazynext-mark.png" alt="Lazynext" className="h-7 w-7 shrink-0 rounded-lg sm:h-8 sm:w-8" />
            <span className="hidden text-sm font-bold tracking-tight sm:inline">Lazynext</span>
          </Link>
          {/* Right group: toolbar items — all shrink-0 so they never compress each other */}
          <nav aria-label="Toolbar" className="flex min-w-0 items-center gap-1 sm:gap-1.5 md:gap-2">
            <HistoryButton />
            <CreditBadge />
            <LangToggle />
            <UserMenu />
          </nav>
        </div>
      </header>
      <main id="main-content">
        {children}
      </main>
    </div>
  );
}
