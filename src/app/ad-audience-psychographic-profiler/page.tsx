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
  Heart,
  MessageSquare,
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type {
  ProfilerResult,
  PsychographicDimension,
  MotivationDriver,
  ContentPreference,
} from '@/lib/creative/ad-audience-psychographic-profiler';

const CREDIT_COST = 4;

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const;

function intensityColor(intensity: number): string {
  if (intensity >= 70) return 'text-success';
  if (intensity >= 50) return 'text-warning';
  return 'text-danger';
}

export default function AdAudiencePsychographicProfilerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ProfilerResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim() || !targetAudience.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/ad-audience-psychographic-profiler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand,
          targetAudience,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adAudiencePsychographicProfiler.error'));
      setResult(data.result as ProfilerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, targetAudience, platform, t]);

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
          {t('adAudiencePsychographicProfiler.skipToContent')}
        </a>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> {t('adAudiencePsychographicProfiler.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adAudiencePsychographicProfiler.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-fg">
        {t('adAudiencePsychographicProfiler.skipToContent')}
      </a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> {t('adAudiencePsychographicProfiler.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('adAudiencePsychographicProfiler.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="aappProduct" className="block text-sm font-medium mb-1">
              {t('adAudiencePsychographicProfiler.productOrBrand')}
            </label>
            <input
              id="aappProduct"
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
            <label htmlFor="aappAudience" className="block text-sm font-medium mb-1">
              {t('adAudiencePsychographicProfiler.targetAudience')}
            </label>
            <input
              id="aappAudience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Women aged 25-34, urban professionals interested in wellness"
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('adAudiencePsychographicProfiler.platform')}</label>
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
            disabled={loading || !productOrBrand.trim() || !targetAudience.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adAudiencePsychographicProfiler.generating') : `${t('adAudiencePsychographicProfiler.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adAudiencePsychographicProfiler.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adAudiencePsychographicProfiler.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.dryRun && (
              <div role="status" className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-sm text-warning">
                {t('adAudiencePsychographicProfiler.dryRunNotice')}
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
                {copied ? t('adAudiencePsychographicProfiler.copied') : t('adAudiencePsychographicProfiler.copy')}
              </button>
            </div>

            {/* Psychographic dimensions */}
            {result.profile.dimensions.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-brand-accent" /> {t('adAudiencePsychographicProfiler.dimensions')}
                </p>
                {result.profile.dimensions.map((d: PsychographicDimension, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium capitalize">{d.dimension.replace(/_/g, ' ')}</span>
                      <span className={`text-sm font-bold ${intensityColor(d.intensity)}`}>{d.intensity}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${d.intensity >= 70 ? 'bg-success' : d.intensity >= 50 ? 'bg-warning' : 'bg-danger'}`}
                        style={{ width: `${d.intensity}%` }}
                      />
                    </div>
                    {d.traits.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {d.traits.map((trait, ti) => (
                          <span key={ti} className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-bg-secondary text-fg-muted border-border">
                            {trait}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-fg-muted">{d.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Motivation drivers */}
            {result.profile.motivationDrivers.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Heart className="w-4 h-4 text-brand-accent" /> {t('adAudiencePsychographicProfiler.motivationDrivers')}
                </p>
                {result.profile.motivationDrivers.map((driver: MotivationDriver, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg capitalize">{driver.driver.replace(/_/g, ' ')}</span>
                      <span className={`text-xs font-bold ${intensityColor(driver.strength)}`}>{driver.strength}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${driver.strength >= 70 ? 'bg-success' : driver.strength >= 50 ? 'bg-warning' : 'bg-danger'}`}
                        style={{ width: `${driver.strength}%` }}
                      />
                    </div>
                    <p className="text-xs text-fg-muted">{driver.description}</p>
                    {driver.triggerWords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {driver.triggerWords.map((word, wi) => (
                          <span key={wi} className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-brand-accent/10 text-brand-accent border-brand-accent/30">
                            {word}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Content preferences */}
            {result.profile.contentPreferences.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-brand-accent" /> {t('adAudiencePsychographicProfiler.contentPreferences')}
                </p>
                {result.profile.contentPreferences.map((pref: ContentPreference, i: number) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-secondary p-3 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-medium text-fg capitalize">{pref.type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-xs text-fg">{pref.preference}</p>
                    <p className="text-xs text-fg-muted">{pref.reason}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Communication style */}
            {result.profile.communicationStyle && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-accent" /> {t('adAudiencePsychographicProfiler.communicationStyle')}
                </p>
                <p className="text-xs text-fg-muted">{result.profile.communicationStyle}</p>
              </div>
            )}

            {/* Messaging recommendations */}
            {result.profile.messagingRecommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adAudiencePsychographicProfiler.messagingRecommendations')}</p>
                <ul className="space-y-1.5">
                  {result.profile.messagingRecommendations.map((rec, i) => (
                    <li key={i} className="text-xs text-fg-muted flex items-start gap-1.5">
                      <Sparkles className="w-3 h-3 text-brand-accent flex-shrink-0 mt-0.5" /> {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.profile.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <p className="text-sm font-medium mb-2">{t('adAudiencePsychographicProfiler.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.profile.recommendations.map((rec, i) => (
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
