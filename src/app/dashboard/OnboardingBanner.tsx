'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Rocket, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface OnboardingState {
  steps: Array<{ id: string; label: string; completed: boolean; optional: boolean }>;
  progress: number;
  nextStep: string | null;
}

interface OnboardingBannerProps {
  /** When true, always render (used in tests). When false, fetches state. */
  forceShow?: boolean;
}

export function OnboardingBanner({ forceShow = false }: OnboardingBannerProps) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (forceShow) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function fetchState() {
      try {
        const res = await fetch('/api/onboarding/state');
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) setState(json);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchState();
    return () => { cancelled = true; };
  }, [forceShow]);

  if (loading || dismissed) return null;

  // Show if forceShow, or if onboarding is not complete
  const shouldShow = forceShow || (state && state.progress < 100);
  if (!shouldShow) return null;

  const progress = state?.progress ?? 0;

  return (
    <div
      className="border-[3px] p-4 mb-6 flex items-center gap-4"
      style={{
        borderColor: 'var(--c-ink)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--c-accent)',
        color: 'var(--c-accent-fg)',
        boxShadow: 'var(--shadow-hard-sm)',
      }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center border-2 shrink-0"
        style={{
          borderColor: 'var(--c-ink)',
          backgroundColor: 'var(--c-surface)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <Rocket className="h-5 w-5" style={{ color: 'var(--c-ink)' }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">Welcome to Lazynext! Complete your setup.</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-2 border-2 max-w-xs" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--c-surface)' }}>
            <div
              className="h-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: 'var(--c-success)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <span className="text-xs font-mono">{progress}%</span>
        </div>
      </div>

      <Button href="/onboarding/wizard" size="sm" variant="secondary" className="shrink-0">
        Continue Setup <ArrowRight className="h-3 w-3" />
      </Button>

      {!forceShow && (
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 hover:opacity-70 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
