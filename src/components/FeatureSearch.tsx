'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { searchApps, getCategoryForApp, type NavApp } from '@/config/navCategories';
import { appTitle } from '@/config/appCatalog';
import { useI18n } from '@/i18n/provider';

interface FeatureSearchProps {
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show the keyboard shortcut hint */
  showShortcut?: boolean;
  /** Callback when a result is selected */
  onSelect?: (app: NavApp) => void;
  /** Additional className */
  className?: string;
}

/**
 * Feature search component with fuzzy matching and keyboard navigation.
 * Searches across all 158+ features by name and category.
 */
export function FeatureSearch({ placeholder, showShortcut = true, onSelect, className = '' }: FeatureSearchProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchApps(query).slice(0, 8);
  }, [query]);

  const handleSelect = useCallback((app: NavApp) => {
    onSelect?.(app);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(0);
  }, [onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }, [isOpen, results, selectedIndex, handleSelect]);

  // Global Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const defaultPlaceholder = placeholder || t('nav.searchPlaceholder');

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={defaultPlaceholder}
          className="w-full rounded-lg border border-border bg-bg-card pl-9 pr-9 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-brand-accent"
          aria-label={t('nav.search')}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="feature-search-results"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setIsOpen(false); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {!query && showShortcut && (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-block text-xs text-fg-muted bg-bg border border-border rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div
          ref={resultsRef}
          id="feature-search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-bg-card shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {results.map((app, i) => {
            const cat = getCategoryForApp(app.slug);
            return (
              <Link
                key={app.slug}
                href={app.href}
                onClick={() => handleSelect(app)}
                className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-bg-hover transition-colors ${
                  i === selectedIndex ? 'bg-bg-hover' : ''
                }`}
                role="option"
                aria-selected={i === selectedIndex}
              >
                <span className="text-fg truncate">{appTitle(app.slug, app.slug.replace(/-/g, ' '))}</span>
                {cat && (
                  <span className="text-xs text-fg-muted ml-2 shrink-0">{cat.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-bg-card shadow-lg z-50 px-3 py-4 text-sm text-fg-muted text-center">
          {t('nav.noResults')}
        </div>
      )}
    </div>
  );
}
