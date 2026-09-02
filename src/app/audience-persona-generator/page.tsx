'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Users, Loader2, AlertCircle, Sparkles, MapPin, Heart, Target, Smartphone, ShoppingCart, MessageCircle, Copy, Check } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type { AudiencePersonaGeneratorResult, Industry } from '@/lib/creative/audience-persona-generator';

const CREDIT_COST = 4;

const INDUSTRIES: { value: Industry; labelKey: string }[] = [
  { value: 'beauty', labelKey: 'audiencePersonaGenerator.beauty' },
  { value: 'tech', labelKey: 'audiencePersonaGenerator.tech' },
  { value: 'food', labelKey: 'audiencePersonaGenerator.food' },
  { value: 'fashion', labelKey: 'audiencePersonaGenerator.fashion' },
  { value: 'fitness', labelKey: 'audiencePersonaGenerator.fitness' },
  { value: 'home', labelKey: 'audiencePersonaGenerator.home' },
  { value: 'finance', labelKey: 'audiencePersonaGenerator.finance' },
  { value: 'travel', labelKey: 'audiencePersonaGenerator.travel' },
];

export default function AudiencePersonaGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [productOrBrand, setProductOrBrand] = useState('');
  const [industry, setIndustry] = useState<Industry | ''>('');
  const [targetMarket, setTargetMarket] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AudiencePersonaGeneratorResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!productOrBrand.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch('/api/creative/audience-persona-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productOrBrand: productOrBrand.trim(),
          industry: industry || undefined,
          targetMarket: targetMarket.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('audiencePersonaGenerator.noResults'));
      setResult(data.result as AudiencePersonaGeneratorResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productOrBrand, industry, targetMarket, t]);

  const copyPersonas = useCallback(() => {
    if (!result) return;
    const lines: string[] = [
      'Audience Personas',
      '',
    ];
    for (const persona of result.personas) {
      lines.push(`## ${persona.name} — ${persona.tagline}`);
      lines.push('');
      lines.push('DEMOGRAPHICS:');
      const d = persona.demographics;
      lines.push(`- Age: ${d.ageRange}`);
      lines.push(`- Gender: ${d.gender}`);
      lines.push(`- Location: ${d.location}`);
      lines.push(`- Income: ${d.incomeLevel}`);
      lines.push(`- Education: ${d.education}`);
      lines.push('');
      lines.push('PSYCHOGRAPHICS:');
      const p = persona.psychographics;
      lines.push(`- Values: ${p.values.join(', ')}`);
      lines.push(`- Interests: ${p.interests.join(', ')}`);
      lines.push(`- Lifestyle: ${p.lifestyle}`);
      lines.push(`- Personality: ${p.personalityTraits.join(', ')}`);
      lines.push('');
      lines.push('PAIN POINTS:');
      for (const pp of persona.painPoints) {
        lines.push(`- ${pp.pain} → ${pp.howProductSolvesIt}`);
      }
      lines.push('');
      lines.push('PLATFORM BEHAVIOR:');
      for (const pb of persona.platformBehavior) {
        lines.push(`- ${pb.platform}: ${pb.usagePattern} | ${pb.contentPreferences} | ${pb.bestTimeToReach}`);
      }
      lines.push('');
      lines.push('BUYING MOTIVATIONS:');
      for (const m of persona.buyingMotivations) {
        lines.push(`- ${m}`);
      }
      lines.push('');
      lines.push('OBJECTIONS:');
      for (const o of persona.objections) {
        lines.push(`- ${o}`);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [result]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <a href="#main-content" className="skip-link">{t('common.skipToContent')}</a>
        <main id="main-content" className="mx-auto max-w-5xl px-4 py-16 text-center" tabIndex={-1}>
          <Users className="mx-auto mb-4 h-10 w-10 text-brand-accent" aria-hidden="true" />
          <h1 className="text-2xl font-bold mb-2">{t('audiencePersonaGenerator.title')}</h1>
          <p className="text-sm text-fg-faint mb-6">{t('audiencePersonaGenerator.signInPrompt')}</p>
        </main>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <a href="#main-content" className="skip-link">{t('common.skipToContent')}</a>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 space-y-6" tabIndex={-1}>
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" /> {t('audiencePersonaGenerator.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('audiencePersonaGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="apgProduct" className="block text-sm font-medium mb-1">{t('audiencePersonaGenerator.productOrBrand')}</label>
            <textarea
              id="apgProduct"
              value={productOrBrand}
              onChange={(e) => setProductOrBrand(e.target.value)}
              placeholder={t('audiencePersonaGenerator.productPh')}
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="apgIndustry" className="block text-sm font-medium mb-1">{t('audiencePersonaGenerator.industry')}</label>
              <select
                id="apgIndustry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value as Industry | '')}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              >
                <option value="">{t('audiencePersonaGenerator.industryOptional')}</option>
                {INDUSTRIES.map((ind) => <option key={ind.value} value={ind.value}>{t(ind.labelKey)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="apgMarket" className="block text-sm font-medium mb-1">{t('audiencePersonaGenerator.targetMarket')}</label>
              <input
                id="apgMarket"
                type="text"
                value={targetMarket}
                onChange={(e) => setTargetMarket(e.target.value)}
                placeholder={t('audiencePersonaGenerator.audiencePh')}
                maxLength={500}
                className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                disabled={loading}
              />
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !productOrBrand.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('audiencePersonaGenerator.generating') : `${t('audiencePersonaGenerator.generate')} (${CREDIT_COST} ${t('common.creditsLower')})`}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('audiencePersonaGenerator.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('audiencePersonaGenerator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-fg-muted">
                {result.dryRun ? t('audiencePersonaGenerator.templates') : 'AI-generated'} · {result.personas.length} {t('audiencePersonaGenerator.personas')}
              </span>
              <button
                onClick={copyPersonas}
                className="rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs font-medium hover:bg-hover flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('audiencePersonaGenerator.copied') : t('audiencePersonaGenerator.copy')}
              </button>
            </div>

            {result.personas.map((persona, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-bg-card p-4 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-accent" /> {persona.name}
                  </h2>
                  <p className="text-sm text-fg-muted mt-0.5">{persona.tagline}</p>
                </div>

                {/* Demographics */}
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-2"><MapPin className="w-4 h-4" /> {t('audiencePersonaGenerator.demographics')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-fg-muted">
                    <div><span className="font-medium text-fg">{t('audiencePersonaGenerator.ageRange')}:</span> {persona.demographics.ageRange}</div>
                    <div><span className="font-medium text-fg">{t('audiencePersonaGenerator.gender')}:</span> {persona.demographics.gender}</div>
                    <div><span className="font-medium text-fg">{t('audiencePersonaGenerator.location')}:</span> {persona.demographics.location}</div>
                    <div><span className="font-medium text-fg">{t('audiencePersonaGenerator.incomeLevel')}:</span> {persona.demographics.incomeLevel}</div>
                    <div><span className="font-medium text-fg">{t('audiencePersonaGenerator.education')}:</span> {persona.demographics.education}</div>
                  </div>
                </div>

                {/* Psychographics */}
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-2"><Heart className="w-4 h-4" /> {t('audiencePersonaGenerator.psychographics')}</h3>
                  <div className="space-y-1.5 text-xs text-fg-muted">
                    <div><span className="font-medium text-fg">{t('audiencePersonaGenerator.values')}:</span> {persona.psychographics.values.join(', ')}</div>
                    <div><span className="font-medium text-fg">{t('audiencePersonaGenerator.interests')}:</span> {persona.psychographics.interests.join(', ')}</div>
                    <div><span className="font-medium text-fg">{t('audiencePersonaGenerator.lifestyle')}:</span> {persona.psychographics.lifestyle}</div>
                    <div><span className="font-medium text-fg">{t('audiencePersonaGenerator.personalityTraits')}:</span> {persona.psychographics.personalityTraits.join(', ')}</div>
                  </div>
                </div>

                {/* Pain Points */}
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-2"><Target className="w-4 h-4" /> {t('audiencePersonaGenerator.painPoints')}</h3>
                  <div className="space-y-2">
                    {persona.painPoints.map((pp, i) => (
                      <div key={i} className="border-l-2 border-border pl-3">
                        <div className="text-xs text-fg">{pp.pain}</div>
                        <div className="text-xs text-fg-muted mt-0.5">→ {pp.howProductSolvesIt}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Platform Behavior */}
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-2"><Smartphone className="w-4 h-4" /> {t('audiencePersonaGenerator.platformBehavior')}</h3>
                  <div className="space-y-2">
                    {persona.platformBehavior.map((pb, i) => (
                      <div key={i} className="border-l-2 border-border pl-3">
                        <div className="text-xs font-medium text-fg">{pb.platform}</div>
                        <div className="text-xs text-fg-muted mt-0.5">{pb.usagePattern}</div>
                        <div className="text-xs text-fg-muted">{pb.contentPreferences}</div>
                        <div className="text-xs text-fg-muted"><span className="font-medium">{t('audiencePersonaGenerator.bestTimeToReach')}:</span> {pb.bestTimeToReach}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Buying Motivations */}
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-2"><ShoppingCart className="w-4 h-4" /> {t('audiencePersonaGenerator.buyingMotivations')}</h3>
                  <ul className="list-disc list-inside text-xs text-fg-muted space-y-1">
                    {persona.buyingMotivations.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>

                {/* Objections */}
                <div>
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-2"><MessageCircle className="w-4 h-4" /> {t('audiencePersonaGenerator.objections')}</h3>
                  <ul className="list-disc list-inside text-xs text-fg-muted space-y-1">
                    {persona.objections.map((o, i) => <li key={i}>{o}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
