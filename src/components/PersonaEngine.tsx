'use client';

import { useState, useCallback } from 'react';
import {
  Users, Loader2, AlertCircle, Target, Lightbulb, Sparkles, Megaphone,
  TrendingUp, CheckCircle2, XCircle, MessageSquare, ThumbsUp, Clock,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type {
  PersonaEngineResult,
  Persona,
  PersonaOverlap,
  TargetingRecommendation,
  ChannelAffinity,
  PainPoint,
} from '@/lib/creative/persona-engine';

const ARCHETYPE_LABELS: Record<string, string> = {
  decision_maker: 'Decision Maker',
  influencer: 'Influencer',
  end_user: 'End User',
  gatekeeper: 'Gatekeeper',
  advocate: 'Advocate',
};

const ARCHETYPE_COLORS: Record<string, string> = {
  decision_maker: 'bg-[#00b2fc]/15 text-[#00b2fc]',
  influencer: 'bg-purple-500/15 text-purple-400',
  end_user: 'bg-emerald-500/15 text-emerald-400',
  gatekeeper: 'bg-amber-500/15 text-amber-400',
  advocate: 'bg-pink-500/15 text-pink-400',
};

const INSIGHT_ICONS: Record<string, typeof Target> = {
  audience_insight: Users,
  channel_insight: Megaphone,
  messaging_insight: MessageSquare,
  competitive_insight: TrendingUp,
};

function Bar({ value, max, label, color = 'bg-brand-accent' }: { value: number; max: number; label: string; color?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-fg-muted">
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-muted" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">
        <Icon className="w-3.5 h-3.5" /> {title}
      </h4>
      {children}
    </section>
  );
}

function PersonaCard({ persona }: { persona: Persona }) {
  const d = persona.demographics;
  return (
    <article className="rounded-xl border border-border bg-bg-card p-4 space-y-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold">{persona.name}</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ARCHETYPE_COLORS[persona.archetype] ?? 'bg-bg-muted text-fg-muted'}`}>
            {ARCHETYPE_LABELS[persona.archetype] ?? persona.archetype}
          </span>
        </div>
        <p className="text-sm font-medium text-brand-accent">{persona.tagline}</p>
        <p className="text-sm text-fg-muted">{persona.description}</p>
      </header>

      <Section title="Demographics" icon={Users}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
          <div><dt className="text-fg-muted">Age</dt><dd>{d.ageRange.min}–{d.ageRange.max}</dd></div>
          <div><dt className="text-fg-muted">Gender</dt><dd>{d.gender}</dd></div>
          <div><dt className="text-fg-muted">Income</dt><dd>{d.incomeLevel.replace('_', ' ')}</dd></div>
          <div><dt className="text-fg-muted">Education</dt><dd>{d.education.replace('_', ' ')}</dd></div>
          <div><dt className="text-fg-muted">Location</dt><dd>{d.location}</dd></div>
          {d.occupation && <div><dt className="text-fg-muted">Occupation</dt><dd>{d.occupation}</dd></div>}
          {d.familyStatus && <div><dt className="text-fg-muted">Family</dt><dd>{d.familyStatus.replace('_', ' ')}</dd></div>}
        </dl>
      </Section>

      <Section title="Psychographics" icon={Sparkles}>
        <div className="space-y-1.5 text-xs">
          {persona.psychographics.values.length > 0 && <div><span className="text-fg-muted">Values: </span>{persona.psychographics.values.join(', ')}</div>}
          {persona.psychographics.interests.length > 0 && <div><span className="text-fg-muted">Interests: </span>{persona.psychographics.interests.join(', ')}</div>}
          {persona.psychographics.lifestyle.length > 0 && <div><span className="text-fg-muted">Lifestyle: </span>{persona.psychographics.lifestyle.join(', ')}</div>}
          {persona.psychographics.personalityTraits.length > 0 && <div><span className="text-fg-muted">Personality: </span>{persona.psychographics.personalityTraits.join(', ')}</div>}
          {persona.psychographics.attitudes.length > 0 && <div><span className="text-fg-muted">Attitudes: </span>{persona.psychographics.attitudes.join(', ')}</div>}
        </div>
      </Section>

      {persona.painPoints.length > 0 && (
        <Section title="Pain Points" icon={AlertCircle}>
          <ul className="space-y-2">
            {persona.painPoints.map((pp: PainPoint) => (
              <li key={pp.painId} className="rounded-lg border border-border bg-bg-muted/40 p-2 text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium capitalize">{pp.category}</span>
                  <span className="text-fg-muted capitalize">{pp.frequency}</span>
                </div>
                <p>{pp.description}</p>
                <Bar value={pp.severity} max={10} label="Severity" color="bg-danger" />
                {pp.currentSolution && <p className="text-fg-muted">Current solution: {pp.currentSolution}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {persona.channelAffinities.length > 0 && (
        <Section title="Channel Affinities" icon={Megaphone}>
          <ul className="space-y-2">
            {persona.channelAffinities.map((ca: ChannelAffinity) => (
              <li key={ca.channel} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{ca.channel}</span>
                  <span className="flex items-center gap-1 text-fg-muted"><Clock className="w-3 h-3" /> {Math.round(ca.avgSessionDuration / 60)}m</span>
                </div>
                <Bar value={ca.affinity} max={100} label="Affinity" />
                <div className="text-fg-muted">Content: {ca.preferredContent.join(', ')} · Best: {ca.bestTimeToReach}</div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Buying Behavior" icon={Target}>
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div><span className="text-fg-muted">Motivation: </span>{persona.buyingBehavior.motivation.replace('_', ' ')}</div>
            <div><span className="text-fg-muted">Research: </span>{persona.buyingBehavior.researchDepth}</div>
            <div><span className="text-fg-muted">Decision speed: </span>{persona.buyingBehavior.decisionSpeed}</div>
          </div>
          <Bar value={persona.buyingBehavior.priceSensitivity} max={10} label="Price sensitivity" color="bg-amber-500" />
          <Bar value={persona.buyingBehavior.brandLoyalty} max={10} label="Brand loyalty" color="bg-emerald-500" />
          <Bar value={persona.buyingBehavior.reviewReliance} max={10} label="Review reliance" color="bg-purple-500" />
          <Bar value={persona.buyingBehavior.socialProofReliance} max={10} label="Social proof reliance" color="bg-pink-500" />
        </div>
      </Section>

      {persona.keyMessages.length > 0 && (
        <Section title="Key Messages" icon={MessageSquare}>
          <ul className="list-disc space-y-1 pl-4 text-xs">
            {persona.keyMessages.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </Section>
      )}

      {(persona.preferredTone.length > 0 || persona.preferredFormats.length > 0) && (
        <Section title="Tone & Formats" icon={Sparkles}>
          <div className="text-xs space-y-1">
            {persona.preferredTone.length > 0 && <div><span className="text-fg-muted">Tone: </span>{persona.preferredTone.join(', ')}</div>}
            {persona.preferredFormats.length > 0 && <div><span className="text-fg-muted">Formats: </span>{persona.preferredFormats.join(', ')}</div>}
          </div>
        </Section>
      )}

      {persona.objections.length > 0 && (
        <Section title="Objections & Rebuttals" icon={XCircle}>
          <ul className="space-y-2">
            {persona.objections.map((o, i) => (
              <li key={i} className="text-xs space-y-1">
                <p className="text-danger">“{o.objection}”</p>
                <p className="flex items-start gap-1 text-success"><ThumbsUp className="w-3 h-3 mt-0.5 shrink-0" /> {o.rebuttal}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {persona.successStories.length > 0 && (
        <Section title="Success Stories" icon={CheckCircle2}>
          <ul className="list-disc space-y-1 pl-4 text-xs">
            {persona.successStories.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </Section>
      )}
    </article>
  );
}

function OverlapCard({ overlap, names }: { overlap: PersonaOverlap; names: Record<string, string> }) {
  return (
    <div className="rounded-lg border border-border bg-bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{names[overlap.personaA] ?? overlap.personaA} ↔ {names[overlap.personaB] ?? overlap.personaB}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${overlap.overlapScore >= 70 ? 'bg-emerald-500/15 text-emerald-400' : overlap.overlapScore >= 40 ? 'bg-amber-500/15 text-amber-400' : 'bg-bg-muted text-fg-muted'}`}>
          {overlap.overlapScore}%
        </span>
      </div>
      <Bar value={overlap.overlapScore} max={100} label="Overlap" />
      <div className="text-xs text-fg-muted space-y-0.5">
        {overlap.sharedChannels.length > 0 && <div>Shared channels: {overlap.sharedChannels.join(', ')}</div>}
        {overlap.sharedInterests.length > 0 && <div>Shared interests: {overlap.sharedInterests.join(', ')}</div>}
        {overlap.sharedPainPoints.length > 0 && <div>Shared pain points: {overlap.sharedPainPoints.length}</div>}
      </div>
      <p className="text-xs">{overlap.recommendation}</p>
    </div>
  );
}

