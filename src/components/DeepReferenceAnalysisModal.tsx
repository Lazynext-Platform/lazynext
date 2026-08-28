'use client';

import { useState, useCallback } from 'react';
import { Video, X, Loader2, AlertCircle, Film, Zap, Heart, Brain, Sparkles, TrendingUp } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface SceneBreakdown {
  sceneNumber: number;
  timeRange: { startSec: number; endSec: number };
  shotType: string;
  description: string;
  emotionScore: number;
  engagementScore: number;
  visualElements: string[];
  audioElements: string[];
  textElements: string[];
}

interface HookAnalysis {
  hookType: string;
  hookText: string;
  hookTiming: { startSec: number; endSec: number };
  effectivenessScore: number;
  psychologicalTrigger: string;
  audienceAttentionFactor: string;
  variantSuggestions: string[];
}

interface PacingAnalysis {
  overallPace: string;
  averageShotDuration: number;
  shotCount: number;
  paceChanges: Array<{ timeSec: number; change: string }>;
  energyCurve: Array<{ timeSec: number; energy: number }>;
  recommendedPace: string;
}

interface DeepReferenceAnalysis {
  basicAnalysis: Record<string, unknown>;
  scenes: SceneBreakdown[];
  hookAnalysis: HookAnalysis;
  pacing: PacingAnalysis;
  emotionalArc: Array<{ timeSec: number; emotion: string; intensity: number }>;
  persuasionTimeline: Array<{ timeSec: number; technique: string; description: string }>;
  remixBrief: {
    preservedElements: string[];
    adaptedElements: string[];
    newElements: string[];
    recommendedStructure: string;
    differentiationStrategy: string;
  };
  performancePrediction: {
    hookStrength: number;
    storyFlow: number;
    ctaClarity: number;
    brandAlignment: number;
    overallScore: number;
  };
}

interface DeepReferenceAnalysisModalProps {
  open: boolean;
  onClose: () => void;
}

