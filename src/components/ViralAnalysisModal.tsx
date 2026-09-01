'use client';

import { useState, useCallback } from 'react';
import { useI18n } from '@/i18n/provider';
import {
  Flame, X, Loader2, AlertCircle, Zap, Heart, Gauge, TrendingUp,
  Repeat, MessageCircle, Share2, Bookmark, Brain, Lightbulb, Sparkles,
} from 'lucide-react';

// ── Types (mirror src/lib/creative/viral-analysis.ts) ──

interface ViralityFactor {
  factor: string;
  score: number;
  description: string;
  evidence: string;
  improvementTip: string;
}

interface ShareabilityAnalysis {
  score: number;
  factors: {
    emotionalResonance: number;
    socialCurrency: number;
    practicalValue: number;
    storytelling: number;
    novelty: number;
    controversy: number;
  };
  shareabilityLevel: 'low' | 'medium' | 'high' | 'very_high';
  primaryShareMotivations: string[];
}

interface ViralAnalysisResult {
  sourceUrl: string;
  overallViralityScore: number;
  viralityGrade: 'F' | 'D' | 'C' | 'B' | 'A' | 'A+';
  factors: ViralityFactor[];
  shareability: ShareabilityAnalysis;
  hookAnalysis: {
    hookType: string;
    hookText: string;
    hookStrength: number;
    hookTiming: string;
    alternativeHooks: string[];
  };
  emotionalJourney: {
    primaryEmotion: string;
    emotionalShifts: Array<{ timeSec: number; emotion: string; intensity: number }>;
    emotionalPayoff: string;
  };
  pacingAnalysis: {
    optimalPacing: string;
    currentPacing: string;
    shotCount: number;
    avgShotDuration: number;
    energyPeaks: number[];
  };
  trendAlignment: {
    currentTrends: string[];
    trendMatchScore: number;
    trendLongevityRisk: string;
  };
  viralMechanics: {
    loopability: number;
    rewatchability: number;
    commentBait: number;
    shareBait: number;
    saveBait: number;
  };
  audiencePsychology: {
    primaryDesire: string;
    secondaryDesire: string;
    psychologicalTriggers: string[];
    socialProofElements: string[];
  };
  improvementRecommendations: Array<{
    area: string;
    currentScore: number;
    potentialScore: number;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  viralVariantSuggestions: Array<{
    variantType: string;
    description: string;
    expectedViralityLift: number;
    changesRequired: string[];
  }>;
}

interface ViralAnalysisModalProps {
  open: boolean;
  onClose: () => void;
}

const COST = 6;

export function ViralAnalysisModal({ open, onClose }: ViralAnalysisModalProps) {
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ViralAnalysisResult | null>(null);

  const analyze = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/viral-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUrl: url, transcript: transcript.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [url, transcript]);

  if (!open) return null;

  const scoreColor = (s: number) => (s >= 80 ? 'text-success' : s >= 60 ? 'text-warning' : 'text-danger');
  const scoreBg = (s: number) => (s >= 80 ? 'bg-success' : s >= 60 ? 'bg-warning' : 'bg-danger');
  const gradeColor = (g: string) =>
    g === 'A+' || g === 'A' ? 'text-success' : g === 'B' ? 'text-warning' : 'text-danger';

  const levelBadge = (lvl: string) => {
    const map: Record<string, string> = {
      very_high: 'bg-success/15 text-success',
      high: 'bg-success/10 text-success',
      medium: 'bg-warning/15 text-warning',
      low: 'bg-danger/15 text-danger',
    };
    return map[lvl] || 'bg-bg-secondary text-fg-muted';
  };

