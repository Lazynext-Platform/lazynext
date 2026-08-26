'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  Clapperboard,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { CAT_META, catOf, appTitle, appDesc, isFeatured, type AppCat } from '@/config/appCatalog';

type NavApp = { href: string; id: string; icon: typeof Clapperboard };

// After trimming, the sidebar keeps only 4 premium apps.
const PRIMARY_APPS: NavApp[] = [
  { href: '/lazynext-studio', id: 'lazynext-studio', icon: Clapperboard },
  { href: '/ad-reference', id: 'ad-reference', icon: Clapperboard },
  { href: '/drama-studio', id: 'drama-studio', icon: Clapperboard },
  { href: '/ad-skit', id: 'ad-skit', icon: Clapperboard },
];

function activeClass(active: boolean) {
  return active
    ? 'border-line-strong bg-elevated text-fg shadow-soft'
    : 'border-transparent text-fg-muted hover:border-line hover:bg-surface hover:text-fg';
}

export function AppSidebar() {
  const pathname = usePathname();
  const { t, appText, locale } = useI18n();

  const byCat = useMemo(() => {
    const m: Record<AppCat, NavApp[]> = { production: [], nocreative: [], incomplete: [] };
    for (const app of PRIMARY_APPS) m[catOf(app.href)].push(app);
    return m;
  }, []);

  // "Production-ready" is expanded by default, the rest are collapsed; click a title to expand/collapse.
  const [open, setOpen] = useState<Record<AppCat, boolean>>({ production: true, nocreative: false, incomplete: false });

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-[76px] max-h-[calc(100vh-96px)] overflow-y-auto pr-1">
        <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-fg-faint">{t('sidebar.apps')}</div>
        <nav className="space-y-2">
          {CAT_META.map((c) => {
            const apps = byCat[c.key];
            const isOpen = open[c.key];
            return (
              <div key={c.key}>
                <button
                  onClick={() => setOpen((o) => ({ ...o, [c.key]: !o[c.key] }))}
                  className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left transition hover:bg-surface"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-fg-secondary">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} /> {t(`appCat.${c.key}`)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-fg-faint">
                    {apps.length}
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {isOpen && (
                  <div className="mt-1 space-y-1">
                    {apps.map((app) => {
                      const Icon = app.icon;
                      const active = pathname === app.href;
                      const text = appText(app.id);
                      return (
                        <Link key={app.href} href={app.href} className={`flex gap-3 rounded-xl border p-3 transition ${activeClass(active)}`}>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-brand-400">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{isFeatured(app.href) ? '⭐ ' : ''}{appTitle(app.id, text.title, locale)}</span>
                            <span className="mt-0.5 block line-clamp-2 text-xs leading-4 text-fg-faint">{appDesc(app.id, text.description, locale)}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