export function DeepReferenceAnalysisModal({ open, onClose }: DeepReferenceAnalysisModalProps) {
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DeepReferenceAnalysis | null>(null);
  const [section, setSection] = useState<'scenes' | 'hook' | 'pacing' | 'emotionalArc' | 'persuasion' | 'remixBrief' | 'performance'>('scenes');

  const analyze = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/reference-analysis/deep', {
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

  const scoreColor = (s: number) => s >= 80 ? 'text-success' : s >= 60 ? 'text-warning' : 'text-danger';

  const sections: Array<{ key: typeof section; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'scenes', label: t('deepAnalysis.scenes'), icon: Film },
    { key: 'hook', label: t('deepAnalysis.hook'), icon: Zap },
    { key: 'pacing', label: t('deepAnalysis.pacing'), icon: TrendingUp },
    { key: 'emotionalArc', label: t('deepAnalysis.emotionalArc'), icon: Heart },
    { key: 'persuasion', label: t('deepAnalysis.persuasion'), icon: Brain },
    { key: 'remixBrief', label: t('deepAnalysis.remixBrief'), icon: Sparkles },
    { key: 'performance', label: t('deepAnalysis.performance'), icon: TrendingUp },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('deepAnalysis.title')}
        className="bg-bg-card rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Video className="w-5 h-5" />
            {t('deepAnalysis.title')}
          </h2>
          <button onClick={onClose} aria-label={t('deepAnalysis.close')} className="text-fg-muted hover:text-fg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-fg-muted">{t('deepAnalysis.subtitle')}</p>

        <div className="space-y-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('deepAnalysis.urlPlaceholder')}
            aria-label={t('deepAnalysis.urlLabel')}
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={t('deepAnalysis.transcriptPlaceholder')}
            aria-label={t('deepAnalysis.transcriptLabel')}
            rows={3}
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
          <button
            onClick={analyze}
            disabled={loading || !url.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
            {loading ? t('deepAnalysis.analyzing') : t('deepAnalysis.analyze')}
          </button>
          <p className="text-xs text-fg-muted">{t('deepAnalysis.credits')}: 8</p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1 border-b border-border pb-2">
              {sections.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSection(s.key)}
                  className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${section === s.key ? 'bg-brand-accent text-white' : 'bg-bg-secondary hover:bg-bg-tertiary'}`}
                >
                  <s.icon className="w-3 h-3" />
                  {s.label}
                </button>
              ))}
            </div>

            {section === 'scenes' && (
              <div className="space-y-2">
                {result.scenes.map((s, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{t('deepAnalysis.scene')} {s.sceneNumber}</span>
                      <span className="text-xs text-fg-muted">{s.timeRange.startSec}s - {s.timeRange.endSec}s</span>
                    </div>
                    <p className="text-fg-muted mt-1">{s.description}</p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span>{t('deepAnalysis.emotionScore')}: <span className={scoreColor(s.emotionScore)}>{s.emotionScore}</span></span>
                      <span>{t('deepAnalysis.engagementScore')}: <span className={scoreColor(s.engagementScore)}>{s.engagementScore}</span></span>
                    </div>
                    {s.visualElements.length > 0 && <p className="text-xs mt-1">Visual: {s.visualElements.join(', ')}</p>}
                  </div>
                ))}
              </div>
            )}

            {section === 'hook' && (
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">{t('deepAnalysis.hookType')}:</span> {result.hookAnalysis.hookType}</p>
                <p><span className="font-medium">{t('deepAnalysis.hookText')}:</span> {result.hookAnalysis.hookText}</p>
                <p><span className="font-medium">{t('deepAnalysis.effectivenessScore')}:</span> <span className={scoreColor(result.hookAnalysis.effectivenessScore)}>{result.hookAnalysis.effectivenessScore}</span></p>
                <p><span className="font-medium">{t('deepAnalysis.psychologicalTrigger')}:</span> {result.hookAnalysis.psychologicalTrigger}</p>
                {result.hookAnalysis.variantSuggestions.length > 0 && (
                  <div><span className="font-medium">{t('deepAnalysis.variantSuggestions')}:</span>
                    <ul className="list-disc list-inside">{result.hookAnalysis.variantSuggestions.map((v, i) => <li key={i}>{v}</li>)}</ul>
                  </div>
                )}
              </div>
            )}

            {section === 'pacing' && (
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">{t('deepAnalysis.overallPace')}:</span> {result.pacing.overallPace}</p>
                <p><span className="font-medium">{t('deepAnalysis.shotCount')}:</span> {result.pacing.shotCount}</p>
                <p><span className="font-medium">{t('deepAnalysis.averageShotDuration')}:</span> {result.pacing.averageShotDuration}s</p>
                <p><span className="font-medium">{t('deepAnalysis.recommendedPace')}:</span> {result.pacing.recommendedPace}</p>
              </div>
            )}

            {section === 'emotionalArc' && (
              <div className="space-y-1 text-sm">
                {result.emotionalArc.map((e, i) => (
                  <div key={i} className="flex gap-2"><span className="text-fg-muted w-12">{e.timeSec}s</span><span>{e.emotion}</span><span className="text-fg-muted">({e.intensity})</span></div>
                ))}
              </div>
            )}

            {section === 'persuasion' && (
              <div className="space-y-1 text-sm">
                {result.persuasionTimeline.map((p, i) => (
                  <div key={i} className="flex gap-2"><span className="text-fg-muted w-12">{p.timeSec}s</span><span className="font-medium">{p.technique}</span><span className="text-fg-muted">— {p.description}</span></div>
                ))}
              </div>
            )}

            {section === 'remixBrief' && (
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">{t('deepAnalysis.preservedElements')}:</span><ul className="list-disc list-inside">{result.remixBrief.preservedElements.map((e, i) => <li key={i}>{e}</li>)}</ul></div>
                <div><span className="font-medium">{t('deepAnalysis.adaptedElements')}:</span><ul className="list-disc list-inside">{result.remixBrief.adaptedElements.map((e, i) => <li key={i}>{e}</li>)}</ul></div>
                <div><span className="font-medium">{t('deepAnalysis.newElements')}:</span><ul className="list-disc list-inside">{result.remixBrief.newElements.map((e, i) => <li key={i}>{e}</li>)}</ul></div>
                <p><span className="font-medium">{t('deepAnalysis.recommendedStructure')}:</span> {result.remixBrief.recommendedStructure}</p>
                <p><span className="font-medium">{t('deepAnalysis.differentiationStrategy')}:</span> {result.remixBrief.differentiationStrategy}</p>
              </div>
            )}

            {section === 'performance' && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <ScoreCard label={t('deepAnalysis.hookStrength')} value={result.performancePrediction.hookStrength} color={scoreColor} />
                <ScoreCard label={t('deepAnalysis.storyFlow')} value={result.performancePrediction.storyFlow} color={scoreColor} />
                <ScoreCard label={t('deepAnalysis.ctaClarity')} value={result.performancePrediction.ctaClarity} color={scoreColor} />
                <ScoreCard label={t('deepAnalysis.brandAlignment')} value={result.performancePrediction.brandAlignment} color={scoreColor} />
                <div className="col-span-2"><ScoreCard label={t('deepAnalysis.overallScore')} value={result.performancePrediction.overallScore} color={scoreColor} /></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreCard({ label, value, color }: { label: string; value: number; color: (s: number) => string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-lg font-semibold ${color(value)}`}>{value}</div>
    </div>
  );
}
