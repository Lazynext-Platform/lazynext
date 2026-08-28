'use client';

import { useState, useCallback } from 'react';
import {
  Sparkles, X, Loader2, AlertCircle, TrendingUp, Lightbulb,
  Target, Zap, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface BriefAssistantSuggestion {
  toneRecommendations: { tone: string; rationale: string }[];
  angleIdeas: { name: string; description: string; emotionalTrigger: string }[];
  hookSuggestions: { type: string; text: string; rationale: string }[];
  ctaOptimizations: { cta: string; rationale: string }[];
  overallAssessment: string;
  improvements: string[];
}

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  product: string;
  audience: string;
  platform: string;
  format: string;
  currentBrief: unknown;
  onApplyTone?: (tone: string) => void;
  onApplyAngle?: (angle: string) => void;
  onApplyHook?: (hook: string) => void;
  onApplyCta?: (cta: string) => void;
}

export function BriefAssistantModal({
  open, onClose, product, audience, platform, format, currentBrief,
  onApplyTone, onApplyAngle, onApplyHook, onApplyCta,
}: ExportModalProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState<BriefAssistantSuggestion | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!product.trim()) return;
    setLoading(true);
    setError('');
    setSuggestion(null);
    try {
      const res = await fetch('/api/creative/brief-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: product.trim(),
          audience: audience.trim() || undefined,
          platform: platform || undefined,
          format: format || undefined,
          currentBrief: currentBrief || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'failed');
      }
      const data = await res.json();
      setSuggestion(data.suggestion as BriefAssistantSuggestion);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }, [product, audience, platform, format, currentBrief]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('briefAssistant.title')}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-accent" />
            <h2 className="text-lg font-bold">{t('briefAssistant.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-faint hover:bg-app hover:text-fg"
            aria-label={t('briefAssistant.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-fg-faint">{t('briefAssistant.subtitle')}</p>

        {!suggestion && !loading && !error && (
          <div className="space-y-3">
            <div className="rounded-lg border border-line bg-app p-3 text-xs text-fg-faint">
              <div><span className="font-medium text-fg">{t('briefAssistant.product')}:</span> {product.slice(0, 100)}{product.length > 100 ? '...' : ''}</div>
              {audience && <div className="mt-1"><span className="font-medium text-fg">{t('briefAssistant.audience')}:</span> {audience}</div>}
            </div>
            <button
              onClick={fetchSuggestions}
              disabled={!product.trim()}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: '#0064d9' }}
            >
              {t('briefAssistant.analyze')} (2 {t('briefAssistant.credits')})
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-brand-accent" />
            <p className="text-sm text-fg-faint">{t('briefAssistant.analyzing')}</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{t('briefAssistant.error')}: {error}</span>
            </div>
            <button
              onClick={fetchSuggestions}
              className="mt-2 text-xs underline"
            >
              {t('briefAssistant.retry')}
            </button>
          </div>
        )}

        {suggestion && (
          <div className="space-y-4">
            {/* Overall Assessment */}
            {suggestion.overallAssessment && (
              <div className="rounded-xl border border-line bg-app p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-fg">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  {t('briefAssistant.assessment')}
                </div>
                <p className="text-xs text-fg-faint">{suggestion.overallAssessment}</p>
              </div>
            )}

            {/* Tone Recommendations */}
            {suggestion.toneRecommendations.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-fg">
                  <TrendingUp className="h-3.5 w-3.5 text-brand-accent" />
                  {t('briefAssistant.toneRecs')}
                </div>
                <div className="space-y-2">
                  {suggestion.toneRecommendations.map((item, i) => (
                    <div key={i} className="rounded-lg border border-line bg-app p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg">{item.tone}</span>
                        {onApplyTone && (
                          <button
                            onClick={() => onApplyTone(item.tone)}
                            className="flex items-center gap-1 text-xs text-brand-accent hover:underline"
                          >
                            {t('briefAssistant.apply')} <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-fg-faint">{item.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Angle Ideas */}
            {suggestion.angleIdeas.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-fg">
                  <Target className="h-3.5 w-3.5 text-brand-accent" />
                  {t('briefAssistant.angleIdeas')}
                </div>
                <div className="space-y-2">
                  {suggestion.angleIdeas.map((item, i) => (
                    <div key={i} className="rounded-lg border border-line bg-app p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg">{item.name}</span>
                        {onApplyAngle && (
                          <button
                            onClick={() => onApplyAngle(item.description)}
                            className="flex items-center gap-1 text-xs text-brand-accent hover:underline"
                          >
                            {t('briefAssistant.apply')} <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-fg-faint">{item.description}</p>
                      <span className="mt-1 inline-block rounded-full bg-brand-accent/10 px-2 py-0.5 text-[10px] font-medium text-brand-accent">
                        {item.emotionalTrigger}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hook Suggestions */}
            {suggestion.hookSuggestions.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-fg">
                  <Lightbulb className="h-3.5 w-3.5 text-brand-accent" />
                  {t('briefAssistant.hookSuggestions')}
                </div>
                <div className="space-y-2">
                  {suggestion.hookSuggestions.map((item, i) => (
                    <div key={i} className="rounded-lg border border-line bg-app p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg">{item.text}</span>
                        {onApplyHook && (
                          <button
                            onClick={() => onApplyHook(item.text)}
                            className="flex items-center gap-1 text-xs text-brand-accent hover:underline"
                          >
                            {t('briefAssistant.apply')} <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-fg-faint">{item.rationale}</p>
                      <span className="mt-1 inline-block rounded-full bg-fg/10 px-2 py-0.5 text-[10px] font-medium text-fg-faint">
                        {item.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Optimizations */}
            {suggestion.ctaOptimizations.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-fg">
                  <Zap className="h-3.5 w-3.5 text-brand-accent" />
                  {t('briefAssistant.ctaOptimizations')}
                </div>
                <div className="space-y-2">
                  {suggestion.ctaOptimizations.map((item, i) => (
                    <div key={i} className="rounded-lg border border-line bg-app p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-fg">{item.cta}</span>
                        {onApplyCta && (
                          <button
                            onClick={() => onApplyCta(item.cta)}
                            className="flex items-center gap-1 text-xs text-brand-accent hover:underline"
                          >
                            {t('briefAssistant.apply')} <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-fg-faint">{item.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvements */}
            {suggestion.improvements.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold text-fg">{t('briefAssistant.improvements')}</div>
                <ul className="space-y-1">
                  {suggestion.improvements.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-fg-faint">
                      <span className="mt-0.5 text-brand-accent">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={fetchSuggestions}
              disabled={loading}
              className="w-full rounded-lg border border-line bg-app px-4 py-2 text-sm font-medium text-fg hover:bg-surface disabled:opacity-50"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t('briefAssistant.regenerate')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
