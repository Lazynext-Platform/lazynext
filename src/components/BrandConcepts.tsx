'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2, AlertCircle, Lightbulb, Target, Award, TrendingUp, Gift, Clapperboard, ArrowRight } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { BrandConceptsResult, AdConcept } from '@/lib/creative/brand-concepts';

export function BrandConcepts() {
  const { t } = useI18n();
  const [sourceContent, setSourceContent] = useState('');
  const [sourceType, setSourceType] = useState('description');
  const [productName, setProductName] = useState('');
  const [targetPlatform, setTargetPlatform] = useState('meta');
  const [conceptCount, setConceptCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BrandConceptsResult | null>(null);
  const [expandedConcept, setExpandedConcept] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!sourceContent.trim()) { setError(t('brandConcepts.contentRequired')); return; }
    setLoading(true); setError(''); setResult(null); setExpandedConcept(null);
    try {
      const res = await fetch('/api/creative/brand-concepts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceContent, sourceType, productName, targetPlatform, conceptCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [sourceContent, sourceType, productName, targetPlatform, conceptCount, t]);

  const scoreColor = (score: number) => score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-danger';

  const triggerColor = (trigger: string) => {
    const colors: Record<string, string> = {
      fear: 'bg-red-500/20 text-red-400',
      aspiration: 'bg-blue-500/20 text-blue-400',
      humor: 'bg-yellow-500/20 text-yellow-400',
      urgency: 'bg-orange-500/20 text-orange-400',
      curiosity: 'bg-purple-500/20 text-purple-400',
      social_proof: 'bg-green-500/20 text-green-400',
      transformation: 'bg-pink-500/20 text-pink-400',
      comparison: 'bg-cyan-500/20 text-cyan-400',
      nostalgia: 'bg-amber-500/20 text-amber-400',
      empowerment: 'bg-indigo-500/20 text-indigo-400',
    };
    return colors[trigger] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="w-5 h-5" /> {t('brandConcepts.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('brandConcepts.subtitle')}</p>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="bc-content" className="block text-sm font-medium mb-1">{t('brandConcepts.sourceContent')}</label>
          <textarea id="bc-content" value={sourceContent} onChange={(e) => setSourceContent(e.target.value)} rows={5} placeholder={t('brandConcepts.contentPlaceholder')} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} aria-label={t('brandConcepts.sourceContent')} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="bc-type" className="block text-sm font-medium mb-1">{t('brandConcepts.sourceType')}</label>
            <select id="bc-type" value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('brandConcepts.sourceType')}>
              <option value="description">{t('brandConcepts.typeDescription')}</option>
              <option value="url">{t('brandConcepts.typeUrl')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="bc-product" className="block text-sm font-medium mb-1">{t('brandConcepts.productName')}</label>
            <input id="bc-product" type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder={t('brandConcepts.productPlaceholder')} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('brandConcepts.productName')} />
          </div>
          <div>
            <label htmlFor="bc-platform" className="block text-sm font-medium mb-1">{t('brandConcepts.platform')}</label>
            <select id="bc-platform" value={targetPlatform} onChange={(e) => setTargetPlatform(e.target.value)} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('brandConcepts.platform')}>
              <option value="meta">Meta</option>
              <option value="google">Google</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>
          <div>
            <label htmlFor="bc-count" className="block text-sm font-medium mb-1">{t('brandConcepts.conceptCount')}</label>
            <select id="bc-count" value={conceptCount} onChange={(e) => setConceptCount(Number(e.target.value))} className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm" disabled={loading} aria-label={t('brandConcepts.conceptCount')}>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div role="alert" className="text-danger text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

      <button onClick={generate} disabled={loading} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2" aria-label={t('brandConcepts.generate')}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? t('brandConcepts.generating') : t('brandConcepts.generate')} <span className="text-xs opacity-75">({t('brandConcepts.credits')}: 10)</span>
      </button>

      {result && (
        <div className="space-y-4" role="status">
          {/* Brand Extraction Summary */}
          <div className="rounded-lg border border-border bg-bg-secondary p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Target className="w-4 h-4" /> {t('brandConcepts.brandExtraction')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-fg-muted">{t('brandConcepts.brandName')}: </span><span className="font-medium">{result.brand.brandName}</span></div>
              <div><span className="text-fg-muted">{t('brandConcepts.category')}: </span><span className="font-medium">{result.brand.category}</span></div>
              <div><span className="text-fg-muted">{t('brandConcepts.targetAudience')}: </span><span className="font-medium">{result.brand.targetAudience}</span></div>
              <div><span className="text-fg-muted">{t('brandConcepts.tone')}: </span><span className="font-medium">{result.brand.tone}</span></div>
            </div>
            {result.brand.valueProps.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-fg-muted mb-1">{t('brandConcepts.valueProps')}</p>
                <div className="flex flex-wrap gap-2">
                  {result.brand.valueProps.map((vp, i) => <span key={i} className="rounded bg-bg-primary px-2 py-0.5 text-xs">{vp}</span>)}
                </div>
              </div>
            )}
            {result.brand.keyDifferentiators.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-fg-muted mb-1">{t('brandConcepts.differentiators')}</p>
                <div className="flex flex-wrap gap-2">
                  {result.brand.keyDifferentiators.map((d, i) => <span key={i} className="rounded bg-bg-primary px-2 py-0.5 text-xs">{d}</span>)}
                </div>
              </div>
            )}
            {/* Cross-feature handoff: brand → creator kits */}
            <div className="mt-3 pt-3 border-t border-border">
              <Link
                href={`/creator-kits?productName=${encodeURIComponent(result.brand.brandName)}&productDescription=${encodeURIComponent(sourceContent.slice(0, 500))}&audience=${encodeURIComponent(result.brand.targetAudience)}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-accent hover:underline"
              >
                <Gift className="w-3.5 h-3.5" /> {t('brandConcepts.sendToCreatorKits')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-center">
              <p className="text-xs text-fg-muted">{t('brandConcepts.conceptsGenerated')}</p>
              <p className="text-xl font-bold">{result.concepts.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-center">
              <p className="text-xs text-fg-muted">{t('brandConcepts.diversityScore')}</p>
              <p className={`text-xl font-bold ${scoreColor(result.diversityScore)}`}>{result.diversityScore}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-secondary p-3 text-center">
              <p className="text-xs text-fg-muted">{t('brandConcepts.recommended')}</p>
              <p className="text-sm font-bold truncate">{result.concepts.find((c) => c.id === result.recommendedConceptId)?.name || '—'}</p>
            </div>
          </div>

          {/* Recommendation */}
          <div className="rounded-lg border border-brand-accent/30 bg-brand-accent/5 p-4">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><Award className="w-4 h-4 text-brand-accent" /> {t('brandConcepts.recommendation')}</h3>
            <p className="text-sm text-fg-muted">{result.recommendationReason}</p>
          </div>

          {/* Concept Cards */}
          {result.concepts.map((concept, i) => (
            <ConceptCard
              key={i}
              concept={concept}
              isRecommended={concept.id === result.recommendedConceptId}
              isExpanded={expandedConcept === concept.id}
              onToggle={() => setExpandedConcept(expandedConcept === concept.id ? null : concept.id)}
              t={t}
              triggerColor={triggerColor}
              scoreColor={scoreColor}
            />
          ))}

          {/* Cross-Concept Insights */}
          {result.crossConceptInsights.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> {t('brandConcepts.crossConceptInsights')}</h3>
              <ul className="space-y-1 text-sm text-fg-muted">{result.crossConceptInsights.map((ins, i) => <li key={i}>• {ins}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConceptCard({
  concept,
  isRecommended,
  isExpanded,
  onToggle,
  t,
  triggerColor,
  scoreColor,
}: {
  concept: AdConcept;
  isRecommended: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
  triggerColor: (trigger: string) => string;
  scoreColor: (score: number) => string;
}) {
  const platformEntries = Object.entries(concept.platformFit);
  const bestPlatform = platformEntries.length > 0
    ? platformEntries.reduce((a, b) => (b[1] > a[1] ? b : a))
    : ['—', 0];

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${isRecommended ? 'border-brand-accent/40 bg-brand-accent/5' : 'border-border bg-bg-secondary'}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{concept.name}</span>
          {isRecommended && <span className="rounded bg-brand-accent/20 text-brand-accent px-2 py-0.5 text-xs font-bold">{t('brandConcepts.bestPick')}</span>}
        </div>
        <div className="flex gap-2 text-xs flex-wrap">
          <span className={`rounded px-2 py-0.5 capitalize ${triggerColor(concept.emotionalTrigger)}`}>{concept.emotionalTrigger.replace(/_/g, ' ')}</span>
          <span className="rounded bg-bg-primary px-2 py-0.5">{concept.estimatedDuration}</span>
          <span className={`rounded bg-bg-primary px-2 py-0.5 font-bold ${scoreColor(bestPlatform[1] as number)}`}>{bestPlatform[0]}: {bestPlatform[1]}</span>
        </div>
      </div>

      <p className="text-sm text-fg-muted">{concept.angle}</p>

      <div className="text-xs text-fg-muted">
        <span className="font-medium">{t('brandConcepts.hook')}: </span>&ldquo;{concept.hook}&rdquo;
      </div>

      <button onClick={onToggle} className="text-xs text-brand-accent hover:underline" aria-label={isExpanded ? t('brandConcepts.collapse') : t('brandConcepts.expand')} aria-expanded={isExpanded}>
        {isExpanded ? t('brandConcepts.collapse') : t('brandConcepts.expand')}
      </button>

      {isExpanded && (
        <div className="space-y-3 pt-2 border-t border-border">
          {/* Script */}
          <div>
            <p className="text-xs font-medium mb-1 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> {t('brandConcepts.script')}</p>
            <p className="text-sm text-fg-muted whitespace-pre-wrap">{concept.script}</p>
          </div>

          {/* Storyboard */}
          <div>
            <p className="text-xs font-medium mb-2">{t('brandConcepts.storyboard')}</p>
            <div className="space-y-2">
              {concept.storyboard.map((frame, j) => (
                <div key={j} className="rounded border border-border bg-bg-primary p-2 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-brand-accent">#{frame.frameNumber}</span>
                    <span className="text-fg-muted">{frame.timestamp}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div><span className="text-fg-muted">{t('brandConcepts.visual')}: </span>{frame.visual}</div>
                    <div><span className="text-fg-muted">{t('brandConcepts.audio')}: </span>{frame.audio}</div>
                    <div><span className="text-fg-muted">{t('brandConcepts.text')}: </span>{frame.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA & Target Emotion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div><span className="text-fg-muted">{t('brandConcepts.cta')}: </span><span className="font-medium">{concept.cta}</span></div>
            <div><span className="text-fg-muted">{t('brandConcepts.targetEmotion')}: </span><span className="font-medium">{concept.targetEmotion}</span></div>
          </div>

          {/* Platform Fit */}
          <div>
            <p className="text-xs font-medium mb-1">{t('brandConcepts.platformFit')}</p>
            <div className="flex flex-wrap gap-2">
              {platformEntries.map(([platform, score]) => (
                <span key={platform} className={`rounded bg-bg-primary px-2 py-0.5 text-xs ${scoreColor(score)}`}>
                  {platform}: {score}
                </span>
              ))}
            </div>
          </div>

          {/* Cross-feature handoff: concept → shot planner */}
          <div className="pt-2 border-t border-border">
            <Link
              href={`/shot-planner?script=${encodeURIComponent(concept.script)}&concept=${encodeURIComponent(concept.name)}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-accent hover:underline"
            >
              <Clapperboard className="w-3.5 h-3.5" /> {t('brandConcepts.sendToShotPlanner')} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
