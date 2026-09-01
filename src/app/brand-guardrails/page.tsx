'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Shield, Loader2, AlertCircle, Sparkles, Gauge, CheckCircle2, AlertTriangle, Info, Target } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type { BrandGuardrailsResult, BrandGuardrailsGrade, ViolationSeverity } from '@/lib/creative/brand-guardrails';

const CREDIT_COST = 4;

const GRADE_COLORS: Record<BrandGuardrailsGrade, string> = {
  'A+': 'bg-success/20 text-success border-success/30',
  A: 'bg-success/20 text-success border-success/30',
  B: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
  C: 'bg-warning/20 text-warning border-warning/30',
  D: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  F: 'bg-danger/20 text-danger border-danger/30',
};

const SEVERITY_COLORS: Record<ViolationSeverity, string> = {
  critical: 'bg-danger/20 text-danger border-danger/30',
  warning: 'bg-warning/20 text-warning border-warning/30',
  info: 'bg-brand-accent/20 text-brand-accent border-brand-accent/30',
};

const SEVERITY_ICONS: Record<ViolationSeverity, typeof AlertCircle> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
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

export default function BrandGuardrailsPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [brandName, setBrandName] = useState('');
  const [tone, setTone] = useState('');
  const [keywords, setKeywords] = useState('');
  const [forbiddenWords, setForbiddenWords] = useState('');
  const [colors, setColors] = useState('');
  const [fonts, setFonts] = useState('');
  const [brief, setBrief] = useState('');
  const [script, setScript] = useState('');
  const [storyboard, setStoryboard] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BrandGuardrailsResult | null>(null);

  const check = useCallback(async () => {
    if (!brief.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const brandKit = {
        brandName: brandName.trim() || undefined,
        tone: tone.trim() ? tone.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        keywords: keywords.trim() ? keywords.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        forbiddenWords: forbiddenWords.trim() ? forbiddenWords.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        colors: colors.trim() ? colors.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        fonts: fonts.trim() ? fonts.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      };
      const res = await fetch('/api/creative/brand-guardrails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          script: script.trim() || undefined,
          storyboard: storyboard.trim() || undefined,
          brandKit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('brandGuardrails.error'));
      setResult(data.result as BrandGuardrailsResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [brandName, tone, keywords, forbiddenWords, colors, fonts, brief, script, storyboard, t]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6" /> {t('brandGuardrails.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('brandGuardrails.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6" /> {t('brandGuardrails.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('brandGuardrails.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{t('brandGuardrails.brandKit')}</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="bgBrandName" className="block text-sm font-medium mb-1">{t('brandGuardrails.brandName')}</label>
                <input id="bgBrandName" type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g., Acme" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
              </div>
              <div>
                <label htmlFor="bgTone" className="block text-sm font-medium mb-1">{t('brandGuardrails.tone')}</label>
                <input id="bgTone" type="text" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g., playful, professional" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
              </div>
              <div>
                <label htmlFor="bgKeywords" className="block text-sm font-medium mb-1">Keywords (comma-separated)</label>
                <input id="bgKeywords" type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g., quality, affordable" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
              </div>
              <div>
                <label htmlFor="bgForbidden" className="block text-sm font-medium mb-1">Forbidden Words (comma-separated)</label>
                <input id="bgForbidden" type="text" value={forbiddenWords} onChange={(e) => setForbiddenWords(e.target.value)} placeholder="e.g., cheap, scam" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
              </div>
              <div>
                <label htmlFor="bgColors" className="block text-sm font-medium mb-1">Colors (comma-separated)</label>
                <input id="bgColors" type="text" value={colors} onChange={(e) => setColors(e.target.value)} placeholder="e.g., #FF0000, #00B2FC" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
              </div>
              <div>
                <label htmlFor="bgFonts" className="block text-sm font-medium mb-1">Fonts (comma-separated)</label>
                <input id="bgFonts" type="text" value={fonts} onChange={(e) => setFonts(e.target.value)} placeholder="e.g., Inter, Roboto" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold">{t('brandGuardrails.creative')}</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="bgBrief" className="block text-sm font-medium mb-1">{t('brandGuardrails.brief')}</label>
                <textarea id="bgBrief" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Paste the creative brief..." rows={4} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y" disabled={loading} />
              </div>
              <div>
                <label htmlFor="bgScript" className="block text-sm font-medium mb-1">{t('brandGuardrails.script')}</label>
                <textarea id="bgScript" value={script} onChange={(e) => setScript(e.target.value)} placeholder="Paste the script (optional)..." rows={4} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y" disabled={loading} />
              </div>
              <div>
                <label htmlFor="bgStoryboard" className="block text-sm font-medium mb-1">{t('brandGuardrails.storyboard')}</label>
                <textarea id="bgStoryboard" value={storyboard} onChange={(e) => setStoryboard(e.target.value)} placeholder="Paste the storyboard (optional)..." rows={4} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y" disabled={loading} />
              </div>
            </div>
          </div>

          <button onClick={check} disabled={loading || !brief.trim()} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('brandGuardrails.checking') : `${t('brandGuardrails.check')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('brandGuardrails.subtitle')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('brandGuardrails.checking')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3"><Gauge className="w-4 h-4" /> {t('brandGuardrails.score')}</h3>
              <div className="flex items-center gap-4">
                <div className={`text-4xl font-bold ${scoreColor(result.score)}`}>{result.score}</div>
                <div className="space-y-1">
                  <span className={`inline-block text-sm font-medium px-2 py-0.5 rounded-full border ${GRADE_COLORS[result.grade]}`}>
                    {t('brandGuardrails.grade')}: {result.grade}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex justify-between text-xs mb-1"><span>{t('brandGuardrails.voice')}</span><span className={scoreColor(result.voiceConsistency)}>{result.voiceConsistency}</span></div>
                  <ProgressBar value={result.voiceConsistency} />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span>{t('brandGuardrails.visual')}</span><span className={scoreColor(result.visualConsistency)}>{result.visualConsistency}</span></div>
                  <ProgressBar value={result.visualConsistency} />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span>{t('brandGuardrails.messaging')}</span><span className={scoreColor(result.messagingConsistency)}>{result.messagingConsistency}</span></div>
                  <ProgressBar value={result.messagingConsistency} />
                </div>
              </div>
            </div>

            {result.violations && result.violations.length > 0 ? (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h3 className="font-medium flex items-center gap-2 mb-3"><AlertCircle className="w-4 h-4" /> {t('brandGuardrails.violations')}</h3>
                <div className="space-y-3">
                  {result.violations.map((v, i) => {
                    const Icon = SEVERITY_ICONS[v.severity] || AlertCircle;
                    return (
                      <div key={i} className="border-l-2 border-border pl-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-medium">{v.message}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[v.severity]}`}>{t(`brandGuardrails.${v.severity}`)}</span>
                        </div>
                        <p className="text-xs text-fg-muted">{v.detail}</p>
                        <p className="text-xs mt-1"><span className="font-medium">Fix:</span> {v.recommendation}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h3 className="font-medium flex items-center gap-2 mb-3"><CheckCircle2 className="w-4 h-4" /> {t('brandGuardrails.violations')}</h3>
                <p className="text-sm text-fg-muted">{t('brandGuardrails.noViolations')}</p>
              </div>
            )}

            {result.recommendations && result.recommendations.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <h3 className="font-medium flex items-center gap-2 mb-3"><Target className="w-4 h-4" /> {t('brandGuardrails.recommendations')}</h3>
                <ul className="list-disc list-inside text-sm text-fg-muted space-y-1">
                  {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
