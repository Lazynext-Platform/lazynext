'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Users,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Target,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  PersonaMatcherResult,
  PersonaMatch,
} from '@/lib/creative/ad-persona-matcher';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

function scoreColor(score: number): string {
  if (score >= 75) return 'bg-success/20 text-success border-success/30';
  if (score >= 50) return 'bg-warning/20 text-warning border-warning/30';
  return 'bg-danger/20 text-danger border-danger/30';
}

export default function AdPersonaMatcherPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [content, setContent] = useState('');
  const [productOrBrand, setProductOrBrand] = useState('');
  const [personas, setPersonas] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PersonaMatcherResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!content.trim() || !productOrBrand.trim() || !personas.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-persona-matcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          productOrBrand,
          personas,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adPersonaMatcher.error'));
      setResult(data.result as PersonaMatcherResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [content, productOrBrand, personas, platform, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const text = JSON.stringify(result, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [result]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
          {t('adPersonaMatcher.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> {t('adPersonaMatcher.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adPersonaMatcher.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adPersonaMatcher.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> {t('adPersonaMatcher.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adPersonaMatcher.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="apmContent" className="block text-sm font-medium mb-1">
              {t('adPersonaMatcher.content')}
            </label>
            <textarea
              id="apmContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g., Discover the future of skincare with our vitamin C serum..."
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="apmProduct" className="block text-sm font-medium mb-1">
              {t('adPersonaMatcher.productOrBrand')}
            </label>
            <input
              id="apmProduct"
              type="text"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., DTC skincare brand selling a vitamin C serum"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="apmPersonas" className="block text-sm font-medium mb-1">
              {t('adPersonaMatcher.personas')}
            </label>
            <input
              id="apmPersonas"
              type="text"
              value={personas}
              onChange={(e) => setPersonas(e.target.value)}
              placeholder="e.g., beauty enthusiasts aged 18-25, busy moms 30-45, eco-conscious shoppers"
              maxLength={500}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adPersonaMatcher.platform')}</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPlatform('')}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  platform === ''
                    ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                    : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                }`}
                disabled={loading}
              >
                any
              </button>
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    platform === p
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !content.trim() || !productOrBrand.trim() || !personas.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adPersonaMatcher.generating') : `${t('adPersonaMatcher.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adPersonaMatcher.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adPersonaMatcher.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adPersonaMatcher.dryRunNotice')}
              </div>
            )}

            {/* Copy button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover flex items-center gap-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('adPersonaMatcher.copied') : t('adPersonaMatcher.copy')}
              </button>
            </div>

            {/* Overall alignment */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-brand-accent" />
                  <span className="text-sm font-medium">{t('adPersonaMatcher.overallAlignment')}</span>
                </div>
                <span className={`inline-flex items-center text-sm font-bold px-3 py-1 rounded-full border ${scoreColor(result.matching.overallAlignment)}`}>
                  {result.matching.overallAlignment}/100
                </span>
              </div>
              <p className="text-sm text-fg-muted mt-2">
                {t('adPersonaMatcher.bestMatch')}: <span className="font-medium text-fg">{result.matching.bestMatchPersona}</span>
              </p>
            </div>

            {/* Persona matches */}
            <div className="space-y-3">
              {result.matching.personaMatches.map((pm: PersonaMatch, i: number) => (
                <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm font-semibold">{pm.personaName}</span>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border ${scoreColor(pm.matchScore)}`}>
                        {pm.matchScore}/100
                      </span>
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/20 text-brand-accent border-brand-accent/30">
                        {pm.resonance}/10
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-fg-muted">{pm.alignmentAnalysis}</p>
                  {pm.contentAdjustments.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-fg mb-1">{t('adPersonaMatcher.contentAdjustments')}</p>
                      <ul className="space-y-1">
                        {pm.contentAdjustments.map((adj, j) => (
                          <li key={j} className="text-xs text-fg-muted flex items-start gap-1.5">
                            <Check className="w-3 h-3 text-success flex-shrink-0 mt-0.5" /> {adj}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {result.matching.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adPersonaMatcher.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.matching.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-fg-muted flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-brand-accent flex-shrink-0 mt-0.5" /> {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
