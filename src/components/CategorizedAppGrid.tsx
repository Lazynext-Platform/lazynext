'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, LayoutGrid, Search } from 'lucide-react';
import { NAV_CATEGORIES, searchApps, type NavApp, type NavCategory } from '@/config/navCategories';
import { appTitle, appDesc } from '@/config/appCatalog';
import { useI18n } from '@/i18n/provider';
import { FeatureSearch } from './FeatureSearch';

// Icon map — maps category icon names to lucide components
import {
  Sparkles, Lightbulb, PenLine, Heart, DollarSign, BookOpen,
  BarChart3, Radar, Clapperboard, Workflow, Shield, Server, Palette,
} from 'lucide-react';

const ICON_MAP: Record<string, typeof Sparkles> = {
  Sparkles, Lightbulb, PenLine, Heart, DollarSign, BookOpen,
  BarChart3, Radar, Clapperboard, Workflow, Shield, Server, Palette,
};

interface CategorizedAppGridProps {
  /** Optional list of app IDs to exclude (e.g., already shown elsewhere) */
  excludeSlugs?: Set<string>;
}

/**
 * Categorized app grid with search and collapsible sections.
 * Replaces the flat 159-tile dashboard grid.
 */
export function CategorizedAppGrid({ excludeSlugs }: CategorizedAppGridProps) {
  const { t, locale } = useI18n();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  const filteredCategories = useMemo(() => {
    if (searchQuery.trim()) {
      // When searching, show flat results across all categories
      const results = searchApps(searchQuery);
      return [{
        ...NAV_CATEGORIES[0],
        id: 'search-results',
        label: t('nav.searchResults'),
        icon: 'Search',
        apps: excludeSlugs ? results.filter((a) => !excludeSlugs.has(a.slug)) : results,
      }];
    }

    return NAV_CATEGORIES
      .filter((cat) => activeCategory === 'all' || cat.id === activeCategory)
      .map((cat) => ({
        ...cat,
        apps: excludeSlugs ? cat.apps.filter((a) => !excludeSlugs.has(a.slug)) : cat.apps,
      }))
      .filter((cat) => cat.apps.length > 0);
  }, [activeCategory, searchQuery, excludeSlugs, t]);

  const toggleCollapse = (catId: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <FeatureSearch
        onSelect={(app) => setSearchQuery(app.slug)}
        className="mb-4"
      />

      {/* Category filter tabs */}
      {!searchQuery && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeCategory === 'all'
                ? 'bg-brand-accent text-white'
                : 'bg-bg-card border border-border text-fg-muted hover:text-fg'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 inline mr-1" />
            {t('nav.allCategories')}
          </button>
          {NAV_CATEGORIES.map((cat) => {
            const Icon = ICON_MAP[cat.icon] || LayoutGrid;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeCategory === cat.id
                    ? 'bg-brand-accent text-white'
                    : 'bg-bg-card border border-border text-fg-muted hover:text-fg'
                }`}
              >
                <Icon className="w-3.5 h-3.5 inline mr-1" />
                {cat.label}
                <span className="ml-1 opacity-60">{cat.apps.length}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Category sections */}
      {filteredCategories.map((cat) => {
        const isCollapsed = collapsedCats.has(cat.id);
        const Icon = ICON_MAP[cat.icon] || LayoutGrid;
        return (
          <div key={cat.id} className="rounded-2xl border border-border bg-bg-card overflow-hidden">
            <button
              onClick={() => toggleCollapse(cat.id)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-bg-hover transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-brand-accent" />
                <h3 className="text-sm font-bold text-fg">{cat.label}</h3>
                <span className="text-xs text-fg-muted">({cat.apps.length})</span>
              </div>
              {isCollapsed ? <ChevronRight className="w-4 h-4 text-fg-muted" /> : <ChevronDown className="w-4 h-4 text-fg-muted" />}
            </button>

            {!isCollapsed && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-4 pt-0">
                {cat.apps.map((app) => (
                  <AppTile key={app.slug} app={app} locale={locale} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {filteredCategories.length === 0 && (
        <div className="text-center py-12 text-fg-muted text-sm">
          {t('nav.noResults')}
        </div>
      )}
    </div>
  );
}

function AppTile({ app, locale }: { app: NavApp; locale: string }) {
  // Generate a human-readable title from the slug as fallback
  const readableTitle = app.slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const title = appTitle(app.slug, readableTitle, locale);
  const desc = appDesc(app.slug, '', locale);

  return (
    <Link
      href={app.href}
      className="group rounded-xl border border-border bg-bg p-4 transition hover:-translate-y-0.5 hover:border-brand-accent/40"
    >
      <h4 className="text-sm font-semibold text-fg group-hover:text-brand-accent transition-colors">
        {title}
      </h4>
      {desc && (
        <p className="mt-1 line-clamp-2 text-xs text-fg-muted">{desc}</p>
      )}
      {app.flagship && (
        <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-wide text-brand-accent">
          ★ Premium
        </span>
      )}
    </Link>
  );
}
