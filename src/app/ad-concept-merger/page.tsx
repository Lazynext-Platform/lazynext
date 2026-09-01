'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { GitMerge, Loader2, AlertCircle, Sparkles, Copy, Check, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  AdConceptMergerResult,
  ConceptInput,
  ConceptType,
} from '@/lib/creative/ad-concept-merger';

const CREDIT_COST = 5;

const CONCEPT_TYPES: ConceptType[] = ['hook', 'angle', 'script', 'visual'];

interface ConceptRow {
  id: string;
  type: ConceptType;
  content: string;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }, [text]);
  if (!text) return null;
  return (
    <button
      onClick={onCopy}
      aria-label={`${t('adConceptMerger.copy')} ${label}`}
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-secondary px-2 py-1 text-xs font-medium text-fg-muted hover:text-fg hover:bg-hover transition"
    >
      {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
      {copied ? t('adConceptMerger.copied') : t('adConceptMerger.copy')}
    </button>
  );
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function AdConceptMergerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [concepts, setConcepts] = useState<ConceptRow[]>([
    { id: uid(), type: 'hook', content: '' },
    { id: uid(), type: 'angle', content: '' },
  ]);
  const [targetPlatform, setTargetPlatform] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdConceptMergerResult | null>(null);

  const addConcept = useCallback(() => {
    setConcepts((prev) =>
      prev.length >= 10 ? prev : [...prev, { id: uid(), type: 'hook', content: '' }],
    );
  }, []);

  const removeConcept = useCallback((id: string) => {
    setConcepts((prev) => (prev.length <= 2 ? prev : prev.filter((c) => c.id !== id)));
  }, []);

  const updateConcept = useCallback((id: string, patch: Partial<ConceptRow>) => {
    setConcepts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const canMerge =
    concepts.filter((c) => c.content.trim()).length >= 2 && concepts.length >= 2 && concepts.length <= 10;

  const merge = useCallback(async () => {
    if (!canMerge) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const payload: ConceptInput[] = concepts
        .filter((c) => c.content.trim())
        .map((c) => ({ id: c.id, type: c.type, content: c.content.trim() }));
      const res = await fetch('/api/creative/ad-concept-merger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concepts: payload,
          targetPlatform: targetPlatform.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adConceptMerger.merge'));
      setResult(data.result as AdConceptMergerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [concepts, targetPlatform, canMerge, t]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm">
          {t('adConceptMerger.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2"><GitMerge className="w-6 h-6" /> {t('adConceptMerger.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('adConceptMerger.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm">
        {t('adConceptMerger.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GitMerge className="w-6 h-6" /> {t('adConceptMerger.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('adConceptMerger.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">{t('adConceptMerger.concepts')}</h2>
              <button
                onClick={addConcept}
                disabled={loading || concepts.length >= 10}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-card px-2 py-1 text-xs font-medium text-fg-muted hover:text-fg hover:bg-hover transition disabled:opacity-50"
              >
                <Plus className="w-3 h-3" /> {t('adConceptMerger.addConcept')}
              </button>
            </div>
            <p className="text-xs text-fg-muted mb-3">{t('adConceptMerger.conceptsHint')}</p>

            <div className="space-y-3">
              {concepts.map((c, i) => (
                <div key={c.id} className="rounded-lg border border-border bg-bg-card p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-fg-muted">#{i + 1}</span>
                    <select
                      value={c.type}
                      onChange={(e) => updateConcept(c.id, { type: e.target.value as ConceptType })}
                      disabled={loading}
                      aria-label={t('adConceptMerger.type')}
                      className="rounded-lg border border-border bg-bg-secondary px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    >
                      {CONCEPT_TYPES.map((tp) => (
                        <option key={tp} value={tp}>{t(`adConceptMerger.${tp}`)}</option>
                      ))}
                    </select>
                    <div className="flex-1" />
                    <button
                      onClick={() => removeConcept(c.id)}
                      disabled={loading || concepts.length <= 2}
                      aria-label={t('adConceptMerger.removeConcept')}
                      className="inline-flex items-center justify-center rounded-lg border border-border bg-bg-secondary p-1.5 text-fg-muted hover:text-danger hover:bg-hover transition disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    value={c.content}
                    onChange={(e) => updateConcept(c.id, { content: e.target.value })}
                    placeholder={t(`adConceptMerger.${c.type}Placeholder`)}
                    rows={3}
                    disabled={loading}
                    className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="acmPlatform" className="block text-sm font-medium mb-1">{t('adConceptMerger.targetPlatform')}</label>
            <input
              id="acmPlatform"
              type="text"
              value={targetPlatform}
              onChange={(e) => setTargetPlatform(e.target.value)}
              placeholder={t('adConceptMerger.targetPlatformPlaceholder')}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <button
            onClick={merge}
            disabled={loading || !canMerge}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adConceptMerger.merging') : `${t('adConceptMerger.merge')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adConceptMerger.noResults')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adConceptMerger.merging')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning">
                {t('adConceptMerger.dryRunNotice')}
              </div>
            )}

            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{t('adConceptMerger.unifiedHook')}</h3>
                <CopyButton text={result.merged.unifiedHook} label={t('adConceptMerger.unifiedHook')} />
              </div>
              <p className="text-sm whitespace-pre-wrap">{result.merged.unifiedHook}</p>
            </div>

            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{t('adConceptMerger.unifiedAngle')}</h3>
                <CopyButton text={result.merged.unifiedAngle} label={t('adConceptMerger.unifiedAngle')} />
              </div>
              <p className="text-sm whitespace-pre-wrap">{result.merged.unifiedAngle}</p>
            </div>

            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{t('adConceptMerger.unifiedScript')}</h3>
                <CopyButton text={result.merged.unifiedScript} label={t('adConceptMerger.unifiedScript')} />
              </div>
              <p className="text-sm whitespace-pre-wrap">{result.merged.unifiedScript}</p>
            </div>

            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{t('adConceptMerger.unifiedVisual')}</h3>
                <CopyButton text={result.merged.unifiedVisual} label={t('adConceptMerger.unifiedVisual')} />
              </div>
              <p className="text-sm whitespace-pre-wrap">{result.merged.unifiedVisual}</p>
            </div>

            {result.merged.conflictResolutions.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h3 className="font-medium mb-2">{t('adConceptMerger.conflictResolutions')}</h3>
                <ul className="space-y-1 text-sm list-disc list-inside text-fg-muted">
                  {result.merged.conflictResolutions.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.merged.optimizationNotes.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h3 className="font-medium mb-2">{t('adConceptMerger.optimizationNotes')}</h3>
                <ul className="space-y-1 text-sm list-disc list-inside text-fg-muted">
                  {result.merged.optimizationNotes.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium mb-2">{t('adConceptMerger.flowScore')}</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-brand-accent"
                    style={{ width: `${Math.max(0, Math.min(100, result.merged.flowScore))}%` }}
                  />
                </div>
                <span className="text-sm font-medium tabular-nums">{result.merged.flowScore}/100</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
