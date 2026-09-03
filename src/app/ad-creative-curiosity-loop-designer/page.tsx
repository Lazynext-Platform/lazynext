'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Repeat,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  HelpCircle,
  Eye,
  Clock,
  Gift,
  TrendingUp,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  CuriosityLoopDesignerResult,
  CuriosityLoop,
} from '@/lib/creative/ad-creative-curiosity-loop-designer';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

const LOOP_TYPE_COLORS: Record<string, string> = {
  open_question: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  mystery_box: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  before_after: 'bg-success/20 text-success border-success/30',
  transformation_tease: 'bg-success/20 text-success border-success/30',
  secret_reveal: 'bg-warning/20 text-warning border-warning/30',
  countdown_hook: 'bg-warning/20 text-warning border-warning/30',
  contradiction: 'bg-danger/20 text-danger border-danger/30',
  unexpected_result: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
};

function scoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

export default function AdCreativeCuriosityLoopDesignerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CuriosityLoopDesignerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !content.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-creative-curiosity-loop-designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          content,
          targetAudience,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCreativeCuriosityLoopDesigner.error'));
      setResult(data.result as CuriosityLoopDesignerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, content, targetAudience, platform, t]);

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
          {t('adCreativeCuriosityLoopDesigner.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Repeat className="w-6 h-6" /> {t('adCreativeCuriosityLoopDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeCuriosityLoopDesigner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adCreativeCuriosityLoopDesigner.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Repeat className="w-6 h-6" /> {t('adCreativeCuriosityLoopDesigner.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCreativeCuriosityLoopDesigner.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acldProduct" className="block text-sm font-medium mb-1">
              {t('adCreativeCuriosityLoopDesigner.productOrBrand')}
            </label>
            <input
              id="acldProduct"
              type="text"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder={t('common.phProduct')}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="acldContent" className="block text-sm font-medium mb-1">
              {t('adCreativeCuriosityLoopDesigner.content')}
            </label>
            <textarea
              id="acldContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('common.phMessage')}
              rows={4}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="acldAudience" className="block text-sm font-medium mb-1">
              {t('adCreativeCuriosityLoopDesigner.targetAudience')}
            </label>
            <input
              id="acldAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder={t('common.phAudience')}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adCreativeCuriosityLoopDesigner.platform')}</label>
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
            disabled={loading || !productOrBrand.trim() || !content.trim() || !targetAudience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCreativeCuriosityLoopDesigner.generating') : `${t('adCreativeCuriosityLoopDesigner.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCreativeCuriosityLoopDesigner.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCreativeCuriosityLoopDesigner.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adCreativeCuriosityLoopDesigner.dryRunNotice')}
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
                {copied ? t('adCreativeCuriosityLoopDesigner.copied') : t('adCreativeCuriosityLoopDesigner.copy')}
              </button>
            </div>

            {/* Loops */}
            {result.strategy.loops.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-brand-accent" /> {t('adCreativeCuriosityLoopDesigner.loops')}
                </p>
                {result.strategy.loops.map((loop: CuriosityLoop, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${LOOP_TYPE_COLORS[loop.type] || LOOP_TYPE_COLORS.open_question}`}>
                        {loop.type.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-fg-muted" />
                        <span className={`text-sm font-bold ${scoreColor(loop.curiosityRetentionScore)}`}>{loop.curiosityRetentionScore}/100</span>
                      </div>
                    </div>

                    {/* Curiosity retention score bar */}
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${loop.curiosityRetentionScore >= 75 ? 'bg-success' : loop.curiosityRetentionScore >= 50 ? 'bg-warning' : 'bg-danger'}`}
                        style={{ width: `${loop.curiosityRetentionScore}%` }}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-fg-muted">{t('adCreativeCuriosityLoopDesigner.openingQuestion')}</p>
                          <p className="text-sm text-fg">{loop.openingQuestion}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Eye className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-fg-muted">{t('adCreativeCuriosityLoopDesigner.mysteryElement')}</p>
                          <p className="text-sm text-fg">{loop.mysteryElement}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-fg-muted">{t('adCreativeCuriosityLoopDesigner.revealTiming')}</p>
                          <p className="text-sm text-fg">{loop.revealTiming}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Gift className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-fg-muted">{t('adCreativeCuriosityLoopDesigner.payoff')}</p>
                          <p className="text-sm text-fg">{loop.payoff}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-fg-muted">{t('adCreativeCuriosityLoopDesigner.viewerHook')}</p>
                          <p className="text-sm text-fg">{loop.viewerHook}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {result.strategy.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adCreativeCuriosityLoopDesigner.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.strategy.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-fg-muted flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" /> {rec}
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
