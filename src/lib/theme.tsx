'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Lazynext centralized theme system.
 *
 * Three selectable modes: 'light' | 'dark' | 'system'.
 *  - 'system' resolves dynamically from prefers-color-scheme and reacts live.
 *  - 'light'/'dark' are manual overrides that persist and ignore the OS.
 *
 * The resolved theme is mirrored to <html data-theme="..."> and
 * <html style="color-scheme: ...">. A pre-hydration inline script in
 * src/app/layout.tsx applies the very first frame so there is no flash and no
 * hydration mismatch.
 *
 * Persistence: localStorage key 'lazynext-theme'. Invalid values fall back to
 * 'system'. Multi-tab sync via the 'storage' event.
 */

export type SelectedTheme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'lazynext-theme';
export const VALID_THEMES: readonly SelectedTheme[] = ['light', 'dark', 'system'];

export function isTheme(v: unknown): v is SelectedTheme {
  return v === 'light' || v === 'dark' || v === 'system';
}

/** Read & validate the persisted selection. Falls back to 'system'. */
export function readStoredTheme(): SelectedTheme {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

/** Resolve a selection against the live OS preference. */
export function resolveTheme(sel: SelectedTheme, prefersDark: boolean): ResolvedTheme {
  if (sel === 'system') return prefersDark ? 'dark' : 'light';
  return sel;
}

interface ThemeCtx {
  selected: SelectedTheme;
  resolved: ResolvedTheme;
  setTheme: (t: SelectedTheme) => void;
  /** Toggle between light/dark quickly (used by compact toggles). */
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always start from 'system' / 'dark' on both server and client so the first
  // render matches SSR (no hydration mismatch). The inline bootstrap script in
  // layout.tsx already applied the correct data-theme / color-scheme to <html>
  // before React mounts, so there is no visual flash. We sync the React state
  // from localStorage / DOM in the useEffect below after mount.
  const [selected, setSelected] = useState<SelectedTheme>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>('dark');

  // Apply a resolved theme to the document + meta theme-color.
  const applyResolved = useCallback((res: ResolvedTheme) => {
    const el = document.documentElement;
    el.setAttribute('data-theme', res);
    el.style.colorScheme = res;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', res === 'dark' ? '#131416' : '#f7f7f8');
  }, []);

  const applySelection = useCallback(
    (sel: SelectedTheme, prefersDark: boolean) => {
      const res = resolveTheme(sel, prefersDark);
      document.documentElement.setAttribute('data-theme-selected', sel);
      applyResolved(res);
      setResolved(res);
    },
    [applyResolved],
  );

  // Live system preference listener — only affects 'system' selection.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const prefersDark = mq.matches;
      if (selected === 'system') applySelection('system', prefersDark);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [selected, applySelection]);

  // Re-sync from storage once on mount (covers first paint done by inline script).
  useEffect(() => {
    const stored = readStoredTheme();
    if (stored !== selected) {
      setSelected(stored);
      const prefersDark =
        typeof window !== 'undefined' && window.matchMedia
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
          : false;
      applySelection(stored, prefersDark);
    } else {
      // Ensure DOM reflects current state even if inline script was skipped.
      const prefersDark =
        typeof window !== 'undefined' && window.matchMedia
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
          : false;
      applySelection(selected, prefersDark);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Multi-tab synchronization.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      const next = isTheme(e.newValue) ? e.newValue : 'system';
      setSelected(next);
      const prefersDark =
        typeof window !== 'undefined' && window.matchMedia
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
          : false;
      applySelection(next, prefersDark);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [applySelection]);

  const setTheme = useCallback(
    (t: SelectedTheme) => {
      setSelected(t);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, t);
      } catch {
        /* ignore */
      }
      const prefersDark =
        typeof window !== 'undefined' && window.matchMedia
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
          : false;
      applySelection(t, prefersDark);
    },
    [applySelection],
  );

  const toggle = useCallback(() => {
    setTheme(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setTheme]);

  const value = useMemo<ThemeCtx>(
    () => ({ selected, resolved, setTheme, toggle }),
    [selected, resolved, setTheme, toggle],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme must be used inside ThemeProvider');
  return c;
}
