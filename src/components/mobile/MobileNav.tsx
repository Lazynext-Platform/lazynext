'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  Sparkles,
  Bell,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { NAV_CATEGORIES } from '@/config/navCategories';
import { appTitle } from '@/config/appCatalog';

const LOCALE_RE = /^\/(en|zh|ja|es|ko|pt|fr|de|ar|hi|vi|th|id)(?=\/|$)/;

const PRIMARY_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/creative-director', label: 'Create', icon: Sparkles },
  { href: '/notifications', label: 'Alerts', icon: Bell },
];

interface MobileNavProps {
  /** Unread notification count for the badge. */
  unreadCount?: number;
}

export function MobileNav({ unreadCount = 0 }: MobileNavProps) {
  const raw = usePathname() || '';
  const p = raw.replace(LOCALE_RE, '') || '/';
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the "More" drawer on route change.
  useEffect(() => {
    setMoreOpen(false);
  }, [p]);

  // Prevent body scroll when the drawer is open.
  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [moreOpen]);

  const isActive = (href: string) => p === href || p.startsWith(href + '/');

  return (
    <>
      {/* Bottom navigation bar — fixed, safe-area aware */}
      <nav
        aria-label="Mobile primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-app/95 backdrop-blur-lg pb-safe"
        style={{ touchAction: 'manipulation' }}
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {PRIMARY_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-fg-faint transition-colors"
                style={{ touchAction: 'manipulation' }}
              >
                <span className="relative">
                  <Icon
                    className={`h-5 w-5 ${active ? 'text-[#00b2fc]' : ''}`}
                  />
                  {item.href === '/notifications' && unreadCount > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-accent-fg">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] font-medium ${active ? 'text-[#00b2fc]' : ''}`}
                >
                  {item.label}
                </span>
                {active && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#00b2fc]" />
                )}
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="More navigation"
            aria-expanded={moreOpen}
            className="relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-fg-faint transition-colors"
            style={{ touchAction: 'manipulation' }}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* "More" drawer — full navigation categories */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
          role="dialog"
          aria-label="All navigation"
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-line bg-app pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-app px-4 py-3">
              <h2 className="text-sm font-bold text-fg">Browse all</h2>
              <button
                onClick={() => setMoreOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-faint hover:bg-hover"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-4">
              {NAV_CATEGORIES.map((cat) => (
                <div key={cat.id}>
                  <h3 className="mb-1.5 text-xs font-bold text-fg-muted">
                    {cat.label}
                  </h3>
                  <div className="grid grid-cols-2 gap-1">
                    {cat.apps.map((app) => (
                      <Link
                        key={app.slug}
                        href={app.href}
                        className="truncate rounded-lg px-2 py-1.5 text-xs text-fg-faint hover:bg-hover hover:text-fg"
                      >
                        {appTitle(app.slug, app.slug.replace(/-/g, ' '))}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
