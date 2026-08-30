'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Radar, Loader2, AlertCircle, Sparkles, FileText, Target, Zap, Bell, Palette, DollarSign, Heart, Shield } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type { CompetitorWatchResult, CompetitorAlert } from '@/lib/creative/competitor-watch';

const CREDIT_COST = 5;

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-danger/20 text-danger border-danger/30',
  warning: 'bg-warning/20 text-warning border-warning/30',
  info: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-danger/20 text-danger border-danger/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  low: 'bg-success/20 text-success border-success/30',
};

const ALERT_TYPE_ICONS: Record<string, typeof Bell> = {
  new_strategy: Zap,
  pricing_change: DollarSign,
  new_ad: Bell,
};

export default function CompetitorWatchPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [competitorUrl, setCompetitorUrl] = useState('');
  const [brandKit, setBrandKit] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CompetitorWatchResult | null>(null);

  const analyze = useCallback(async () => {
    if (!competitorUrl.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/competitor-watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitorUrl,
          brandKit: brandKit || undefined,
          productCategory: productCategory || undefined,
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('competitorWatch.error'));
      setResult(data.result as CompetitorWatchResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [competitorUrl, brandKit, productCategory, platform, t]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Radar className="w-6 h-6" /> {t('competitorWatch.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('competitorWatch.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Radar className="w-6 h-6" /> {t('competitorWatch.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('competitorWatch.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="cwCompetitorUrl" className="block text-sm font-medium mb-1">{t('competitorWatch.competitorUrl')}</label>
            <input id="cwCompetitorUrl" type="url" value={competitorUrl} onChange={(e) => setCompetitorUrl(e.target.value)} placeholder="https://competitor.com" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cwProductCategory" className="block text-sm font-medium mb-1">{t('competitorWatch.productCategory')}</label>
              <input id="cwProductCategory" type="text" value={productCategory} onChange={(e) => setProductCategory(e.target.value)} placeholder="e.g., skincare, fitness" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
            </div>
            <div>
              <label htmlFor="cwPlatform" className="block text-sm font-medium mb-1">{t('competitorWatch.platform')}</label>
              <select id="cwPlatform" value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="cwBrandKit" className="block text-sm font-medium mb-1">{t('competitorWatch.brandKit')}</label>
            <textarea id="cwBrandKit" value={brandKit} onChange={(e) => setBrandKit(e.target.value)} placeholder="Paste your brand kit or positioning statement (optional)" rows={3} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y" disabled={loading} />
          </div>

          <button onClick={analyze} disabled={loading || !competitorUrl.trim()} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('competitorWatch.analyzing') : `${t('competitorWatch.analyze')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('competitorWatch.enterUrl')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('competitorWatch.analyzing')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Analysis report */}
            {result.analysisReport && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h2 className="font-medium flex items-center gap-2 mb-2"><FileText className="w-4 h-4" /> {t('competitorWatch.analysis')}</h2>
                <p className="text-sm text-fg-muted">{result.analysisReport}</p>
              </div>
            )}

            {/* Creative extraction */}
            {result.creativeExtraction && (
              <div className="rounded-lg border border-border bg-bg-card p-4 space-y-4">
                <h2 className="font-medium flex items-center gap-2"><Sparkles className="w-4 h-4" /> {t('competitorWatch.creativeExtraction')}</h2>

                {result.creativeExtraction.hooks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-1">{t('competitorWatch.hooks')}</h3>
                    <ul className="list-disc list-inside text-xs text-fg-muted space-y-1">
                      {result.creativeExtraction.hooks.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </div>
                )}

                {result.creativeExtraction.angles.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-1">{t('competitorWatch.angles')}</h3>
                    <ul className="list-disc list-inside text-xs text-fg-muted space-y-1">
                      {result.creativeExtraction.angles.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}

                {result.creativeExtraction.ctas.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-1">{t('competitorWatch.ctas')}</h3>
                    <ul className="list-disc list-inside text-xs text-fg-muted space-y-1">
                      {result.creativeExtraction.ctas.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}

                {result.creativeExtraction.visualStyle && (
                  <div>
                    <h3 className="text-sm font-medium mb-1 flex items-center gap-1"><Palette className="w-3.5 h-3.5" /> {t('competitorWatch.visualStyle')}</h3>
                    <div className="text-xs text-fg-muted space-y-0.5">
                      <p><span className="font-medium">Tone:</span> {result.creativeExtraction.visualStyle.tone}</p>
                      <p><span className="font-medium">Quality:</span> {result.creativeExtraction.visualStyle.productionQuality}</p>
                      {result.creativeExtraction.visualStyle.colorPalette.length > 0 && (
                        <p><span className="font-medium">Colors:</span> {result.creativeExtraction.visualStyle.colorPalette.join(', ')}</p>
                      )}
                    </div>
                  </div>
                )}

                {result.creativeExtraction.emotionalTriggers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-1 flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {t('competitorWatch.emotionalTriggers')}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {result.creativeExtraction.emotionalTriggers.map((e, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full border border-border bg-bg-secondary">{e}</span>
                      ))}
                    </div>
                  </div>
                )}

                {result.creativeExtraction.pricingStrategy && (
                  <div>
                    <h3 className="text-sm font-medium mb-1 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> {t('competitorWatch.pricingStrategy')}</h3>
                    <div className="text-xs text-fg-muted space-y-0.5">
                      <p><span className="font-medium">Approach:</span> {result.creativeExtraction.pricingStrategy.approach}</p>
                      <p><span className="font-medium">Discounting:</span> {result.creativeExtraction.pricingStrategy.discounting}</p>
                      <p><span className="font-medium">Positioning:</span> {result.creativeExtraction.pricingStrategy.positioning}</p>
                      {result.creativeExtraction.pricingStrategy.pricePoints.length > 0 && (
                        <p><span className="font-medium">Price points:</span> {result.creativeExtraction.pricingStrategy.pricePoints.join(', ')}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Brand comparison */}
            {result.brandComparison && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h2 className="font-medium flex items-center gap-2 mb-2"><Shield className="w-4 h-4" /> {t('competitorWatch.brandComparison')}</h2>
                <p className="text-sm text-fg-muted">{result.brandComparison}</p>
              </div>
            )}

            {/* Competitive gaps */}
            {result.competitiveGaps.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h2 className="font-medium flex items-center gap-2 mb-3"><Target className="w-4 h-4" /> {t('competitorWatch.competitiveGaps')}</h2>
                <div className="space-y-3">
                  {result.competitiveGaps.map((g, i) => (
                    <div key={i} className="border-l-2 border-brand-accent/30 pl-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{g.area}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[g.priority] || PRIORITY_COLORS.medium}`}>{g.priority}</span>
                      </div>
                      <p className="text-xs text-fg-muted"><span className="font-medium">Competitor strength:</span> {g.competitorStrength}</p>
                      <p className="text-xs text-fg-muted"><span className="font-medium">Your gap:</span> {g.userWeakness}</p>
                      <p className="text-xs mt-1">{g.opportunity}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Counter-strategies */}
            {result.counterStrategies.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h2 className="font-medium flex items-center gap-2 mb-3"><Zap className="w-4 h-4" /> {t('competitorWatch.counterStrategies')}</h2>
                <div className="space-y-3">
                  {result.counterStrategies.map((s, i) => (
                    <div key={i} className="border-l-2 border-brand-accent/30 pl-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{s.strategy}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[s.priority] || PRIORITY_COLORS.medium}`}>{s.priority}</span>
                      </div>
                      <p className="text-xs text-fg-muted"><span className="font-medium">Rationale:</span> {s.rationale}</p>
                      <p className="text-xs text-fg-muted"><span className="font-medium">Expected impact:</span> {s.expectedImpact}</p>
                      <p className="text-xs text-fg-muted"><span className="font-medium">Timeframe:</span> {s.timeframe}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alerts */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h2 className="font-medium flex items-center gap-2 mb-3"><Bell className="w-4 h-4" /> {t('competitorWatch.alerts')}</h2>
              {result.alerts.length === 0 ? (
                <p className="text-sm text-fg-muted">{t('competitorWatch.noAlerts')}</p>
              ) : (
                <div className="space-y-3">
                  {result.alerts.map((a: CompetitorAlert, i) => {
                    const AlertIcon = ALERT_TYPE_ICONS[a.type] || Bell;
                    return (
                      <div key={i} className={`rounded-lg border px-3 py-2 ${SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.info}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-medium">{a.title}</span>
                          <span className="text-xs opacity-70 ml-auto">{a.type.replace('_', ' ')}</span>
                        </div>
                        <p className="text-xs opacity-90">{a.description}</p>
                        <p className="text-xs mt-1"><span className="font-medium">Action:</span> {a.recommendedAction}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
