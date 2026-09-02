'use client';

import { useState, useCallback } from 'react';
import {
  Wand2, X, Loader2, AlertCircle, Trophy, TrendingUp, TrendingDown,
  CheckCircle2, Crown, Sparkles,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface CreativeScore {
  hookStrength: number;
  clarity: number;
  productVisibility: number;
  brandConsistency: number;
  emotionalImpact: number;
  novelty: number;
  platformFit: number;
  ctaStrength: number;
  audioQuality: number;
  visualQuality: number;
  complianceRisk: number;
  overall: number;
  notes: string;
}

interface ScoredVariant {
  id: string;
  variationType: string;
  hook: string;
  script: string;
  visual: string;
  cta: string;
  rationale: string;
  score: CreativeScore;
  rank: number;
  isWinner: boolean;
}

interface AutoVariantsResult {
  variants: ScoredVariant[];
  winner: { variant: ScoredVariant; score: CreativeScore; improvement: number };
  baselineScore: number;
  totalCost: number;
  generated: number;
  failed: number;
}

interface AutoVariantsModalProps {
  open: boolean;
  onClose: () => void;
  brief: unknown;
  script: unknown;
  existingScore?: CreativeScore | null;
  onSelectVariant?: (variant: ScoredVariant) => void;
}

export function AutoVariantsModal({
  open, onClose, brief, script, existingScore, onSelectVariant,
}: AutoVariantsModalProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AutoVariantsResult | null>(null);
  const [count, setCount] = useState(3);

  const runOptimization = useCallback(async () => {
    if (!brief || !script) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/auto-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, script, count, existingScore: existingScore || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'failed');
      }
      const data = await res.json();
      setResult(data as AutoVariantsResult);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }, [brief, script, count, existingScore]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('autoVariants.title')}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-brand-accent" />
            <h2 className="text-lg font-bold">{t('autoVariants.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-faint hover:bg-app hover:text-fg"
            aria-label={t('autoVariants.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-fg-faint">{t('autoVariants.subtitle')}</p>

        {!result && !loading && !error && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-fg-faint">{t('autoVariants.countLabel')}</label>
              <div className="mt-2 flex gap-2">
                {[2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                      count === n
                        ? 'bg-brand-accent text-white'
                        : 'border border-line bg-app text-fg hover:bg-surface'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-line bg-app p-3 text-xs text-fg-faint">
              {t('autoVariants.costNote').replace('{0}', String(3 + 2 * count))}
            </div>
            <button
              onClick={runOptimization}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white"
              style={{ background: '#0064d9' }}
            >
              {t('autoVariants.run')} ({3 + 2 * count} {t('autoVariants.credits')})
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-accent" />
            <p className="text-sm text-fg-faint">{t('autoVariants.optimizing')}</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{t('autoVariants.error')}: {error}</span>
            </div>
            <button onClick={runOptimization} className="mt-2 text-xs underline">
              {t('autoVariants.retry')}
            </button>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Winner banner */}
            <div className="rounded-xl border border-success/30 bg-success/10 p-4">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-success" />
                <span className="text-sm font-bold text-success">{t('autoVariants.winner')}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div>
                  <div className="text-fg-faint">{t('autoVariants.score')}</div>
                  <div className="text-lg font-bold text-fg">{result.winner.score.overall}/100</div>
                </div>
                <div>
                  <div className="text-fg-faint">{t('autoVariants.improvement')}</div>
                  <div className={`flex items-center gap-1 text-lg font-bold ${result.winner.improvement >= 0 ? 'text-success' : 'text-danger'}`}>
                    {result.winner.improvement >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {result.winner.improvement >= 0 ? '+' : ''}{result.winner.improvement}%
                  </div>
                </div>
                <div>
                  <div className="text-fg-faint">{t('autoVariants.hookType')}</div>
                  <div className="text-sm font-medium text-fg">{result.winner.variant.variationType}</div>
                </div>
                <div>
                  <div className="text-fg-faint">{t('autoVariants.generated')}</div>
                  <div className="text-sm font-medium text-fg">{result.generated}/{result.generated + result.failed}</div>
                </div>
              </div>
            </div>

            {/* Variant comparison */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-fg">{t('autoVariants.ranking')}</div>
              {result.variants.map((v) => (
                <div
                  key={v.id}
                  className={`rounded-xl border p-3 ${
                    v.isWinner ? 'border-success/40 bg-success/5' : 'border-line bg-app'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {v.isWinner ? (
                        <Trophy className="h-4 w-4 text-success" />
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fg/10 text-xs font-bold text-fg-faint">
                          {v.rank}
                        </span>
                      )}
                      <span className="text-xs font-bold text-fg">{v.score.overall}/100</span>
                      <span className="rounded-full bg-brand-accent/10 px-2 py-0.5 text-[10px] font-medium text-brand-accent">
                        {v.variationType}
                      </span>
                    </div>
                    {onSelectVariant && (
                      <button
                        onClick={() => onSelectVariant(v)}
                        className="flex items-center gap-1 text-xs text-brand-accent hover:underline"
                      >
                        {t('autoVariants.select')} <Sparkles className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-fg-faint">
                    <div><span className="font-medium text-fg">{t('autoVariants.hook')}:</span> {v.hook}</div>
                    <div><span className="font-medium text-fg">{t('autoVariants.cta')}:</span> {v.cta}</div>
                    <div><span className="font-medium text-fg">{t('autoVariants.rationale')}:</span> {v.rationale}</div>
                  </div>
                  {/* Score breakdown */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {[
                      { label: 'Hook', value: v.score.hookStrength },
                      { label: 'Clarity', value: v.score.clarity },
                      { label: 'Impact', value: v.score.emotionalImpact },
                      { label: 'Platform', value: v.score.platformFit },
                      { label: 'CTA', value: v.score.ctaStrength },
                    ].map((s) => (
                      <span
                        key={s.label}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          s.value >= 7 ? 'bg-success/10 text-success' : s.value >= 5 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'
                        }`}
                      >
                        {s.label}: {s.value}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={runOptimization}
              disabled={loading}
              className="w-full rounded-lg border border-line bg-app px-4 py-2 text-sm font-medium text-fg hover:bg-surface disabled:opacity-50"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t('autoVariants.rerun')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
