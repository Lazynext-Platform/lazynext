'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { AppSidebar } from '@/components/AppSidebar';
import { Footer } from '@/components/Footer';
import { DeployButton } from '@/components/DeployButton';
import { UserMenu } from '@/components/UserMenu';
import { LangToggle } from '@/components/LangToggle';
import { CreditBadge } from '@/components/CreditBadge';
import { HistoryButton } from '@/components/HistoryButton';
import { ByokKey } from '@/components/ByokKey';

// lazynext-studio uses a full-bleed immersive (dark, no light starter shell) layout.
// Other pages keep the SaaS starter Navbar + sidebar + Footer shell.
const IMMERSIVE = ['/', '/pricing', '/my-work', '/lazynext-studio', '/ad-reference', '/drama-studio', '/ad-skit'];

// Strip an optional locale prefix (e.g. /en, /zh) from the pathname so the
// immersive layout check works on locale-prefixed routes too.
const LOCALE_RE = /^\/(en|zh|ja|es|ko|pt|fr|de|ar|hi|vi|th|id)(?=\/|$)/;

export function Shell({ children }: { children: React.ReactNode }) {
  const raw = usePathname() || '';
  const p = raw.replace(LOCALE_RE, '') || '/';
  if (IMMERSIVE.some((r) => p === r || p.startsWith(r + '/'))) {
    // Star apps use a unified dark full-bleed shell (no light Navbar/sidebar/Footer), page content sits on top.
    return (
      <div className="min-h-screen bg-[#131416] text-[#f7f7f8]" style={{ colorScheme: 'dark' }}>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <main id="main-content">
          {children}
        </main>
        <nav aria-label="Toolbar" className="fixed top-3 right-3 z-50 flex items-center gap-1.5 sm:right-4 sm:gap-2">
          <HistoryButton />
          <CreditBadge />
          <ByokKey />
          <LangToggle />
          <UserMenu />
          <DeployButton />
        </nav>
      </div>
    );
  }
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Navbar />
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 gap-6 px-4 py-8 sm:py-10">
        <AppSidebar />
        <main id="main-content" className="min-w-0 flex-1">{children}</main>
      </div>
      <Footer />
    </>
  );
}