function TargetingCard({ rec }: { rec: TargetingRecommendation }) {
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${rec.recommended ? 'border-brand-accent/40 bg-brand-accent/5' : 'border-border bg-bg-card'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium capitalize">{rec.platform}</span>
        {rec.recommended && <span className="rounded-full bg-brand-accent/15 px-2 py-0.5 text-xs font-medium text-brand-accent">Recommended</span>}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div><span className="text-fg-muted">Audience: </span>{rec.audienceSize.toLocaleString()}</div>
        <div><span className="text-fg-muted">Est. CPM: </span>${rec.estimatedCpm.toFixed(2)}</div>
      </div>
      <Bar value={rec.lookalikePotential} max={100} label="Lookalike potential" color="bg-emerald-500" />
      {rec.targetingCriteria.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-4 text-xs text-fg-muted">
          {rec.targetingCriteria.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      )}
      {rec.bestAdFormats.length > 0 && <div className="text-xs"><span className="text-fg-muted">Best formats: </span>{rec.bestAdFormats.join(', ')}</div>}
      <p className="text-xs text-fg-muted">{rec.reasoning}</p>
    </div>
  );
}

export function PersonaEngine() {
  const { t } = useI18n();
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [market, setMarket] = useState('');
  const [numberOfPersonas, setNumberOfPersonas] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PersonaEngineResult | null>(null);

  const generate = useCallback(async () => {
    if (!productName.trim()) {
      setError(t('personas.productNameRequired'));
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: productName.trim(),
          productDescription: productDescription.trim() || undefined,
          market: market.trim() || undefined,
          numberOfPersonas,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [productName, productDescription, market, numberOfPersonas, t]);

  const personaNames: Record<string, string> = {};
  if (result) for (const p of result.personas) personaNames[p.personaId] = p.name;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="w-5 h-5" /> {t('personas.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('personas.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="persona-product" className="block text-sm font-medium mb-1">{t('personas.productName')}</label>
          <input
            id="persona-product"
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g., Acme Protein Powder"
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
            aria-required="true"
          />
        </div>

        <div>
          <label htmlFor="persona-desc" className="block text-sm font-medium mb-1">{t('personas.productDescription')}</label>
          <textarea
            id="persona-desc"
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="Describe the product, key benefits, and positioning…"
            rows={3}
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="persona-market" className="block text-sm font-medium mb-1">{t('personas.market')}</label>
            <input
              id="persona-market"
              type="text"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              placeholder="e.g., DTC fitness supplements"
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="persona-count" className="block text-sm font-medium mb-1">{t('personas.numberOfPersonas')}</label>
            <select
              id="persona-count"
              value={numberOfPersonas}
              onChange={(e) => setNumberOfPersonas(Number(e.target.value))}
              disabled={loading}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
          {loading ? t('personas.generating') : `${t('personas.generate')} (6 ${t('personas.credits')})`}
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {loading && !result && (
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-fg-muted">
          <Loader2 className="w-5 h-5 animate-spin" /> {t('personas.generating')}
        </div>
      )}

      {!loading && !result && !error && (
        <div className="rounded-lg border border-dashed border-border bg-bg-card/50 px-4 py-12 text-center text-sm text-fg-muted">
          {t('personas.emptyState')}
        </div>
      )}

      {result && (
        <div className="space-y-8">
          {/* Persona Cards */}
          <section aria-labelledby="personas-heading">
            <h3 id="personas-heading" className="text-base font-semibold mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> {t('personas.personas')}</h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {result.personas.map((p) => <PersonaCard key={p.personaId} persona={p} />)}
            </div>
          </section>

          {/* Overlaps */}
          {result.overlaps.length > 0 && (
            <section aria-labelledby="overlaps-heading">
              <h3 id="overlaps-heading" className="text-base font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> {t('personas.overlaps')}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {result.overlaps.map((o, i) => <OverlapCard key={i} overlap={o} names={personaNames} />)}
              </div>
            </section>
          )}

          {/* Targeting Recommendations */}
          {result.targetingRecommendations.length > 0 && (
            <section aria-labelledby="targeting-heading">
              <h3 id="targeting-heading" className="text-base font-semibold mb-3 flex items-center gap-2"><Target className="w-4 h-4" /> {t('personas.targeting')}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {result.targetingRecommendations.map((r, i) => <TargetingCard key={i} rec={r} />)}
              </div>
            </section>
          )}

          {/* Insights */}
          {result.insights.length > 0 && (
            <section aria-labelledby="insights-heading">
              <h3 id="insights-heading" className="text-base font-semibold mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4" /> {t('personas.insights')}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {result.insights.map((ins) => {
                  const Icon = INSIGHT_ICONS[ins.type] ?? Lightbulb;
                  return (
                    <div key={ins.insightId} className="rounded-lg border border-border bg-bg-card p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-brand-accent" />
                        <span className="text-sm font-medium">{ins.title}</span>
                        <span className="ml-auto rounded-full bg-bg-muted px-2 py-0.5 text-[10px] uppercase text-fg-muted">{ins.type.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs text-fg-muted">{ins.description}</p>
                      <p className="text-xs"><span className="font-medium">Recommendation: </span>{ins.actionableRecommendation}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Creative Adaptations */}
          {result.creativeAdaptations.length > 0 && (
            <section aria-labelledby="adaptations-heading">
              <h3 id="adaptations-heading" className="text-base font-semibold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4" /> {t('personas.creativeAdaptations')}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {result.creativeAdaptations.map((a, i) => (
                  <div key={i} className="rounded-lg border border-border bg-bg-card p-3 space-y-1.5 text-xs">
                    <div className="text-sm font-medium">{a.personaName}</div>
                    <div><span className="text-fg-muted">Hook: </span>{a.hookStyle}</div>
                    <div><span className="text-fg-muted">Tone: </span>{a.toneStyle}</div>
                    <div><span className="text-fg-muted">CTA: </span>{a.ctaStyle}</div>
                    <div><span className="text-fg-muted">Format: </span>{a.formatRecommendation}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