  const priorityBadge = (p: string) => {
    const map: Record<string, string> = {
      high: 'bg-danger/15 text-danger',
      medium: 'bg-warning/15 text-warning',
      low: 'bg-bg-secondary text-fg-muted',
    };
    return map[p] || 'bg-bg-secondary text-fg-muted';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Viral Analysis"
        className="bg-bg-card rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Flame className="w-5 h-5" />
            Viral Analysis
          </h2>
          <button onClick={onClose} aria-label="Close viral analysis" className="text-fg-muted hover:text-fg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-fg-muted">
          Analyze what makes content viral — hooks, pacing, emotional triggers, shareability, and viral mechanics.
        </p>

        {/* Input */}
        <div className="space-y-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('viralAnalysis.phUrl')}
            aria-label="Content URL to analyze"
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={t('viralAnalysis.phTranscript')}
            aria-label="Optional transcript"
            rows={3}
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
          <button
            onClick={analyze}
            disabled={loading || !url.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
            {loading ? 'Analyzing virality…' : 'Analyze Virality'}
          </button>
          <p className="text-xs text-fg-muted">Cost: {COST} credits</p>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Overall Score */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-border p-6">
              <div className="relative h-32 w-32">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="10" className="text-bg-secondary" />
                  <circle
                    cx="60" cy="60" r="52" fill="none" strokeWidth="10" strokeLinecap="round"
                    className={scoreColor(result.overallViralityScore)}
                    strokeDasharray={`${(result.overallViralityScore / 100) * 327} 327`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${scoreColor(result.overallViralityScore)}`}>{result.overallViralityScore}</span>
                  <span className={`text-sm font-semibold ${gradeColor(result.viralityGrade)}`}>Grade {result.viralityGrade}</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-fg-muted">Overall Virality Score</p>
            </div>

            {/* Virality Factors */}
            {result.factors.length > 0 && (
              <Section title="Virality Factors" icon={Zap}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {result.factors.map((f, i) => (
                    <div key={i} className="rounded-lg border border-border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{f.factor.replace(/_/g, ' ')}</span>
                        <span className={`font-bold ${scoreColor(f.score)}`}>{f.score}</span>
                      </div>
                      <p className="mt-1 text-xs text-fg-muted">{f.description}</p>
                      {f.evidence && <p className="mt-1 text-xs italic text-fg-faint">Evidence: {f.evidence}</p>}
                      {f.improvementTip && (
                        <p className="mt-1 text-xs text-brand-accent">Tip: {f.improvementTip}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Shareability */}
            <Section title="Shareability" icon={Share2}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-2xl font-bold ${scoreColor(result.shareability.score)}`}>{result.shareability.score}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${levelBadge(result.shareability.shareabilityLevel)}`}>
                  {result.shareability.shareabilityLevel.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 text-xs">
                {Object.entries(result.shareability.factors).map(([k, v]) => (
                  <div key={k} className="rounded border border-border p-2">
                    <div className="text-fg-muted capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</div>
                    <div className={`text-base font-semibold ${scoreColor(v)}`}>{v}</div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-bg-secondary overflow-hidden">
                      <div className={`h-full ${scoreBg(v)}`} style={{ width: `${v}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {result.shareability.primaryShareMotivations.length > 0 && (
                <div className="mt-2 text-xs">
                  <span className="font-medium">Share motivations:</span>{' '}
                  {result.shareability.primaryShareMotivations.join(', ')}
                </div>
              )}
            </Section>

            {/* Hook Analysis */}
            <Section title="Hook Analysis" icon={Zap}>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Type:</span> {result.hookAnalysis.hookType}</p>
                <p><span className="font-medium">Text:</span> {result.hookAnalysis.hookText}</p>
                <p><span className="font-medium">Strength:</span> <span className={scoreColor(result.hookAnalysis.hookStrength)}>{result.hookAnalysis.hookStrength}</span></p>
                <p><span className="font-medium">Timing:</span> {result.hookAnalysis.hookTiming}</p>
                {result.hookAnalysis.alternativeHooks.length > 0 && (
                  <div>
                    <span className="font-medium">Alternative hooks:</span>
                    <ul className="list-disc list-inside mt-1">{result.hookAnalysis.alternativeHooks.map((h, i) => <li key={i}>{h}</li>)}</ul>
                  </div>
                )}
              </div>
            </Section>

            {/* Emotional Journey */}
            <Section title="Emotional Journey" icon={Heart}>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Primary emotion:</span> {result.emotionalJourney.primaryEmotion}</p>
                <p><span className="font-medium">Emotional payoff:</span> {result.emotionalJourney.emotionalPayoff}</p>
                {result.emotionalJourney.emotionalShifts.length > 0 && (
                  <div className="mt-2">
                    <span className="font-medium">Shifts:</span>
                    <div className="mt-1 space-y-1">
                      {result.emotionalJourney.emotionalShifts.map((e, i) => (
                        <div key={i} className="flex gap-2 text-xs">
                          <span className="text-fg-muted w-12">{e.timeSec}s</span>
                          <span>{e.emotion}</span>
                          <span className="text-fg-muted">({e.intensity})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* Pacing */}
            <Section title="Pacing Analysis" icon={Gauge}>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Optimal pacing:</span> {result.pacingAnalysis.optimalPacing}</p>
                <p><span className="font-medium">Current pacing:</span> {result.pacingAnalysis.currentPacing}</p>
                <p><span className="font-medium">Shot count:</span> {result.pacingAnalysis.shotCount}</p>
                <p><span className="font-medium">Avg shot duration:</span> {result.pacingAnalysis.avgShotDuration}s</p>
                {result.pacingAnalysis.energyPeaks.length > 0 && (
                  <p><span className="font-medium">Energy peaks:</span> {result.pacingAnalysis.energyPeaks.map((p) => `${p}s`).join(', ')}</p>
                )}
              </div>
            </Section>

            {/* Trend Alignment */}
            <Section title="Trend Alignment" icon={TrendingUp}>
              <div className="space-y-1 text-sm">
                {result.trendAlignment.currentTrends.length > 0 && (
                  <p><span className="font-medium">Current trends:</span> {result.trendAlignment.currentTrends.join(', ')}</p>
                )}
                <p><span className="font-medium">Trend match score:</span> <span className={scoreColor(result.trendAlignment.trendMatchScore)}>{result.trendAlignment.trendMatchScore}</span></p>
                <p><span className="font-medium">Longevity risk:</span> {result.trendAlignment.trendLongevityRisk}</p>
              </div>
            </Section>

            {/* Viral Mechanics */}
            <Section title="Viral Mechanics" icon={Repeat}>
              <div className="space-y-2 text-sm">
                <MechanicBar label="Loopability" value={result.viralMechanics.loopability} icon={Repeat} scoreColor={scoreColor} scoreBg={scoreBg} />
                <MechanicBar label="Rewatchability" value={result.viralMechanics.rewatchability} icon={Repeat} scoreColor={scoreColor} scoreBg={scoreBg} />
                <MechanicBar label="Comment Bait" value={result.viralMechanics.commentBait} icon={MessageCircle} scoreColor={scoreColor} scoreBg={scoreBg} />
                <MechanicBar label="Share Bait" value={result.viralMechanics.shareBait} icon={Share2} scoreColor={scoreColor} scoreBg={scoreBg} />
                <MechanicBar label="Save Bait" value={result.viralMechanics.saveBait} icon={Bookmark} scoreColor={scoreColor} scoreBg={scoreBg} />
              </div>
            </Section>

            {/* Audience Psychology */}
            <Section title="Audience Psychology" icon={Brain}>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Primary desire:</span> {result.audiencePsychology.primaryDesire}</p>
                <p><span className="font-medium">Secondary desire:</span> {result.audiencePsychology.secondaryDesire}</p>
                {result.audiencePsychology.psychologicalTriggers.length > 0 && (
                  <p><span className="font-medium">Psychological triggers:</span> {result.audiencePsychology.psychologicalTriggers.join(', ')}</p>
                )}
                {result.audiencePsychology.socialProofElements.length > 0 && (
                  <p><span className="font-medium">Social proof:</span> {result.audiencePsychology.socialProofElements.join(', ')}</p>
                )}
              </div>
            </Section>

            {/* Recommendations */}
            {result.improvementRecommendations.length > 0 && (
              <Section title="Recommendations" icon={Lightbulb}>
                <div className="space-y-2">
                  {result.improvementRecommendations.map((r, i) => (
                    <div key={i} className="rounded-lg border border-border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.area}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadge(r.priority)}`}>{r.priority}</span>
                      </div>
                      <p className="mt-1 text-xs text-fg-muted">{r.recommendation}</p>
                      <p className="mt-1 text-xs">
                        <span className={scoreColor(r.currentScore)}>{r.currentScore}</span>
                        <span className="text-fg-muted"> → </span>
                        <span className={scoreColor(r.potentialScore)}>{r.potentialScore}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Variant Suggestions */}
            {result.viralVariantSuggestions.length > 0 && (
              <Section title="Viral Variant Suggestions" icon={Sparkles}>
                <div className="space-y-2">
                  {result.viralVariantSuggestions.map((v, i) => (
                    <div key={i} className="rounded-lg border border-border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-brand-accent/15 px-1.5 py-0.5 text-xs font-medium text-brand-accent">{v.variantType.replace(/_/g, ' ')}</span>
                        <span className="text-xs font-medium text-success">+{v.expectedViralityLift} lift</span>
                      </div>
                      <p className="mt-1.5 text-fg-muted">{v.description}</p>
                      {v.changesRequired.length > 0 && (
                        <ul className="mt-1 list-disc list-inside text-xs text-fg-faint">
                          {v.changesRequired.map((c, j) => <li key={j}>{c}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold mb-2">
        <Icon className="w-4 h-4 text-brand-accent" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function MechanicBar({
  label, value, icon: Icon, scoreColor, scoreBg,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  scoreColor: (s: number) => string;
  scoreBg: (s: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1"><Icon className="w-3 h-3" /> {label}</span>
        <span className={`font-semibold ${scoreColor(value)}`}>{value}</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-bg-secondary overflow-hidden">
        <div className={`h-full ${scoreBg(value)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
