'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  FileText,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Target,
  Users,
  MessageSquare,
  ListChecks,
  TrendingUp,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  CreativeBriefGeneratorResult,
} from '@/lib/creative/creative-brief-generator';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;
const BUDGETS = ['low', 'medium', 'high'] as const;

export default function CreativeBriefGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState('');
  const [budget, setBudget] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreativeBriefGeneratorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !campaignGoal.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/creative-brief-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          campaignGoal,
          platform: platform || undefined,
          targetAudience: targetAudience || undefined,
          budget: budget || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('creativeBriefGenerator.error'));
      setResult(data.result as CreativeBriefGeneratorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, campaignGoal, platform, targetAudience, budget, t]);

  const copyToClipboard = useCallback(async () => {
    if (!result) return;
    try {
      const b = result.brief;
      const text =
        `${b.title}\n\n` +
        `Objective: ${b.objective}\n\n` +
        `Target Audience: ${b.targetAudience}\n\n` +
        `Key Message: ${b.keyMessage}\n\n` +
        `Tone: ${b.tone}\n\n` +
        `Deliverables:\n${b.deliverables.map((d) => `- ${d}`).join('\n')}\n\n` +
        `Timeline: ${b.timeline}\n\n` +
        `Budget Guidance: ${b.budgetGuidance}\n\n` +
        `Success Metrics:\n${b.successMetrics.map((m) => `- ${m}`).join('\n')}\n\n` +
        `Creative Direction: ${b.creativeDirection}\n\n` +
        `Platform Recommendations:\n${b.platformRecommendations.map((p) => `- ${p}`).join('\n')}`;
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
          {t('creativeBriefGenerator.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" /> {t('creativeBriefGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeBriefGenerator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('creativeBriefGenerator.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" /> {t('creativeBriefGenerator.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('creativeBriefGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cbgProduct" className="block text-sm font-medium mb-1">
              {t('creativeBriefGenerator.productOrBrand')}
            </label>
            <textarea
              id="cbgProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder="e.g., DTC skincare brand selling a vitamin C serum"
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="cbgGoal" className="block text-sm font-medium mb-1">
              {t('creativeBriefGenerator.campaignGoal')}
            </label>
            <input
              id="cbgGoal"
              type="text"
              value={campaignGoal}
              onChange={(e) => setCampaignGoal(e.target.value)}
              placeholder="e.g., launch a new product line and drive pre-orders"
              maxLength={500}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeBriefGenerator.platform')}</label>
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
                {t('creativeBriefGenerator.anyPlatform')}
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

          <div>
            <label htmlFor="cbgAudience" className="block text-sm font-medium mb-1">
              {t('creativeBriefGenerator.targetAudience')}
            </label>
            <input
              id="cbgAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., millennial skincare enthusiasts aged 25-35"
              maxLength={1000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('creativeBriefGenerator.budget')}</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBudget('')}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  budget === ''
                    ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                    : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                }`}
                disabled={loading}
              >
                {t('creativeBriefGenerator.anyBudget')}
              </button>
              {BUDGETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBudget(b)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    budget === b
                      ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30'
                      : 'bg-bg-card text-fg-muted border-border hover:border-brand-accent/30'
                  }`}
                  disabled={loading}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim() || !campaignGoal.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('creativeBriefGenerator.generating') : `${t('creativeBriefGenerator.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('creativeBriefGenerator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('creativeBriefGenerator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('creativeBriefGenerator.dryRunNotice')}
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
                {copied ? t('creativeBriefGenerator.copied') : t('creativeBriefGenerator.copy')}
              </button>
            </div>

            {/* Brief */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-4">
              <h2 className="text-lg font-semibold">{result.brief.title}</h2>

              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-fg">{t('creativeBriefGenerator.objective')}</p>
                    <p className="text-sm text-fg-muted">{result.brief.objective}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-fg">{t('creativeBriefGenerator.targetAudienceLabel')}</p>
                    <p className="text-sm text-fg-muted">{result.brief.targetAudience}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-fg">{t('creativeBriefGenerator.keyMessage')}</p>
                    <p className="text-sm text-fg-muted">{result.brief.keyMessage}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-fg mb-1">{t('creativeBriefGenerator.tone')}</p>
                  <p className="text-sm text-fg-muted">{result.brief.tone}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-fg mb-1 flex items-center gap-1">
                    <ListChecks className="w-3.5 h-3.5" /> {t('creativeBriefGenerator.deliverables')}
                  </p>
                  <ul className="text-sm text-fg-muted list-disc list-inside space-y-0.5">
                    {result.brief.deliverables.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-medium text-fg mb-1">{t('creativeBriefGenerator.timeline')}</p>
                  <p className="text-sm text-fg-muted">{result.brief.timeline}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-fg mb-1">{t('creativeBriefGenerator.budgetGuidance')}</p>
                  <p className="text-sm text-fg-muted">{result.brief.budgetGuidance}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-fg mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> {t('creativeBriefGenerator.successMetrics')}
                  </p>
                  <ul className="text-sm text-fg-muted list-disc list-inside space-y-0.5">
                    {result.brief.successMetrics.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-medium text-fg mb-1">{t('creativeBriefGenerator.creativeDirection')}</p>
                  <p className="text-sm text-fg-muted">{result.brief.creativeDirection}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-fg mb-1">{t('creativeBriefGenerator.platformRecommendations')}</p>
                  <ul className="text-sm text-fg-muted list-disc list-inside space-y-0.5">
                    {result.brief.platformRecommendations.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
