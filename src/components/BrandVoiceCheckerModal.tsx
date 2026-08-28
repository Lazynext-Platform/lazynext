'use client';

import { useState, useCallback } from 'react';
import {
  Shield, X, Loader2, AlertCircle, CheckCircle2, Lightbulb, AlertTriangle,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface BrandCheckDeviation {
  category: string;
  severity: string;
  description: string;
  suggestion: string;
}

interface BrandCheckResult {
  overallScore: number;
  toneScore: number;
  messagingScore: number;
  visualScore: number;
  vocabularyScore: number;
  deviations: BrandCheckDeviation[];
  recommendations: string[];
  alignedElements: string[];
}

interface BrandVoiceCheckerModalProps {
  open: boolean;
  onClose: () => void;
  brief: unknown;
  hook: unknown;
  angle: unknown;
  script: unknown;
  brandKitId: string;
}

const BRAND_CHECK_COST = 3;

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-danger/10', text: 'text-danger', label: 'severityHigh' },
  medium: { bg: 'bg-warning/10', text: 'text-warning', label: 'severityMedium' },
  low: { bg: 'bg-[#eab308]/10', text: 'text-[#eab308]', label: 'severityLow' },
};

function scoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-danger';
}

function barColor(score: number): string {
  if (score >= 80) return 'bg-success';
  if (score >= 60) return 'bg-warning';
  return 'bg-danger';
}

export function BrandVoiceCheckerModal({
  open, onClose, brief, hook, angle, script, brandKitId,
}: BrandVoiceCheckerModalProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BrandCheckResult | null>(null);

  const runCheck = useCallback(async () => {
    if (!brief || !hook || !angle || !script || !brandKitId) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/brand-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, hook, angle, script, brandKitId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j.detail ? `${j.error || 'error'}: ${j.detail}` : (j.error || 'failed'));
      }
      setResult(j.result as BrandCheckResult);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }, [brief, hook, angle, script, brandKitId]);

  if (!open) return null;

  const dimensions = [
    { label: t('brandCheck.toneScore'), value: result?.toneScore ?? 0 },
    { label: t('brandCheck.messagingScore'), value: result?.messagingScore ?? 0 },
    { label: t('brandCheck.visualScore'), value: result?.visualScore ?? 0 },
    { label: t('brandCheck.vocabularyScore'), value: result?.vocabularyScore ?? 0 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('brandCheck.title')}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-accent" />
            <h2 className="text-lg font-bold">{t('brandCheck.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-faint hover:bg-app hover:text-fg"
            aria-label={t('brandCheck.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-fg-faint">{t('brandCheck.subtitle')}</p>

        {/* No brand kit */}
        {!brandKitId && !result && !loading && !error && (
          <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t('brandCheck.noBrandKit')}
          </div>
        )}

        {/* Initial state: Run button */}
        {brandKitId && !result && !loading && !error && (
          <button
            onClick={runCheck}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white"
            style={{ background: '#0064d9' }}
          >
            <span className="flex items-center justify-center gap-2">
              <Shield className="h-4 w-4" />
              {t('brandCheck.run')} ({BRAND_CHECK_COST} {t('brandCheck.credits')})
            </span>
          </button>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-accent" />
            <p className="text-sm text-fg-faint">{t('brandCheck.running')}</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{t('brandCheck.error')}: {error}</span>
            </div>
            <button onClick={runCheck} className="mt-2 text-xs underline">
              {t('brandCheck.retry')}
            </button>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-5">
            {/* Overall score */}
            <div className="flex flex-col items-center gap-2 rounded-xl border border-line bg-app p-5">
              <span className="text-xs font-medium text-fg-faint">{t('brandCheck.overallScore')}</span>
              <span className={`text-5xl font-bold ${scoreColor(result.overallScore)}`}>
                {Math.round(result.overallScore)}
              </span>
              <span className="text-xs text-fg-faint">/ 100</span>
            </div>

            {/* Dimension scores */}
            <div className="space-y-3">
              {dimensions.map((dim) => (
                <div key={dim.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-fg">{dim.label}</span>
                    <span className={`font-bold ${scoreColor(dim.value)}`}>{Math.round(dim.value)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-app">
                    <div
                      className={`h-full rounded-full transition-all ${barColor(dim.value)}`}
                      style={{ width: `${Math.min(100, Math.max(0, dim.value))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Deviations */}
            <div>
              <h3 className="mb-2 text-sm font-bold text-fg">{t('brandCheck.deviations')}</h3>
              {result.deviations.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-xs text-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {t('brandCheck.noDeviations')}
                </div>
              ) : (
                <div className="space-y-2">
                  {result.deviations.map((dev, i) => {
                    const sev = SEVERITY_STYLES[dev.severity] || SEVERITY_STYLES.low;
                    return (
                      <div key={i} className="rounded-xl border border-line bg-app p-3 text-xs">
                        <div className="mb-2 flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sev.bg} ${sev.text}`}>
                            {t(`brandCheck.${sev.label}`)}
                          </span>
                          <span className="rounded-full bg-fg/10 px-2 py-0.5 text-[10px] font-medium text-fg-faint capitalize">
                            {dev.category}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-fg">
                            <span className="font-medium text-fg-secondary">{t('brandCheck.description')}:</span>{' '}
                            {dev.description}
                          </p>
                          <p className="text-fg-faint">
                            <span className="font-medium text-fg-secondary">{t('brandCheck.suggestion')}:</span>{' '}
                            {dev.suggestion}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Aligned elements */}
            {result.alignedElements.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-bold text-fg">{t('brandCheck.alignedElements')}</h3>
                <ul className="space-y-1.5">
                  {result.alignedElements.map((el, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-fg">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                      <span>{el}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-bold text-fg">{t('brandCheck.recommendations')}</h3>
                <ul className="space-y-1.5">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-fg">
                      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-accent" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Re-run button */}
            <button
              onClick={runCheck}
              disabled={loading}
              className="w-full rounded-lg border border-line bg-app px-4 py-2 text-sm font-medium text-fg hover:bg-surface disabled:opacity-50"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t('brandCheck.run')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
