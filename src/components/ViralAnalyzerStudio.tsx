'use client';

import { useState, useCallback } from 'react';
import { Flame, Loader2, AlertCircle, Sparkles, Gauge, Share2, Anchor, Heart, Activity, TrendingUp, Repeat, Brain, Target } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { ViralAnalysisResult, ViralityGrade, ShareabilityLevel } from '@/lib/creative/viral-analysis';

const CREDIT_COST = 6;

const GRADE_COLORS: Record<ViralityGrade, string> = {
  'A+': 'bg-success/20 text-success border-success/30',
  A: 'bg-success/20 text-success border-success/30',
  B: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  C: 'bg-warning/20 text-warning border-warning/30',
  D: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  F: 'bg-danger/20 text-danger border-danger/30',
};

const LEVEL_COLORS: Record<ShareabilityLevel, string> = {
  very_high: 'bg-success/20 text-success border-success/30',
  high: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  low: 'bg-danger/20 text-danger border-danger/30',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-danger/20 text-danger border-danger/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  low: 'bg-success/20 text-success border-success/30',
};

function scoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 65) return 'text-brand-accent';
  if (score >= 45) return 'text-warning';
  return 'text-danger';
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-success' : value >= 65 ? 'bg-brand-accent' : value >= 45 ? 'bg-warning' : 'bg-danger';
  return (
    <div className="h-2 w-full rounded-full bg-bg-secondary overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function ViralAnalyzerStudio() {
  const { t } = useI18n();
  const [contentUrl, setContentUrl] = useState('');
  const [contentType, setContentType] = useState('video');
  const [platform, setPlatform] = useState('tiktok');
  const [targetAudience, setTargetAudience] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ViralAnalysisResult | null>(null);

  const analyze = useCallback(async () => {
    if (!contentUrl.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/viral-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: contentUrl,
          contentType: contentType || undefined,
          platform: platform || undefined,
          targetAudience: targetAudience || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('viralAnalyzer.error'));
      setResult(data.analysis as ViralAnalysisResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [contentUrl, contentType, platform, targetAudience, t]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Flame className="w-5 h-5" /> {t('viralAnalyzer.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('viralAnalyzer.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="vaContentUrl" className="block text-sm font-medium mb-1">{t('viralAnalyzer.contentUrl')}</label>
          <input id="vaContentUrl" type="url" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder={t('viralAnalyzer.phContentUrl')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="vaContentType" className="block text-sm font-medium mb-1">{t('viralAnalyzer.contentType')}</label>
            <select id="vaContentType" value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
              <option value="video">Video</option>
              <option value="image">Image</option>
              <option value="ad_copy">Ad Copy</option>
            </select>
          </div>
          <div>
            <label htmlFor="vaPlatform" className="block text-sm font-medium mb-1">{t('viralAnalyzer.platform')}</label>
            <select id="vaPlatform" value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading}>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>
          <div>
            <label htmlFor="vaTargetAudience" className="block text-sm font-medium mb-1">{t('viralAnalyzer.targetAudience')}</label>
            <input id="vaTargetAudience" type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder={t('viralAnalyzer.phTargetAudience')} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
          </div>
        </div>

        <button onClick={analyze} disabled={loading || !contentUrl.trim()} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? t('viralAnalyzer.loading') : `${t('viralAnalyzer.analyze')} (${CREDIT_COST} credits)`}
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

      {!loading && !result && !error && (
        <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
          {t('viralAnalyzer.enterUrl')}
        </div>
      )}

      {loading && (
        <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> {t('viralAnalyzer.loading')}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Overall virality score */}
          <div className="rounded-lg border border-border bg-bg-card p-4">
            <h3 className="font-medium flex items-center gap-2 mb-3"><Gauge className="w-4 h-4" /> {t('viralAnalyzer.viralityScore')}</h3>
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${scoreColor(result.overallViralityScore)}`}>{result.overallViralityScore}</div>
              <div className="space-y-1">
                <span className={`inline-block text-sm font-medium px-2 py-0.5 rounded-full border ${GRADE_COLORS[result.viralityGrade]}`}>
                  {t('viralAnalyzer.grade')}: {result.viralityGrade}
                </span>
                <p className="text-xs text-fg-muted">{result.sourceUrl}</p>
              </div>
            </div>
          </div>

          {/* Virality factors table */}
          {result.factors && result.factors.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Target className="w-4 h-4" /> {t('viralAnalyzer.factors')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <caption className="sr-only">{t('viralAnalyzer.factors')}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="text-left py-1">Factor</th>
                      <th scope="col" className="text-left py-1">Score</th>
                      <th scope="col" className="text-left py-1">Description</th>
                      <th scope="col" className="text-left py-1">Evidence</th>
                      <th scope="col" className="text-left py-1">Improvement Tip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.factors.map((f, i) => (
                      <tr key={i} className="border-t border-border align-top">
                        <td className="py-1 font-medium">{f.factor}</td>
                        <td className={`py-1 ${scoreColor(f.score)}`}>{f.score}</td>
                        <td className="py-1">{f.description}</td>
                        <td className="py-1">{f.evidence}</td>
                        <td className="py-1">{f.improvementTip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Shareability analysis */}
          {result.shareability && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Share2 className="w-4 h-4" /> {t('viralAnalyzer.shareability')}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${scoreColor(result.shareability.score)}`}>{result.shareability.score}</span>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${LEVEL_COLORS[result.shareability.shareabilityLevel]}`}>
                    {result.shareability.shareabilityLevel.replace('_', ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(result.shareability.factors).map(([k, v]) => (
                    <div key={k}>
                      <div className="flex justify-between text-xs mb-1"><span className="capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span><span className={scoreColor(v)}>{v}</span></div>
                      <ProgressBar value={v} />
                    </div>
                  ))}
                </div>
                {result.shareability.primaryShareMotivations.length > 0 && (
                  <div><span className="font-medium">Primary Share Motivations:</span> {result.shareability.primaryShareMotivations.join(', ')}</div>
                )}
              </div>
            </div>
          )}

          {/* Hook analysis */}
          {result.hookAnalysis && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Anchor className="w-4 h-4" /> {t('viralAnalyzer.hookAnalysis')}</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Hook Type:</span> {result.hookAnalysis.hookType}</p>
                <p><span className="font-medium">Hook Text:</span> {result.hookAnalysis.hookText}</p>
                <p><span className="font-medium">Hook Strength:</span> <span className={scoreColor(result.hookAnalysis.hookStrength)}>{result.hookAnalysis.hookStrength}</span></p>
                <p><span className="font-medium">Hook Timing:</span> {result.hookAnalysis.hookTiming}</p>
                {result.hookAnalysis.alternativeHooks.length > 0 && (
                  <div>
                    <p className="font-medium">Alternative Hooks:</p>
                    <ul className="list-disc list-inside text-xs text-fg-muted mt-1 space-y-1">
                      {result.hookAnalysis.alternativeHooks.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Emotional journey */}
          {result.emotionalJourney && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Heart className="w-4 h-4" /> {t('viralAnalyzer.emotionalJourney')}</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Primary Emotion:</span> {result.emotionalJourney.primaryEmotion}</p>
                <p><span className="font-medium">Emotional Payoff:</span> {result.emotionalJourney.emotionalPayoff}</p>
                {result.emotionalJourney.emotionalShifts.length > 0 && (
                  <div>
                    <p className="font-medium mb-1">Emotional Shifts:</p>
                    <div className="space-y-1">
                      {result.emotionalJourney.emotionalShifts.map((s, i) => (
                        <div key={i} className="text-xs flex items-center gap-2">
                          <span className="text-fg-muted">{s.timeSec}s</span>
                          <span>{s.emotion}</span>
                          <span className={scoreColor(s.intensity)}>({s.intensity})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pacing analysis */}
          {result.pacingAnalysis && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Activity className="w-4 h-4" /> {t('viralAnalyzer.pacingAnalysis')}</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Optimal Pacing:</span> {result.pacingAnalysis.optimalPacing}</p>
                <p><span className="font-medium">Current Pacing:</span> {result.pacingAnalysis.currentPacing}</p>
                <p><span className="font-medium">Shot Count:</span> {result.pacingAnalysis.shotCount}</p>
                <p><span className="font-medium">Avg Shot Duration:</span> {result.pacingAnalysis.avgShotDuration}s</p>
                {result.pacingAnalysis.energyPeaks.length > 0 && (
                  <p><span className="font-medium">Energy Peaks:</span> {result.pacingAnalysis.energyPeaks.join(', ')}s</p>
                )}
              </div>
            </div>
          )}

          {/* Trend alignment */}
          {result.trendAlignment && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4" /> {t('viralAnalyzer.trendAlignment')}</h3>
              <div className="space-y-2 text-sm">
                {result.trendAlignment.currentTrends.length > 0 && (
                  <p><span className="font-medium">Current Trends:</span> {result.trendAlignment.currentTrends.join(', ')}</p>
                )}
                <p><span className="font-medium">Trend Match Score:</span> <span className={scoreColor(result.trendAlignment.trendMatchScore)}>{result.trendAlignment.trendMatchScore}</span></p>
                <p><span className="font-medium">Trend Longevity Risk:</span> {result.trendAlignment.trendLongevityRisk}</p>
              </div>
            </div>
          )}

          {/* Viral mechanics */}
          {result.viralMechanics && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Repeat className="w-4 h-4" /> {t('viralAnalyzer.viralMechanics')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(result.viralMechanics).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs mb-1"><span className="capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span><span className={scoreColor(v)}>{v}</span></div>
                    <ProgressBar value={v} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audience psychology */}
          {result.audiencePsychology && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Brain className="w-4 h-4" /> {t('viralAnalyzer.audiencePsychology')}</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Primary Desire:</span> {result.audiencePsychology.primaryDesire}</p>
                <p><span className="font-medium">Secondary Desire:</span> {result.audiencePsychology.secondaryDesire}</p>
                {result.audiencePsychology.psychologicalTriggers.length > 0 && (
                  <p><span className="font-medium">Psychological Triggers:</span> {result.audiencePsychology.psychologicalTriggers.join(', ')}</p>
                )}
                {result.audiencePsychology.socialProofElements.length > 0 && (
                  <p><span className="font-medium">Social Proof Elements:</span> {result.audiencePsychology.socialProofElements.join(', ')}</p>
                )}
              </div>
            </div>
          )}

          {/* Improvement recommendations */}
          {result.improvementRecommendations && result.improvementRecommendations.length > 0 && (
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Target className="w-4 h-4" /> {t('viralAnalyzer.improvements')}</h3>
              <div className="space-y-3">
                {result.improvementRecommendations.map((r, i) => (
                  <div key={i} className="border-l-2 border-brand-accent/30 pl-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{r.area}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[r.priority] || PRIORITY_COLORS.medium}`}>{r.priority}</span>
                    </div>
                    <p className="text-xs text-fg-muted"><span className={scoreColor(r.currentScore)}>{r.currentScore}</span> → <span className={scoreColor(r.potentialScore)}>{r.potentialScore}</span></p>
                    <p className="text-xs mt-1">{r.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
